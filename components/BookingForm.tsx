'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { findNextAvailableDate, getSlotStates, type BusyInterval } from '@/lib/availability';
import { buildBookingEvent, googleCalendarUrl } from '@/lib/calendar';
import { ANY_BARBER_ID, BARBERS, SERVICES, SHOP, SLOT_STEP_MIN, WEEK_ORDER, formatPrice } from '@/lib/data';
import { INTL_LOCALES } from '@/lib/i18n/config';
import { LOCALE_SWITCH_EVENT, clearBookingDraft, peekBookingDraft, saveBookingDraft } from '@/lib/i18n/locale-switch';
import {
  barberText,
  formatDate,
  formatDuration,
  formatQuoteSummary,
  formatServiceCount,
  formatSlotLabel,
  interpolate,
  serviceText,
  translateFieldError,
} from '@/lib/i18n/text';
import { quoteServices, type Quote, type ServiceLine } from '@/lib/pricing';
import {
  FIELD_ORDER,
  HONEYPOT_FIELD,
  LIMITS,
  addDays,
  getBookingWindow,
  isValidDate,
  maskPhone,
  validateBooking,
  type BookingFields,
  type FieldErrors,
  type FieldName,
} from '@/lib/validation';

import DatePicker from './DatePicker';
import { useI18n } from './I18nProvider';
import { CalendarIcon } from './icons';
import MessengerBooking from './MessengerBooking';
import Select from './Select';

type ConfirmedBooking = {
  name: string;
  phone: string;
  services: ServiceLine[];
  totalPriceThb: number;
  totalDurationMin: number;
  barberId: string;
  barberName: string;
  date: string;
  time: string;
  comment: string | null;
};

type ApiResponse =
  | { ok: true; booking?: ConfirmedBooking }
  | { ok: false; code?: string; error?: string; fieldErrors?: FieldErrors };

type AvailabilityResponse = { ok: true; until: string; busy: BusyInterval[] } | { ok: false };

type Availability =
  | { status: 'idle' }
  | { status: 'loading'; date: string }
  | { status: 'ready'; date: string; until: string; busy: BusyInterval[] }
  | { status: 'error'; date: string };

type Slot = { date: string; time: string };

type NextSlotResponse = { ok: true; today: string; slot: Slot | null } | { ok: false };

/** Nearest free slot from the server. `today` is the Bangkok date on the server clock. */
type Suggestion = { loading: boolean; failed: boolean; today: string | null; slot: Slot | null };

/**
 * What the language switcher carries over to the other locale. Loaded slots and the
 * nearest-slot suggestion come along too, so the new page doesn't show loading states.
 */
type LocaleSwitchDraft = {
  values: BookingFields;
  errors: FieldErrors;
  submitted: boolean;
  manualSchedule: boolean;
  suggestion: { today: string | null; slot: Slot | null } | null;
  availability: { date: string; until: string; busy: BusyInterval[] } | null;
};

const EMPTY: BookingFields = {
  name: '',
  phone: '',
  services: [],
  barber: ANY_BARBER_ID,
  date: '',
  time: '',
  comment: '',
};

// Load a couple of weeks at once so a fully booked day can suggest the next free date instantly.
const LOOKAHEAD_DAYS = 14;
const AVAILABILITY_DEBOUNCE_MS = 250;
const SUGGESTION_DEBOUNCE_MS = 300;
// If a suggested time turns out to be taken on the client, ask the server again at most this often.
const MAX_SUGGESTION_RETRIES = 2;

function withoutScheduleErrors(errors: FieldErrors): FieldErrors {
  const next = { ...errors };
  delete next.date;
  delete next.time;
  return next;
}

export default function BookingForm() {
  const { locale, dict } = useI18n();
  const t = dict.booking;
  const f = t.form;

  // Right after a language switch, start from the previous page's state on the very first
  // render, so the form doesn't flash empty or loading. A draft only exists after a
  // client-side switch, never on a server-rendered first load, so hydration is unaffected.
  const [restored] = useState(() => (typeof window === 'undefined' ? null : peekBookingDraft<LocaleSwitchDraft>()));

  const [values, setValues] = useState<BookingFields>(() => (restored ? { ...EMPTY, ...restored.values } : EMPTY));
  const [errors, setErrors] = useState<FieldErrors>(() => restored?.errors ?? {});
  const [submitted, setSubmitted] = useState(() => restored?.submitted ?? false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formError, setFormError] = useState('');
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);
  const [honeypot, setHoneypot] = useState('');
  // Date bounds depend on "now", so compute them after mount to avoid hydration mismatch.
  const [dateBounds, setDateBounds] = useState<{ min: string; max: string } | null>(null);
  const [availability, setAvailability] = useState<Availability>(() =>
    restored?.availability ? { status: 'ready', ...restored.availability } : { status: 'idle' },
  );
  const [suggestion, setSuggestion] = useState<Suggestion>(() =>
    restored?.suggestion
      ? { loading: false, failed: false, ...restored.suggestion }
      : { loading: true, failed: false, today: null, slot: null },
  );
  // Once the user picks a date or time themselves, auto-fill never overwrites it.
  const [manualSchedule, setManualSchedule] = useState(() => restored?.manualSchedule ?? false);
  const [suggestionNonce, setSuggestionNonce] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const availabilityRequest = useRef<AbortController | null>(null);
  const suggestionRequest = useRef<AbortController | null>(null);
  const manualScheduleRef = useRef(restored?.manualSchedule ?? false);
  const suggestionRetries = useRef(0);
  const focusTimeWhenLoaded = useRef(false);
  // Restored data is seconds old: skip the first refetch while the inputs are unchanged.
  const restoredSuggestionKey = useRef(
    restored?.suggestion ? `${restored.values.services.join(',')}|${restored.values.barber}|0` : null,
  );
  const restoredAvailabilityDate = useRef(restored?.availability?.date ?? null);
  const latest = useRef({ values, errors, submitted, suggestion, availability });

  useEffect(() => setDateBounds(getBookingWindow()), []);

  // Display-only totals. The server recalculates them from the service ids.
  const quote = useMemo(() => quoteServices(values.services), [values.services]);
  const durationMin = quote.totalDurationMin || SLOT_STEP_MIN;
  const servicesKey = values.services.join(',');

  // ---------------------------------------------------------------------------
  // Nearest available slot (auto-fill)
  // ---------------------------------------------------------------------------
  const markManualSchedule = useCallback(() => {
    if (manualScheduleRef.current) return;
    manualScheduleRef.current = true;
    setManualSchedule(true);
    suggestionRequest.current?.abort();
  }, []);

  const loadSuggestion = useCallback(async (serviceIds: string, barber: string) => {
    suggestionRequest.current?.abort();
    const controller = new AbortController();
    suggestionRequest.current = controller;
    setSuggestion((s) => ({ ...s, loading: true, failed: false }));

    try {
      const params = new URLSearchParams({ barber });
      if (serviceIds) params.set('services', serviceIds);
      const res = await fetch(`/api/availability/next?${params.toString()}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      const data = (await res.json()) as NextSlotResponse;
      if (!res.ok || !data.ok) throw new Error('Next slot request failed');
      if (manualScheduleRef.current) return;

      setSuggestion({ loading: false, failed: false, today: data.today, slot: data.slot });
      if (data.slot) {
        const { date, time } = data.slot;
        setValues((v) => ({ ...v, date, time }));
        setErrors(withoutScheduleErrors);
      }
    } catch {
      if (!controller.signal.aborted) setSuggestion((s) => ({ ...s, loading: false, failed: true }));
    }
  }, []);

  // On open, and whenever services or barber change (different duration or schedule),
  // ask the server for the nearest slot, unless the user has chosen a time themselves.
  useEffect(() => {
    if (manualSchedule) return;
    const key = `${servicesKey}|${values.barber}|${suggestionNonce}`;
    if (restoredSuggestionKey.current === key) return;
    restoredSuggestionKey.current = null;
    const timer = setTimeout(() => void loadSuggestion(servicesKey, values.barber), SUGGESTION_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [servicesKey, values.barber, manualSchedule, suggestionNonce, loadSuggestion]);

  useEffect(() => {
    suggestionRetries.current = 0;
  }, [servicesKey, values.barber]);

  // ---------------------------------------------------------------------------
  // Language switch: keep what the visitor has entered
  // ---------------------------------------------------------------------------
  useEffect(() => {
    latest.current = { values, errors, submitted, suggestion, availability };
  });

  useEffect(() => {
    const save = () => {
      const { values: v, errors: e, submitted: s, suggestion: sg, availability: a } = latest.current;
      saveBookingDraft<LocaleSwitchDraft>({
        values: v,
        errors: e,
        submitted: s,
        manualSchedule: manualScheduleRef.current,
        suggestion: sg.loading || sg.failed ? null : { today: sg.today, slot: sg.slot },
        availability: a.status === 'ready' ? { date: a.date, until: a.until, busy: a.busy } : null,
      });
    };
    window.addEventListener(LOCALE_SWITCH_EVENT, save);
    return () => window.removeEventListener(LOCALE_SWITCH_EVENT, save);
  }, []);

  // The restored state is already in place; drop the stored copy so a later reload starts fresh.
  useEffect(() => {
    if (restored) clearBookingDraft();
  }, [restored]);

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------
  const loadAvailability = useCallback(async (date: string) => {
    availabilityRequest.current?.abort();
    const controller = new AbortController();
    availabilityRequest.current = controller;
    setAvailability({ status: 'loading', date });

    try {
      const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}&days=${LOOKAHEAD_DAYS}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      const data = (await res.json()) as AvailabilityResponse;
      if (!res.ok || !data.ok) throw new Error('Availability request failed');
      setAvailability({ status: 'ready', date, until: data.until, busy: data.busy });
    } catch {
      if (!controller.signal.aborted) setAvailability({ status: 'error', date });
    }
  }, []);

  // Refetch busy slots whenever a valid date is picked. Debounced, because typing
  // a date by hand produces several intermediate values.
  useEffect(() => {
    const date = values.date;
    // Slots for this date came along with the language switch: keep them, no loading spinner.
    if (restoredAvailabilityDate.current === date) return;
    restoredAvailabilityDate.current = null;

    const bounds = getBookingWindow();
    availabilityRequest.current?.abort();

    if (!isValidDate(date) || date < bounds.min || date > bounds.max) {
      setAvailability({ status: 'idle' });
      return;
    }

    setAvailability({ status: 'loading', date });
    const timer = setTimeout(() => void loadAvailability(date), AVAILABILITY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [values.date, loadAvailability]);

  useEffect(
    () => () => {
      availabilityRequest.current?.abort();
      suggestionRequest.current?.abort();
    },
    [],
  );

  const slotsLoading = availability.status === 'loading';
  const availabilityFailed = availability.status === 'error';
  const loaded = availability.status === 'ready' && availability.date === values.date ? availability : null;

  // Slots use the total duration of all selected services.
  const slotStates = useMemo(
    () => (values.date && !slotsLoading ? getSlotStates(values.date, durationMin, values.barber, loaded?.busy ?? []) : []),
    [values.date, durationMin, values.barber, loaded, slotsLoading],
  );
  const freeTimes = useMemo(() => slotStates.filter((s) => !s.booked).map((s) => s.time), [slotStates]);

  const noFreeTimes = loaded !== null && freeTimes.length === 0;
  const fullyBooked = noFreeTimes && slotStates.length > 0;
  const nextAvailableDate = useMemo(
    () =>
      noFreeTimes && loaded
        ? findNextAvailableDate(addDays(loaded.date, 1), loaded.until, durationMin, values.barber, loaded.busy)
        : null,
    [noFreeTimes, loaded, durationMin, values.barber],
  );

  // Drop a chosen time that is no longer free (other date, services, barber, or fresh data).
  useEffect(() => {
    if (slotsLoading || !values.time) return;
    if (!freeTimes.includes(values.time)) {
      setValues((v) => ({ ...v, time: '' }));
    }
  }, [freeTimes, slotsLoading, values.time]);

  // The suggested time was taken in the meantime (the list above cleared it): ask again.
  useEffect(() => {
    const slot = suggestion.slot;
    if (manualSchedule || suggestion.loading || !slot || slotsLoading) return;
    if (values.date === slot.date && values.time === '' && suggestionRetries.current < MAX_SUGGESTION_RETRIES) {
      suggestionRetries.current += 1;
      setSuggestionNonce((n) => n + 1);
    }
  }, [manualSchedule, suggestion, slotsLoading, values.date, values.time]);

  // After a 409 on a manually chosen time, move focus to the refreshed time list.
  useEffect(() => {
    if (focusTimeWhenLoaded.current && availability.status !== 'loading') {
      focusTimeWhenLoaded.current = false;
      formRef.current?.querySelector<HTMLElement>('[name="time"]')?.focus();
    }
  }, [availability.status]);

  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
  }, [status]);

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------
  const errorText = (field: FieldName) => translateFieldError(field, errors[field], dict);
  const barberName = (id: string, fallback = '') =>
    id === ANY_BARBER_ID ? f.anyBarber : barberText(dict, id)?.name ?? fallback;
  const serviceNames = (lines: readonly { id: string }[]) => lines.map((s) => serviceText(dict, s.id).name).join(' + ');

  function update<K extends FieldName>(field: K, value: BookingFields[K]) {
    if (field === 'date' || field === 'time') markManualSchedule();
    const next = { ...values, [field]: value };
    setValues(next);
    setFormError('');
    // After the first submit attempt, re-validate live so errors clear as they're fixed.
    if (submitted) {
      const result = validateBooking(next);
      setErrors(result.ok ? {} : result.errors);
    }
  }

  function toggleService(id: string) {
    const selected = values.services.includes(id);
    update('services', selected ? values.services.filter((s) => s !== id) : [...values.services, id]);
  }

  function chooseTimeManually() {
    markManualSchedule();
    setValues((v) => ({ ...v, date: '', time: '' }));
    formRef.current?.querySelector<HTMLElement>('[name="date"]')?.focus();
  }

  function focusFirstError(fieldErrors: FieldErrors) {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;

    setSubmitted(true);
    setFormError('');

    const check = validateBooking(values);
    if (!check.ok) {
      setErrors(check.errors);
      setStatus('idle');
      focusFirstError(check.errors);
      return;
    }
    setErrors({});
    setStatus('submitting');

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only service ids are sent; prices are calculated on the server. The locale is for the owner's note.
        body: JSON.stringify({ ...values, locale, [HONEYPOT_FIELD]: honeypot }),
      });
      const data = (await res.json().catch(() => null)) as ApiResponse | null;

      if (res.ok && data?.ok) {
        const d = check.data;
        setConfirmed(
          data.booking ?? {
            name: d.name,
            phone: d.phone,
            services: d.services,
            totalPriceThb: d.totalPriceThb,
            totalDurationMin: d.totalDurationMin,
            barberId: d.barberId,
            barberName: d.barberName,
            date: d.date,
            time: d.time,
            comment: d.comment,
          },
        );
        setStatus('success');
        return;
      }

      const code = data && !data.ok ? data.code : undefined;

      // Someone else took the slot between loading it and submitting.
      if (res.status === 409 || code === 'slot_taken') {
        setValues((v) => ({ ...v, time: '' }));
        setStatus('error');
        void loadAvailability(values.date);

        if (manualScheduleRef.current) {
          setErrors({ time: { code: 'taken' } });
          setFormError(t.errors.slotTaken);
          focusTimeWhenLoaded.current = true;
        } else {
          // The time was auto-filled: offer the next nearest one right away.
          setErrors({});
          setFormError(t.errors.slotTakenAuto);
          suggestionRetries.current = 0;
          setSuggestionNonce((n) => n + 1);
        }
        return;
      }

      if (data && !data.ok && data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
        setErrors(data.fieldErrors);
        focusFirstError(data.fieldErrors);
      }
      setFormError(
        res.status === 429 || code === 'rate_limited'
          ? t.errors.rateLimited
          : code === 'invalid_fields'
            ? t.errors.invalidFields
            : res.status >= 500 || code === 'server_error'
              ? t.errors.server
              : t.errors.unknown,
      );
      setStatus('error');
    } catch {
      setFormError(t.errors.network);
      setStatus('error');
    }
  }

  function reset() {
    setValues(EMPTY);
    setErrors({});
    setSubmitted(false);
    setFormError('');
    setConfirmed(null);
    setStatus('idle');
    manualScheduleRef.current = false;
    setManualSchedule(false);
    suggestionRetries.current = 0;
    setSuggestionNonce((n) => n + 1);
  }

  if (status === 'success' && confirmed) {
    const s = t.success;
    const names = serviceNames(confirmed.services);
    const bookedBarber = barberName(confirmed.barberId, confirmed.barberName);
    const calendarEvent = buildBookingEvent({
      title: interpolate(t.calendar.title, { services: names }),
      description: [
        interpolate(t.calendar.barber, { barber: bookedBarber }),
        interpolate(t.calendar.phone, { phone: SHOP.phoneDisplay }),
      ].join('\n'),
      location: [dict.shop.name, dict.shop.address.line1, dict.shop.address.line2, dict.shop.address.city].join(', '),
      date: confirmed.date,
      time: confirmed.time,
      durationMin: confirmed.totalDurationMin,
    });

    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-ochre-500/40 bg-graphite-800 p-6 outline-none sm:p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ochre-400 text-graphite-950">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="mt-5 font-display text-3xl uppercase tracking-wide text-beige-50">
          {interpolate(s.title, { name: confirmed.name.split(' ')[0] })}
        </h3>
        <p className="mt-2 text-beige-300">{s.text}</p>

        <dl className="mt-6 divide-y divide-graphite-600 rounded-xl border border-graphite-600 text-sm">
          <SummaryRow label={confirmed.services.length === 1 ? s.service : s.services}>
            <ul className="space-y-1">
              {confirmed.services.map((line) => (
                <li key={line.id} className="flex justify-between gap-4">
                  <span>{serviceText(dict, line.id).name}</span>
                  <span className="shrink-0 tabular-nums text-beige-300">{formatPrice(line.priceThb)}</span>
                </li>
              ))}
            </ul>
          </SummaryRow>
          <SummaryRow label={s.total}>
            <span className="font-semibold text-ochre-300">{formatPrice(confirmed.totalPriceThb)}</span> ·{' '}
            {formatDuration(confirmed.totalDurationMin, dict)}
          </SummaryRow>
          <SummaryRow label={s.barber}>{bookedBarber}</SummaryRow>
          <SummaryRow label={s.dateTime}>
            {interpolate(s.dateTimeValue, { date: formatDate(confirmed.date, locale, dict), time: confirmed.time })}
          </SummaryRow>
          <SummaryRow label={s.name}>{confirmed.name}</SummaryRow>
          <SummaryRow label={s.phone}>{confirmed.phone}</SummaryRow>
          {confirmed.comment && <SummaryRow label={s.comment}>{confirmed.comment}</SummaryRow>}
        </dl>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={googleCalendarUrl(calendarEvent)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-graphite-500 px-5 text-sm font-semibold text-beige-100 transition hover:border-ochre-400 hover:text-ochre-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400 sm:w-auto"
          >
            <CalendarIcon className="h-4 w-4" />
            {s.addToCalendar}
            <span className="sr-only">{s.addToCalendarHint}</span>
          </a>
        </div>

        <p className="mt-6 text-sm text-beige-400">
          {s.changeHint}{' '}
          <a href={SHOP.phoneHref} className="text-ochre-300 underline underline-offset-4">
            {SHOP.phoneDisplay}
          </a>
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-12 items-center rounded-full border border-beige-300/40 px-6 font-semibold text-beige-100 transition hover:border-ochre-400 hover:text-ochre-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400"
        >
          {s.another}
        </button>
      </div>
    );
  }

  const submitting = status === 'submitting';
  const includeScheduleInMessage = manualSchedule || values.services.length > 0 || values.barber !== ANY_BARBER_ID;

  const suggestedSlot = suggestion.slot;
  const isAutoFilled =
    !manualSchedule &&
    suggestedSlot !== null &&
    suggestion.today !== null &&
    values.date === suggestedSlot.date &&
    values.time === suggestedSlot.time;

  let timePlaceholder = f.slots.choose;
  if (!values.date) timePlaceholder = f.slots.pickDateFirst;
  else if (fullyBooked) timePlaceholder = f.slots.fullyBooked;
  else if (noFreeTimes || (values.date && slotStates.length === 0)) timePlaceholder = f.slots.noTimes;

  let timeHint: string | undefined;
  if (availabilityFailed) {
    timeHint = slotStates.length > 0 ? f.slots.availabilityFailed : f.slots.noTimesLeftHint;
  }

  const dayNotice = noFreeTimes ? (
    <div role="status" className="mt-3 rounded-xl border border-ochre-500/40 bg-ochre-400/10 p-4 text-sm">
      <p className="font-semibold text-beige-50">{fullyBooked ? f.dayNotice.fullyBooked : f.dayNotice.noTimesLeft}</p>
      {nextAvailableDate ? (
        <button
          type="button"
          onClick={() => update('date', nextAvailableDate)}
          className="mt-2 inline-flex min-h-11 items-center text-left font-semibold text-ochre-300 underline underline-offset-4 transition hover:text-ochre-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400"
        >
          {interpolate(f.dayNotice.nextAvailable, { date: formatDate(nextAvailableDate, locale, dict) })}
        </button>
      ) : (
        <p className="mt-1 text-beige-300">
          {values.barber !== ANY_BARBER_ID ? f.dayNotice.noneInTwoWeeksBarber : f.dayNotice.noneInTwoWeeks}
        </p>
      )}
    </div>
  ) : null;

  let suggestionNotice: ReactNode = null;
  if (!manualSchedule) {
    if (isAutoFilled && suggestedSlot && suggestion.today) {
      suggestionNotice = (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ochre-500/40 bg-ochre-400/10 px-4 py-2 text-sm">
          <span className="flex flex-wrap items-center gap-x-2 text-beige-100">
            {suggestion.loading && <Spinner className="h-4 w-4 text-ochre-400" />}
            {f.suggestion.nearest}
            <strong className="font-semibold text-ochre-300">
              {formatSlotLabel(suggestedSlot, suggestion.today, addDays(suggestion.today, 1), locale, dict)}
            </strong>
          </span>
          <button
            type="button"
            onClick={chooseTimeManually}
            className="inline-flex min-h-11 items-center font-semibold text-beige-200 underline underline-offset-4 transition hover:text-ochre-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400"
          >
            {f.suggestion.chooseAnother}
          </button>
        </div>
      );
    } else if (suggestion.loading) {
      suggestionNotice = (
        <p className="flex min-h-11 items-center gap-2 text-sm text-beige-400">
          <Spinner className="h-4 w-4 text-ochre-400" />
          {f.suggestion.finding}
        </p>
      );
    } else if (!suggestion.failed && suggestion.today && !suggestedSlot) {
      suggestionNotice = (
        <p className="rounded-xl border border-graphite-600 px-4 py-3 text-sm text-beige-300">
          {interpolate(f.suggestion.none, { phone: SHOP.phoneDisplay })}
        </p>
      );
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={submitting}
      className="relative rounded-2xl border border-graphite-600 bg-graphite-800 p-5 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f.name} name="name" error={errorText('name')}>
          {(p) => (
            <input
              {...p}
              type="text"
              autoComplete="name"
              maxLength={LIMITS.nameMax}
              placeholder={f.namePlaceholder}
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
            />
          )}
        </Field>

        <Field label={f.phone} name="phone" error={errorText('phone')} hint={errors.phone ? undefined : f.phoneHint}>
          {(p) => (
            <input
              {...p}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="081 234 5678"
              value={values.phone}
              onChange={(e) => update('phone', maskPhone(e.target.value))}
            />
          )}
        </Field>

        <fieldset
          className="sm:col-span-2"
          aria-describedby={errors.services ? 'booking-services-error' : 'booking-services-summary'}
        >
          <legend className="mb-2 text-sm font-semibold text-beige-100">
            {f.services} <span className="font-normal text-beige-400">{f.servicesHint}</span>
          </legend>

          {/* The summary is the last child of this wrapper, so on mobile it sticks to the
              bottom of the screen while the list is being scrolled. */}
          <div>
            {/* auto-rows-fr + h-full: every card gets the height of the tallest one. */}
            <ul className="grid auto-rows-fr gap-2 sm:grid-cols-2">
              {SERVICES.map((service) => {
                const checked = values.services.includes(service.id);
                return (
                  <li key={service.id}>
                    <label
                      className={[
                        'flex h-full min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition',
                        'focus-within:ring-2 focus-within:ring-ochre-400/40',
                        checked
                          ? 'border-ochre-400 bg-ochre-400/10'
                          : errors.services
                            ? 'border-danger bg-graphite-900'
                            : 'border-graphite-600 bg-graphite-900 hover:border-graphite-500',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        name="services"
                        value={service.id}
                        checked={checked}
                        onChange={() => toggleService(service.id)}
                        aria-invalid={Boolean(errors.services)}
                        className="h-5 w-5 shrink-0 cursor-pointer accent-ochre-400"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-snug text-beige-50">
                          {serviceText(dict, service.id).name}
                        </span>
                        <span className="block text-xs text-beige-400">{formatDuration(service.durationMin, dict)}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-beige-100">
                        {formatPrice(service.priceThb)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {errors.services && (
              <p id="booking-services-error" className="mt-2 flex items-start gap-1.5 text-sm text-danger">
                <span aria-hidden>!</span>
                {errorText('services')}
              </p>
            )}

            <QuoteSummary quote={quote} />
          </div>
        </fieldset>

        <div className="sm:col-span-2">
          <Field label={f.barber} name="barber" error={errorText('barber')}>
            {(p) => (
              <Select
                {...p}
                label={f.barber}
                value={values.barber}
                onChange={(barber) => update('barber', barber)}
                options={[
                  { value: ANY_BARBER_ID, label: f.anyBarber },
                  ...BARBERS.map((b) => {
                    const text = barberText(dict, b.id);
                    return { value: b.id, label: `${text.name} · ${text.role}` };
                  }),
                ]}
              />
            )}
          </Field>
        </div>

        {/* Label for the auto-filled date and time, directly above both fields. */}
        <div className="-mb-2 sm:col-span-2" aria-live="polite">
          {suggestionNotice}
        </div>

        <Field label={f.date} name="date" error={errorText('date')}>
          {(p) => (
            <DatePicker
              {...p}
              label={f.date}
              value={values.date}
              onChange={(date) => update('date', date)}
              min={dateBounds?.min}
              max={dateBounds?.max}
              today={dateBounds?.min}
              placeholder={f.datePlaceholder}
              locale={INTL_LOCALES[locale]}
              weekdays={WEEK_ORDER.map((day) => dict.time.daysShort[day])}
              formatValue={(date) => formatDate(date, locale, dict)}
              labels={f.calendar}
            />
          )}
        </Field>

        <Field label={f.time} name="time" error={errorText('time')} hint={timeHint} footer={dayNotice}>
          {(p) =>
            slotsLoading ? (
              <div
                role="status"
                aria-live="polite"
                className="flex min-h-12 items-center gap-3 rounded-xl border border-graphite-600 bg-graphite-900 px-4 text-sm text-beige-400"
              >
                <Spinner className="h-4 w-4 text-ochre-400" />
                {f.slots.checking}
              </div>
            ) : (
              <Select
                {...p}
                label={f.time}
                value={values.time}
                placeholder={timePlaceholder}
                disabled={freeTimes.length === 0}
                onChange={(time) => update('time', time)}
                options={slotStates.map((slot) => ({
                  value: slot.time,
                  label: slot.booked ? interpolate(f.slots.booked, { time: slot.time }) : slot.time,
                  disabled: slot.booked,
                }))}
              />
            )
          }
        </Field>

        <div className="sm:col-span-2">
          <Field
            label={f.comment}
            optionalLabel={f.optional}
            name="comment"
            error={errorText('comment')}
            counter={`${values.comment.length}/${LIMITS.commentMax}`}
          >
            {(p) => (
              <textarea
                {...p}
                rows={3}
                maxLength={LIMITS.commentMax}
                placeholder={f.commentPlaceholder}
                value={values.comment}
                onChange={(e) => update('comment', e.target.value)}
                className={`${p.className} !h-auto py-3 resize-y`}
              />
            )}
          </Field>
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech, tempting for bots. Not translated on purpose. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Website</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {formError && (
        <div
          role="alert"
          className="mt-6 flex gap-3 rounded-xl border border-danger/50 bg-danger/10 p-4 text-sm text-beige-50"
        >
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-danger" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5h.01" strokeLinecap="round" />
          </svg>
          <p>{formError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-ochre-400 px-8 text-base font-bold uppercase tracking-wider text-graphite-950 transition hover:bg-ochre-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-400 disabled:cursor-wait disabled:opacity-80 sm:w-auto"
      >
        {submitting && <Spinner className="h-5 w-5" />}
        {submitting ? f.submitting : f.submit}
      </button>
      <p className="mt-4 text-xs text-beige-400">{f.consent}</p>

      {/* The auto-filled nearest time counts only once the user has chosen something themselves;
          with an untouched form the message stays generic. */}
      <MessengerBooking
        draft={{
          name: values.name,
          services: values.services,
          barber: values.barber,
          date: includeScheduleInMessage ? values.date : '',
          time: includeScheduleInMessage ? values.time : '',
        }}
      />
    </form>
  );
}

/** Selected services, total duration and total price. Sticky at the bottom of the screen on mobile. */
function QuoteSummary({ quote }: { quote: Quote }) {
  const { dict } = useI18n();
  const q = dict.booking.form.quote;
  const count = quote.services.length;
  const price = useAnimatedNumber(quote.totalPriceThb);
  const minutes = useAnimatedNumber(quote.totalDurationMin);

  return (
    <div
      id="booking-services-summary"
      className="sticky bottom-3 z-10 mt-3 rounded-xl border border-ochre-500/40 bg-graphite-950/95 p-4 shadow-lg shadow-black/50 backdrop-blur sm:static sm:shadow-none"
    >
      {/* Screen readers get the final numbers once, not every animation frame. */}
      <p className="sr-only" aria-live="polite">
        {count > 0 ? formatQuoteSummary(quote, dict, formatPrice) : q.noneSelected}
      </p>

      {count === 0 ? (
        <p aria-hidden className="text-sm text-beige-400">
          {q.empty}
        </p>
      ) : (
        <div aria-hidden>
          <p className="line-clamp-2 text-sm text-beige-300">
            {quote.services.map((s) => serviceText(dict, s.id).name).join(' + ')}
          </p>
          <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 text-beige-100">
            <span className="text-sm">
              {formatServiceCount(count, dict)} ·{' '}
              <span className="tabular-nums">{interpolate(dict.time.minutes, { m: minutes })}</span> ·
            </span>
            <span className="font-display text-2xl font-semibold tabular-nums text-ochre-300">{formatPrice(price)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Counts smoothly to a new value. Instant when the user prefers reduced motion,
 * or when the page is hidden (browsers pause animation frames there).
 */
function useAnimatedNumber(value: number, durationMs = 300): number {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    const from = current.current;
    if (from === value) return;

    if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = value;
      setDisplay(value);
      return;
    }

    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      // The frame timestamp can be slightly earlier than startedAt; clamp so the number never dips below the start.
      const progress = Math.max(0, Math.min(1, (now - startedAt) / durationMs));
      const eased = 1 - (1 - progress) ** 3;
      current.current = Math.round(from + (value - from) * eased);
      setDisplay(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return display;
}

type ControlProps = {
  id: string;
  name: string;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
  className: string;
};

function Field({
  label,
  name,
  error,
  hint,
  optionalLabel,
  counter,
  footer,
  children,
}: {
  label: string;
  name: FieldName;
  error?: string;
  hint?: string;
  optionalLabel?: string;
  counter?: string;
  footer?: ReactNode;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = `booking-${name}`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const className = [
    // Fixed height, not min-height: text inputs and the Select / DatePicker buttons stay exactly the same size
    // in both languages.
    'block h-12 w-full rounded-xl border bg-graphite-900 px-4 text-base text-beige-50 placeholder:text-graphite-400',
    'transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
    error
      ? 'border-danger focus:border-danger focus:ring-danger/40'
      : 'border-graphite-600 focus:border-ochre-400 focus:ring-ochre-400/30',
  ].join(' ');

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-beige-100">
          {label}
          {optionalLabel && <span className="ml-1 font-normal text-beige-400">{optionalLabel}</span>}
        </label>
        {counter && <span className="text-xs tabular-nums text-beige-400">{counter}</span>}
      </div>
      {children({ id, name, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, className })}
      {error ? (
        <p id={`${id}-error`} className="mt-2 flex items-start gap-1.5 text-sm text-danger">
          <span aria-hidden>!</span>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-xs text-beige-400">
          {hint}
        </p>
      ) : null}
      {footer}
    </div>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ''}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-beige-400 sm:w-28">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-beige-50">{children}</dd>
    </div>
  );
}
