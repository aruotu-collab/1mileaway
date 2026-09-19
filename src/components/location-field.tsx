"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { filterLocationSuggestions, locationTypedHint, type LocationChoice } from "@/lib/locations/suggest";

type Highlight = "current" | "typed" | `loc:${string}`;

export function LocationField({
  id,
  name = "location",
  value,
  locations,
  onChange,
  onUseCurrentLocation,
  geoStatus,
}: {
  id?: string;
  name?: string;
  value: string;
  locations: LocationChoice[];
  onChange: (value: string) => void;
  onUseCurrentLocation: () => void;
  geoStatus?: string | null;
}) {
  const listId = useId();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<Highlight>("current");

  const matches = useMemo(() => filterLocationSuggestions(locations, value), [locations, value]);
  const typedHint = locationTypedHint(value, matches);
  const options = useMemo(() => {
    const items: Highlight[] = ["current"];
    if (typedHint) items.push("typed");
    for (const location of matches) items.push(`loc:${location.slug}`);
    return items;
  }, [matches, typedHint]);

  useEffect(() => {
    if (!options.includes(highlight)) setHighlight(options[0] ?? "current");
  }, [highlight, options]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function move(delta: number) {
    const index = options.indexOf(highlight);
    const next = options[(index + delta + options.length) % options.length];
    if (next) setHighlight(next);
  }

  function choose(next: Highlight) {
    if (next === "current") {
      onUseCurrentLocation();
      setOpen(false);
      return;
    }
    if (next === "typed") {
      setOpen(false);
      return;
    }
    const slug = next.slice(4);
    const location = matches.find((row) => row.slug === slug);
    if (location) onChange(location.name);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          id={inputId}
          className="search-field"
          name={name}
          value={value}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Area, postcode or street"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!open) setOpen(true);
              else move(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              if (open) move(-1);
            } else if (event.key === "Escape") {
              setOpen(false);
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              choose(highlight);
            }
          }}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 px-3 text-ink-soft"
          aria-label={open ? "Hide areas" : "Show areas"}
          onClick={() => setOpen((current) => !current)}
        >
          <span aria-hidden>{open ? "▴" : "▾"}</span>
        </button>
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-line bg-paper-strong py-1 shadow-lg sm:max-h-96"
        >
          <li role="option" aria-selected={highlight === "current"}>
            <button
              type="button"
              className={`flex w-full px-4 py-2.5 text-left text-sm font-medium ${
                highlight === "current" ? "bg-moss/10 text-moss-deep" : "text-moss-deep"
              }`}
              onMouseEnter={() => setHighlight("current")}
              onClick={() => choose("current")}
            >
              Use my current location
            </button>
          </li>
          {typedHint ? (
            <li role="option" aria-selected={highlight === "typed"}>
              <button
                type="button"
                className={`flex w-full px-4 py-2.5 text-left text-sm ${
                  highlight === "typed" ? "bg-moss/10 text-ink" : "text-ink"
                }`}
                onMouseEnter={() => setHighlight("typed")}
                onClick={() => choose("typed")}
              >
                {typedHint}
              </button>
            </li>
          ) : null}
          {matches.length > 0 ? (
            <li className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft" aria-hidden>
              Areas
            </li>
          ) : value.trim() ? (
            <li className="px-4 py-2 text-sm text-ink-soft">No matching areas — you can still search this as typed.</li>
          ) : null}
          {matches.map((location) => {
            const key = `loc:${location.slug}` as const;
            return (
              <li key={location.slug} role="option" aria-selected={highlight === key}>
                <button
                  type="button"
                  className={`flex w-full px-4 py-2.5 text-left text-sm ${
                    highlight === key ? "bg-moss/10 text-ink" : "text-ink"
                  }`}
                  onMouseEnter={() => setHighlight(key)}
                  onClick={() => choose(key)}
                >
                  {location.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="mt-2 text-sm text-ink-soft">
        {geoStatus ?? "Pick an area, use your location, or type a postcode or street."}
      </p>
    </div>
  );
}
