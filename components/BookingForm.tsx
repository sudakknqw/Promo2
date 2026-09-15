'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';

import {
  ANY_BARBER_ID,
  ANY_BARBER_NAME,
  BARBERS,
  SERVICES,
  SHOP,
  SLOT_STEP_MIN,
  formatDuration,
  formatPrice,
} from '@/lib/data';
import {
  FIELD_ORDER,
  HONEYPOT_FIELD,
  LIMITS,
  PHONE_HINT,
  formatDateLong,
  getBookingWindow,
  getTimeSlots,
  maskPhone,
  validateBooking,
  type BookingFields,
  type FieldErrors,
  type FieldName,
} from '@/lib/validation';

type ConfirmedBooking = {
  name: string;
  phone: string;
  serviceName: string;
  priceThb: number;
  durationMin: number;
  barberName: string;
  date: string;
  time: string;
  comment: string | null;
};

type ApiResponse =
  | { ok: true; booking?: ConfirmedBooking }
  | { ok: false; error?: string; fieldErrors?: FieldErrors };

const EMPTY: BookingFields = {
  name: '',
  phone: '',
  service: '',
  barber: ANY_BARBER_ID,
  date: '',
  time: '',
  comment: '',
};

const NETWORK_ERROR = 'We couldn’t reach the server. Check your connection and try again.';

export default function BookingForm() {
  const [values, setValues] = useState<BookingFields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formError, setFormError] = useState('');
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);
  const [honeypot, setHoneypot] = useState('');
  // Date bounds depend on "now", so compute them after mount to avoid hydration mismatch.
  const [dateBounds, setDateBounds] = useState<{ min: string; max: string } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDateBounds(getBookingWindow()), []);

  const selectedService = SERVICES.find((s) => s.id === values.service);
  const slots = useMemo(
    () => (values.date ? getTimeSlots(values.date, selectedService?.durationMin ?? SLOT_STEP_MIN) : []),
    [values.date, selectedService],
  );

  // Drop a chosen time that no longer fits after the date or service changes.
  useEffect(() => {
    if (values.time && !slots.includes(values.time)) {
      setValues((v) => ({ ...v, time: '' }));
    }
  }, [slots, values.time]);

  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
  }, [status]);

  function update(field: FieldName, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    // After the first submit attempt, re-validate live so errors clear as they're fixed.
    if (submitted) {
      const result = validateBooking(next);
      setErrors(result.ok ? {} : result.errors);
    }
  }

  function focusFirstError(fieldErrors: FieldErrors) {
    const first = FIELD_ORDER.find((f) => fieldErrors[f]);
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
        body: JSON.stringify({ ...values, [HONEYPOT_FIELD]: honeypot }),
      });
      const data = (await res.json().catch(() => null)) as ApiResponse | null;

      if (res.ok && data?.ok) {
        const d = check.data;
        setConfirmed(
          data.booking ?? {
            name: d.name,
            phone: d.phone,
            serviceName: d.serviceName,
            priceThb: d.priceThb,
            durationMin: d.durationMin,
            barberName: d.barberName,
            date: d.date,
            time: d.time,
            comment: d.comment,
          },
        );
        setStatus('success');
        return;
      }

      if (data && !data.ok && data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
        setErrors(data.fieldErrors);
        focusFirstError(data.fieldErrors);
      }
      setFormError(data && !data.ok && data.error ? data.error : 'Something went wrong. Please try again.');
      setStatus('error');
    } catch {
      setFormError(NETWORK_ERROR);
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
  }

  if (status === 'success' && confirmed) {
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
          You’re booked, {confirmed.name.split(' ')[0]}!
        </h3>
        <p className="mt-2 text-beige-300">
          We’ve received your request and will confirm by phone or LINE shortly. Here are the details:
        </p>

        <dl className="mt-6 divide-y divide-graphite-600 rounded-xl border border-graphite-600 text-sm">
          <SummaryRow label="Service">
            {confirmed.serviceName} · {formatPrice(confirmed.priceThb)} · {formatDuration(confirmed.durationMin)}
          </SummaryRow>
          <SummaryRow label="Barber">{confirmed.barberName}</SummaryRow>
          <SummaryRow label="Date & time">
            {formatDateLong(confirmed.date)} at {confirmed.time}
          </SummaryRow>
          <SummaryRow label="Name">{confirmed.name}</SummaryRow>
          <SummaryRow label="Phone">{confirmed.phone}</SummaryRow>
          {confirmed.comment && <SummaryRow label="Comment">{confirmed.comment}</SummaryRow>}
        </dl>

        <p className="mt-6 text-sm text-beige-400">
          Need to change something? Call us at{' '}
          <a href={SHOP.phoneHref} className="text-ochre-300 underline underline-offset-4">
            {SHOP.phoneDisplay}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-12 items-center rounded-full border border-beige-300/40 px-6 font-semibold text-beige-100 transition hover:border-ochre-400 hover:text-ochre-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400"
        >
          Make another booking
        </button>
      </div>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={submitting}
      className="relative rounded-2xl border border-graphite-600 bg-graphite-800 p-5 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" error={errors.name}>
          {(p) => (
            <input
              {...p}
              type="text"
              autoComplete="name"
              maxLength={LIMITS.nameMax}
              placeholder="e.g. Somchai Jaidee"
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
            />
          )}
        </Field>

        <Field label="Phone" name="phone" error={errors.phone} hint={errors.phone ? undefined : PHONE_HINT}>
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

        <Field
          label="Service"
          name="service"
          error={errors.service}
          hint={selectedService ? `Takes about ${formatDuration(selectedService.durationMin)}` : undefined}
        >
          {(p) => (
            <select {...p} value={values.service} onChange={(e) => update('service', e.target.value)}>
              <option value="" disabled>
                Choose a service
              </option>
              {SERVICES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatPrice(s.priceThb)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Barber" name="barber" error={errors.barber}>
          {(p) => (
            <select {...p} value={values.barber} onChange={(e) => update('barber', e.target.value)}>
              <option value={ANY_BARBER_ID}>{ANY_BARBER_NAME}</option>
              {BARBERS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.role}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Date" name="date" error={errors.date}>
          {(p) => (
            <input
              {...p}
              type="date"
              min={dateBounds?.min}
              max={dateBounds?.max}
              value={values.date}
              onChange={(e) => update('date', e.target.value)}
            />
          )}
        </Field>

        <Field
          label="Time"
          name="time"
          error={errors.time}
          hint={values.date && slots.length === 0 && !errors.time ? 'No times left on this day. Please pick another date.' : undefined}
        >
          {(p) => (
            <select
              {...p}
              value={values.time}
              disabled={!values.date || slots.length === 0}
              onChange={(e) => update('time', e.target.value)}
            >
              <option value="" disabled>
                {values.date ? 'Choose a time' : 'Pick a date first'}
              </option>
              {slots.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="Comment"
            optional
            name="comment"
            error={errors.comment}
            counter={`${values.comment.length}/${LIMITS.commentMax}`}
          >
            {(p) => (
              <textarea
                {...p}
                rows={3}
                maxLength={LIMITS.commentMax}
                placeholder="Anything we should know? Style references, allergies, first visit…"
                value={values.comment}
                onChange={(e) => update('comment', e.target.value)}
                className={`${p.className} resize-y`}
              />
            )}
          </Field>
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Leave this field empty</label>
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
        {submitting && (
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {submitting ? 'Booking…' : 'Confirm booking'}
      </button>
      <p className="mt-4 text-xs text-beige-400">
        By booking you agree that we may contact you about this appointment. Pay at the shop, no deposit needed.
      </p>
    </form>
  );
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
  optional,
  counter,
  children,
}: {
  label: string;
  name: FieldName;
  error?: string;
  hint?: string;
  optional?: boolean;
  counter?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = `booking-${name}`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const className = [
    'block w-full min-h-12 rounded-xl border bg-graphite-900 px-4 py-3 text-base text-beige-50 placeholder:text-graphite-400',
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
          {optional && <span className="ml-1 font-normal text-beige-400">(optional)</span>}
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
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-beige-400 sm:w-28">{label}</dt>
      <dd className="break-words text-beige-50">{children}</dd>
    </div>
  );
}
