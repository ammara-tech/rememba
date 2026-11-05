"use client";

import { useCardPicture } from "@/lib/pictures";

/* A card's picture, loaded when the card is shown (lib/pictures.ts). Nothing if it has none. */
export default function CardPicture({ cardId, hasPicture, question, className = "" }: { cardId: string; hasPicture?: boolean; question: string; className?: string }) {
  const image = useCardPicture(cardId, hasPicture);
  if (!hasPicture || image === null) return null;
  if (image === undefined) return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-line ${className}`} />;
  // eslint-disable-next-line @next/next/no-img-element -- a picture saved as a data: URL, so next/image can't help
  return <img src={image} alt={`Picture for: ${question}`} className={`rounded-xl object-contain ${className}`} />;
}
