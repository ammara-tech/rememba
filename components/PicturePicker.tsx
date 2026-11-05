"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { shrinkPicture } from "@/lib/picture";

/*
  "Add a picture" for a card: choose a photo or take one with the phone's camera.
  The picture is made small on the phone first (lib/picture.ts), then shown as a preview.
  value: the new picture, null to remove the old one, undefined for no change.
*/
export default function PicturePicker({
  value,
  hadPicture,
  onChange,
  id,
}: {
  value: string | null | undefined;
  hadPicture: boolean;
  onChange: (picture: string | null | undefined) => void;
  id: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const showing = value || (hadPicture && value === undefined);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(false);
    const small = await shrinkPicture(file);
    setBusy(false);
    if (!small) return setError(true);
    onChange(small);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label htmlFor={id} className="btn-quiet cursor-pointer px-3 py-1.5 text-sm focus-within:ring-2">
        <Icon name="image" className="h-4 w-4" />
        {showing ? "Change the picture" : "Add a picture"}
        <input id={id} type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} className="sr-only" />
      </label>
      {busy && <span className="text-ink-soft">Making it smaller…</span>}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- a preview of the picture just chosen
        <img src={value} alt="The picture you chose" className="h-14 w-14 rounded-lg border border-line object-cover" />
      )}
      {showing && (
        <button type="button" onClick={() => onChange(hadPicture ? null : undefined)} className="font-semibold text-again hover:underline">
          Remove the picture
        </button>
      )}
      {hadPicture && value === null && <span className="text-ink-soft">The picture will be removed when you save.</span>}
      {error && (
        <span role="alert" className="text-again">
          That picture couldn&apos;t be used. Try another one.
        </span>
      )}
    </div>
  );
}
