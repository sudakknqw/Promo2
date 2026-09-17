'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { CalendarIcon } from './icons';

type DatePickerProps = {
  /** Accessible name of the field (the visible label is rendered by the surrounding form field). */
  label: string;
  /** 'YYYY-MM-DD' or '' */
  value: string;
  onChange: (value: string) => void;
  /** Earliest and latest selectable dates, 'YYYY-MM-DD'. */
  min?: string;
  max?: string;
  /** Highlighted as today and used by the Today button. */
  today?: string;
  placeholder?: string;
  /** BCP 47 locale for the month title, e.g. 'en-GB' or 'th-TH-u-ca-gregory'. */
  locale: string;
  /** Seven short weekday names, Monday first. */
  weekdays: string[];
  /** Text for a chosen date, on the button and as each day's accessible name. */
  formatValue: (value: string) => string;
  labels: { previousMonth: string; nextMonth: string; today: string };
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Trigger classes, so the field looks exactly like the neighbouring inputs. */
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

const CLOSE_ANIMATION_MS = 120;

// Dates stay 'YYYY-MM-DD' strings; arithmetic runs in UTC, so the visitor's time zone never shifts a day.
function parse(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : d;
}

const toIso = (d: Date) => d.toISOString().slice(0, 10);

function addDays(value: string, days: number): string {
  const d = parse(value) as Date;
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** Same day in another month, clamped to that month's length (31 Jan + 1 month = 28/29 Feb). */
function addMonths(value: string, months: number): string {
  const d = parse(value) as Date;
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return toIso(d);
}

const monthStart = (value: string) => `${value.slice(0, 7)}-01`;

/** Monday = 0 … Sunday = 6 */
const mondayIndex = (value: string) => ((parse(value) as Date).getUTCDay() + 6) % 7;

function clamp(value: string, min?: string, max?: string): string {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

/**
 * Styled replacement for <input type="date">: a button that opens a calendar dialog.
 *
 * Keyboard in the calendar: ←/→ day, ↑/↓ week, Home/End start/end of week, PageUp/PageDown month
 * (with Shift: year), Enter/Space choose, Esc close. Focus returns to the button after choosing.
 * Dates outside min/max are shown but can't be chosen or focused.
 */
export default function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  today,
  placeholder = '',
  locale,
  weekdays,
  formatValue,
  labels,
  id,
  name,
  disabled = false,
  className = '',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: DatePickerProps) {
  const reactId = useId();
  const triggerId = id ?? `${reactId}-trigger`;
  const dialogId = `${reactId}-dialog`;
  const labelId = `${reactId}-label`;
  const valueId = `${reactId}-value`;
  const titleId = `${reactId}-title`;

  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  // The day that holds keyboard focus inside the grid; its month is the one on screen.
  const [focusedDate, setFocusedDate] = useState('');
  const open = phase === 'open';

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusDayAfterRender = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const hasValue = parse(value) !== null;
  const isOutOfRange = (date: string) => Boolean((min && date < min) || (max && date > max));

  const close = useCallback((returnFocus: boolean) => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPhase((p) => (p === 'closing' ? 'closed' : p)), CLOSE_ANIMATION_MS);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  function openCalendar() {
    if (disabled) return;
    clearTimeout(closeTimer.current);
    const fallback = today ?? min ?? toIso(new Date());
    setFocusedDate(clamp(hasValue ? value : fallback, min, max));
    focusDayAfterRender.current = true;
    setPhase('open');
  }

  function choose(date: string) {
    if (isOutOfRange(date)) return;
    if (date !== value) onChange(date);
    close(true);
  }

  function moveFocus(date: string) {
    focusDayAfterRender.current = true;
    setFocusedDate(clamp(date, min, max));
  }

  function onDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(date, -1),
      ArrowRight: () => addDays(date, 1),
      ArrowUp: () => addDays(date, -7),
      ArrowDown: () => addDays(date, 7),
      Home: () => addDays(date, -mondayIndex(date)),
      End: () => addDays(date, 6 - mondayIndex(date)),
      PageUp: () => addMonths(date, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(date, event.shiftKey ? 12 : 1),
    };
    if (moves[event.key]) {
      event.preventDefault();
      moveFocus(moves[event.key]());
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(date);
    }
  }

  // Keep keyboard focus on the focused day as it moves (also across months).
  useEffect(() => {
    if (open && focusDayAfterRender.current) {
      focusDayAfterRender.current = false;
      dayRefs.current.get(focusedDate)?.focus({ preventScroll: true });
    }
  }, [open, focusedDate]);

  // Click anywhere outside closes the calendar.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const viewMonth = focusedDate ? monthStart(focusedDate) : '';
  const gridStart = viewMonth ? addDays(viewMonth, -mondayIndex(viewMonth)) : '';
  // Always six weeks, so the calendar keeps its height when the month changes.
  const days = gridStart ? Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)) : [];
  const monthTitle = viewMonth
    ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parse(viewMonth) as Date)
    : '';
  const canGoBack = viewMonth ? !min || viewMonth > monthStart(min) : false;
  const canGoForward = viewMonth ? !max || viewMonth < monthStart(max) : false;
  const todayUsable = Boolean(today && !isOutOfRange(today));

  const navButton =
    'flex h-9 w-9 items-center justify-center rounded-lg text-beige-200 transition hover:bg-graphite-700 hover:text-ochre-300 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre-400';

  return (
    <div ref={rootRef} className="relative">
      <span id={labelId} className="sr-only">
        {label}
      </span>

      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        name={name}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={phase === 'closed' ? undefined : dialogId}
        aria-labelledby={`${labelId} ${valueId}`}
        // aria-invalid isn't allowed on buttons: the error is announced through aria-describedby.
        aria-describedby={ariaDescribedBy}
        onClick={() => (open ? close(true) : openCalendar())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openCalendar();
          }
        }}
        className={`${className} flex items-center justify-between gap-3 text-left aria-expanded:border-ochre-400 aria-expanded:ring-2 aria-expanded:ring-ochre-400/30`}
      >
        <span id={valueId} className={`min-w-0 truncate ${hasValue ? '' : 'text-graphite-400'}`}>
          {hasValue ? formatValue(value) : placeholder}
        </span>
        <CalendarIcon className="h-[1.1rem] w-[1.1rem] shrink-0 text-ochre-400" />
      </button>

      {phase !== 'closed' && (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={labelId}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              close(true);
            }
          }}
          onBlur={(event) => {
            // Focus left the component (e.g. Tab past the last button). A null target means a
            // re-render removed the focused day; that is handled by the focus effect above.
            const target = event.relatedTarget as Node | null;
            if (target && !rootRef.current?.contains(target)) close(false);
          }}
          className={[
            'absolute left-0 top-full z-30 mt-2 w-[19.5rem] max-w-[calc(100vw-2rem)]',
            'rounded-xl border border-graphite-600 bg-graphite-900 p-3 shadow-xl shadow-black/50',
            open ? 'animate-dropdown-in' : 'pointer-events-none animate-dropdown-out',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className={navButton}
              aria-label={labels.previousMonth}
              disabled={!canGoBack}
              onClick={() => moveFocus(addMonths(focusedDate, -1))}
            >
              <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12.5 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p id={titleId} aria-live="polite" className="text-sm font-semibold capitalize text-beige-50">
              {monthTitle}
            </p>
            <button
              type="button"
              className={navButton}
              aria-label={labels.nextMonth}
              disabled={!canGoForward}
              onClick={() => moveFocus(addMonths(focusedDate, 1))}
            >
              <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M7.5 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div role="grid" aria-labelledby={titleId} className="mt-2">
            <div role="row" className="grid grid-cols-7">
              {weekdays.map((weekday) => (
                <span
                  key={weekday}
                  role="columnheader"
                  className="flex h-8 items-center justify-center text-xs font-semibold text-beige-400"
                >
                  {weekday}
                </span>
              ))}
            </div>

            {Array.from({ length: 6 }, (_, week) => (
              <div key={week} role="row" className="grid grid-cols-7 gap-y-0.5">
                {days.slice(week * 7, week * 7 + 7).map((date) => {
                  const inMonth = date.slice(0, 7) === viewMonth.slice(0, 7);
                  const outOfRange = isOutOfRange(date);
                  const selected = hasValue && date === value;
                  const isToday = date === today;
                  return (
                    <button
                      key={date}
                      ref={(el) => {
                        if (el) dayRefs.current.set(date, el);
                        else dayRefs.current.delete(date);
                      }}
                      type="button"
                      role="gridcell"
                      tabIndex={date === focusedDate ? 0 : -1}
                      aria-selected={selected}
                      aria-disabled={outOfRange || undefined}
                      aria-label={formatValue(date)}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => choose(date)}
                      onKeyDown={(event) => onDayKeyDown(event, date)}
                      className={[
                        'mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm tabular-nums transition',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ochre-400',
                        selected
                          ? 'bg-ochre-400 font-bold text-graphite-950'
                          : outOfRange
                            ? 'cursor-not-allowed text-graphite-500'
                            : inMonth
                              ? 'text-beige-100 hover:bg-graphite-700'
                              : 'text-beige-400/60 hover:bg-graphite-700',
                        isToday && !selected ? 'ring-1 ring-inset ring-ochre-500/70' : '',
                      ].join(' ')}
                    >
                      {Number(date.slice(8))}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {todayUsable && today && (
            <div className="mt-2 flex justify-end border-t border-graphite-700 pt-2">
              <button
                type="button"
                onClick={() => choose(today)}
                className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold text-ochre-300 underline underline-offset-4 transition hover:text-ochre-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre-400"
              >
                {labels.today}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
