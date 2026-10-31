"use client";

/* "Deleted 3 cards · Undo" at the bottom of the screen, for a few seconds */
export default function UndoBar({ text, onUndo }: { text: string; onUndo: () => void }) {
  return (
    <div role="status" className="rise fixed inset-x-0 bottom-20 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-4 rounded-full border border-line bg-panel px-5 py-2.5 text-sm font-semibold shadow-lg sm:bottom-6">
      <span>{text}</span>
      <button type="button" onClick={onUndo} className="font-extrabold uppercase tracking-wider text-indigo hover:underline">
        Undo
      </button>
    </div>
  );
}
