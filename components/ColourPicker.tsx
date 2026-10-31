"use client";

import { COLOUR_NAMES, DECK_COLOURS } from "@/lib/samples";

/* A row of colour swatches (radio buttons, so it works with a keyboard and a screen reader) */
export default function ColourPicker({ name, value, onChange }: { name: string; value: string; onChange: (colour: string) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">Colour</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {DECK_COLOURS.map((col) => (
          <label key={col} className="cursor-pointer">
            <input type="radio" name={name} value={col} checked={value === col} onChange={() => onChange(col)} className="peer sr-only" />
            <span
              aria-hidden="true"
              className="block h-9 w-9 rounded-full border-4 border-panel ring-2 ring-transparent peer-checked:ring-ink peer-focus-visible:ring-indigo"
              style={{ background: col }}
            />
            <span className="sr-only">{COLOUR_NAMES[col] ?? col}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
