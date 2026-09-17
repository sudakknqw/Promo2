'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = {
  /** Accessible name of the field (the visible label is rendered by the surrounding form field). */
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Shown while no option matches `value`. */
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Trigger classes, so the field looks exactly like the neighbouring inputs. */
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

const CLOSE_ANIMATION_MS = 120;
const TYPEAHEAD_RESET_MS = 500;

/**
 * Styled replacement for a native <select>: a button that opens a listbox.
 *
 * Keyboard: on the button, ↓/↑ (or typing a letter) open the list. In the list, ↑/↓ move the
 * active option (aria-activedescendant), Home/End jump to the first/last, Enter/Space choose,
 * Esc closes, Tab closes and moves on, letters jump to the next matching option.
 * Focus returns to the button after choosing or Esc. Disabled options can't be chosen.
 */
export default function Select({
  label,
  options,
  value,
  onChange,
  placeholder = '',
  id,
  name,
  disabled = false,
  className = '',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: SelectProps) {
  const reactId = useId();
  const triggerId = id ?? `${reactId}-trigger`;
  const listId = `${reactId}-listbox`;
  const labelId = `${reactId}-label`;
  const valueId = `${reactId}-value`;
  const optionId = (index: number) => `${reactId}-option-${index}`;

  // 'closing' keeps the list mounted for its exit animation.
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const [activeIndex, setActiveIndex] = useState(-1);
  const open = phase === 'open';

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const typeahead = useRef<{ buffer: string; timer?: ReturnType<typeof setTimeout> }>({ buffer: '' });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const firstEnabled = () => options.findIndex((o) => !o.disabled);
  const lastEnabled = () => {
    for (let i = options.length - 1; i >= 0; i--) if (!options[i].disabled) return i;
    return -1;
  };
  const nextEnabled = (from: number, direction: 1 | -1) => {
    for (let i = from + direction; i >= 0 && i < options.length; i += direction) {
      if (!options[i].disabled) return i;
    }
    return from;
  };

  const close = useCallback((returnFocus: boolean) => {
    setPhase((p) => (p === 'open' ? 'closing' : p));
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPhase((p) => (p === 'closing' ? 'closed' : p)), CLOSE_ANIMATION_MS);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  function openList(start: 'selected' | 'first' | 'last' = 'selected') {
    if (disabled || options.length === 0) return;
    clearTimeout(closeTimer.current);
    const selectedUsable = selectedIndex >= 0 && !options[selectedIndex].disabled;
    setActiveIndex(
      selectedUsable && start !== 'last' ? selectedIndex : start === 'last' ? lastEnabled() : firstEnabled(),
    );
    setPhase('open');
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    if (option.value !== value) onChange(option.value);
    close(true);
  }

  /** Letter typed: jump to the next enabled option starting with the typed text. */
  function matchTypeahead(char: string, from: number): number {
    const state = typeahead.current;
    clearTimeout(state.timer);
    state.buffer += char.toLocaleLowerCase();
    state.timer = setTimeout(() => (state.buffer = ''), TYPEAHEAD_RESET_MS);

    const startsWith = (index: number, text: string) =>
      !options[index].disabled && options[index].label.toLocaleLowerCase().startsWith(text);
    const search = (text: string) => {
      for (let step = 1; step <= options.length; step++) {
        const index = (Math.max(from, 0) + step) % options.length;
        if (startsWith(index, text)) return index;
      }
      return -1;
    };

    // Typing more letters keeps the current option while it still matches.
    if (state.buffer.length > 1 && from >= 0 && startsWith(from, state.buffer)) return from;
    const found = search(state.buffer);
    return found >= 0 || state.buffer.length === 1 ? found : search(char.toLocaleLowerCase());
  }

  const isPrintable = (event: KeyboardEvent) =>
    event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey;

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openList('selected');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openList(selectedIndex >= 0 ? 'selected' : 'last');
    } else if (isPrintable(event)) {
      event.preventDefault();
      openList('selected');
      const match = matchTypeahead(event.key, selectedIndex);
      if (match >= 0) setActiveIndex(match);
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((i) => (i < 0 ? firstEnabled() : nextEnabled(i, 1)));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((i) => (i < 0 ? lastEnabled() : nextEnabled(i, -1)));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(firstEnabled());
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(lastEnabled());
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(activeIndex);
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        // Let focus move on naturally.
        close(false);
        break;
      default:
        if (isPrintable(event)) {
          event.preventDefault();
          const match = matchTypeahead(event.key, activeIndex);
          if (match >= 0) setActiveIndex(match);
        }
    }
  }

  // Move focus into the list when it opens, so arrow keys and aria-activedescendant work.
  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Keep the active option visible in a scrolled list.
  useEffect(() => {
    if (open && activeIndex >= 0) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  // Click anywhere outside closes the list.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  // A disabled field can't stay open (e.g. no free times left after new data arrived).
  useEffect(() => {
    if (disabled && open) close(false);
  }, [disabled, open, close]);

  useEffect(
    () => () => {
      clearTimeout(closeTimer.current);
      clearTimeout(typeahead.current.timer);
    },
    [],
  );

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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={phase === 'closed' ? undefined : listId}
        aria-labelledby={`${labelId} ${valueId}`}
        // aria-invalid isn't allowed on buttons: the error is announced through aria-describedby
        // (the message under the field) and marked on the listbox below.
        aria-describedby={ariaDescribedBy}
        onClick={() => (open ? close(true) : openList('selected'))}
        onKeyDown={onTriggerKeyDown}
        className={`${className} flex items-center justify-between gap-3 text-left aria-expanded:border-ochre-400 aria-expanded:ring-2 aria-expanded:ring-ochre-400/30`}
      >
        <span id={valueId} className={`min-w-0 truncate ${selected ? '' : 'text-graphite-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={`h-[1.1rem] w-[1.1rem] shrink-0 text-ochre-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {phase !== 'closed' && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-invalid={ariaInvalid || undefined}
          aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          onKeyDown={onListKeyDown}
          onBlur={(event) => {
            if (!rootRef.current?.contains(event.relatedTarget as Node | null)) close(false);
          }}
          // Clicking an option must not move focus away from the list.
          onMouseDown={(event) => event.preventDefault()}
          className={[
            'absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto overscroll-contain',
            'rounded-xl border border-graphite-600 bg-graphite-900 p-1 shadow-xl shadow-black/50 focus:outline-none',
            open ? 'animate-dropdown-in' : 'pointer-events-none animate-dropdown-out',
          ].join(' ')}
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onMouseMove={() => {
                  if (!option.disabled && !isActive) setActiveIndex(index);
                }}
                onClick={() => choose(index)}
                className={[
                  'flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-base',
                  option.disabled
                    ? 'cursor-not-allowed text-graphite-400'
                    : isActive
                      ? 'cursor-pointer bg-graphite-700 text-beige-50'
                      : 'cursor-pointer text-beige-100',
                  isSelected ? 'font-semibold text-ochre-300' : '',
                ].join(' ')}
              >
                <span className="min-w-0">{option.label}</span>
                {isSelected && (
                  <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 shrink-0 text-ochre-400" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
