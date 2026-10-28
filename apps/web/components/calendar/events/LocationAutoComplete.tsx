'use client';

import { useEffect, useRef, useState } from 'react';

export type PlaceSuggestion = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
} & Record<string, unknown>;

export default function LocationAutocomplete(props: {
  value?: string;
  onChange: (val: string) => void;
  onSelect?: (place: PlaceSuggestion) => void;
  placeholder?: string;
  minLength?: number;
  className?: string;
}) {
  const {
    value = '',
    onChange,
    onSelect,
    placeholder = 'Add location',
    minLength = 2,
    className,
  } = props;

  const [input, setInput] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const controllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const userInteractedRef = useRef(false);
  const suppressRef = useRef(false);
  const recentlySelectedRef = useRef(false);
  const recentSelectTimeoutRef = useRef<number | null>(null);
  const blockOpenUntilRef = useRef<number>(0);
  // Tracks the exact display_name that was last selected — prevents re-fetching
  // the same value when the parent echoes it back via the `value` prop.
  const selectedValueRef = useRef<string>('');

  // Sync input when parent programmatically changes value
  useEffect(() => {
    if (value !== prevValue) {
      setPrevValue(value);
      setInput(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Debounced search
  useEffect(() => {
    // If the input matches the value we just selected, don't re-trigger a search.
    // This prevents the suggestion list from reappearing when the parent echoes
    // the selected display_name back as the `value` prop.
    if (input === selectedValueRef.current && selectedValueRef.current !== '') {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    if ((input ?? '').trim().length < minLength) {
      // No fetch needed; UI just shows nothing.
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setSuggestions([]);
      setLoading(false);
      // Close unless user is focusing the field and suggestions exist
      if (!userInteractedRef.current) setOpen(false);
      return;
    }

    // Start fetch but don't automatically open suggestions here unless user interacted
    setLoading(true);

    // clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      const q = encodeURIComponent(input.trim());
      // Nominatim public search endpoint (no API key). Respect usage limits in production.
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=6`;
      fetch(url, {
        signal: ctrl.signal,
        headers: { 'Accept-Language': navigator.language || 'en' },
      })
        .then((res) => res.json())
        .then((data: unknown) => {
          // If suppress flag set (e.g. user just selected), ignore results
          if (suppressRef.current) {
            setSuggestions([]);
            return;
          }

          const items = Array.isArray(data) ? data : [];
          const list = items.map((d) => {
            const item = d as Record<string, unknown>;
            return {
              place_id: String(item.place_id ?? item.osm_id ?? Math.random()),
              display_name: String(item.display_name ?? ''),
              lat: String(item.lat ?? ''),
              lon: String(item.lon ?? ''),
              ...item,
            } as PlaceSuggestion;
          });
          setSuggestions(list);
          setHighlight(0);
          // Only open the dropdown if the user interacted (typed/focused), not recently selected, and not suppressed
          const now = Date.now();
          if (
            userInteractedRef.current &&
            !recentlySelectedRef.current &&
            list.length > 0 &&
            !suppressRef.current &&
            now > blockOpenUntilRef.current
          ) {
            setOpen(true);
          }
        })
        .catch((err: unknown) => {
          if (
            typeof err === 'object' &&
            err !== null &&
            'name' in err &&
            (err as Record<string, unknown>).name === 'AbortError'
          )
            return;
          console.error('Location search error', err);
          setSuggestions([]);
        })
        .finally(() => {
          setLoading(false);
          // clear controller only if it's the same we created
          if (controllerRef.current === ctrl) controllerRef.current = null;
        });
    }, 300); // debounce 300ms

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
    };
  }, [input, minLength]);

  // Click outside closes suggestions
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (e.target instanceof Node && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  function clearRecentSelectTimeout() {
    if (recentSelectTimeoutRef.current) {
      clearTimeout(recentSelectTimeoutRef.current);
      recentSelectTimeoutRef.current = null;
    }
  }

  function handleSelect(place: PlaceSuggestion) {
    // Abort any pending fetch or pending timeout so results won't come back and re-open
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Set input and propagate; lock the selected value so the search effect
    // won't re-fetch when the parent echoes it back via the `value` prop.
    selectedValueRef.current = place.display_name;
    setInput(place.display_name);
    onChange(place.display_name);
    setOpen(false);
    setSuggestions([]);

    // mark that user interacted (selection is user-driven) and suppress incoming results briefly
    userInteractedRef.current = true;
    suppressRef.current = true;
    recentlySelectedRef.current = true;

    // clear any previous timeout and set a new one to clear both suppress and recentlySelected
    clearRecentSelectTimeout();
    recentSelectTimeoutRef.current = window.setTimeout(() => {
      suppressRef.current = false;
      recentlySelectedRef.current = false;
      recentSelectTimeoutRef.current = null;
    }, 600);
    // also block opening for a short window to avoid race where focus/fetch re-opens suggestions
    blockOpenUntilRef.current = Date.now() + 800;

    if (onSelect) onSelect(place);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[highlight]) handleSelect(suggestions[highlight]);
      else {
        // commit the input even if no suggestion selected
        onChange(input);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
      clearRecentSelectTimeout();
    };
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <input
        type="text"
        value={input}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          // If user types something different from the selected value, allow searching again
          if (v !== selectedValueRef.current) selectedValueRef.current = '';
          setInput(v);
          onChange(v);
          userInteractedRef.current = true;
          recentlySelectedRef.current = false;
          clearRecentSelectTimeout();
          if (v.trim().length < minLength) {
            setSuggestions([]);
            setOpen(false);
            setLoading(false);
          }
        }}
        onMouseDown={() => {
          // mark as user interaction only when user clicks/taps the input
          userInteractedRef.current = true;
        }}
        onFocus={() => {
          // On focus we don't assume the user interacted (avoid auto-open on mount).
          // Only open if the user already interacted (clicked/typed) and suggestions exist.
          const now = Date.now();
          if (
            userInteractedRef.current &&
            suggestions.length > 0 &&
            !recentlySelectedRef.current &&
            now > blockOpenUntilRef.current
          )
            setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="w-full rounded border px-3 py-2 text-sm"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="location-suggestions"
        aria-activedescendant={
          open && suggestions[highlight] ? `loc-${suggestions[highlight].place_id}` : undefined
        }
      />

      {open && (suggestions.length > 0 || loading) && (
        <div
          id="location-suggestions"
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow-sm dark:bg-gray-700"
        >
          {loading && suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
          ) : null}

          {suggestions.map((s, idx) => (
            <button
              key={s.place_id}
              id={`loc-${s.place_id}`}
              type="button"
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${idx === highlight ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => handleSelect(s)}
            >
              <div className="truncate font-medium">{s.display_name}</div>
              <div className="text-xs text-gray-500">
                {s.lat && s.lon ? `${s.lat.slice(0, 7)}, ${s.lon.slice(0, 7)}` : ''}
              </div>
            </button>
          ))}

          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">No results</div>
          )}
        </div>
      )}
    </div>
  );
}
