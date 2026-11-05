/*
  Pictures on cards: a diagram, a map, a photo of a plant or a word in another script.
  Firebase's file storage needs a paid plan, so Rememba keeps each picture as a small JPEG,
  written as text in the database, apart from the card itself (users/{uid}/pictures/{card id}).
  That way the list of cards stays small and quick, and a picture is only loaded when its card
  is shown. The phone makes the picture small first (shrinkPicture), so even a 12-megapixel
  photo is saved in a moment. Tested in tests/picture.test.ts.
*/

export const MAX_PICTURE_SIDE = 900; // pixels, the longest side
export const MAX_PICTURE_CHARS = 300_000; // about 220 KB of JPEG, well under Firestore's 1 MB limit

/** The size to draw a picture at: the longest side at most `max`, never made bigger */
export function fitWithin(width: number, height: number, max = MAX_PICTURE_SIDE) {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export const isPicture = (v: unknown): v is string =>
  typeof v === "string" && v.startsWith("data:image/jpeg;base64,") && v.length <= MAX_PICTURE_CHARS;

/** Makes a picture small enough to save, or null if it can't be read as an image */
export async function shrinkPicture(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file);
    let side = MAX_PICTURE_SIDE;
    for (let attempt = 0; attempt < 4; attempt++) {
      const size = fitWithin(bitmap.width, bitmap.height, side);
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff"; // see-through parts of a PNG become white, not black
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.drawImage(bitmap, 0, 0, size.width, size.height);
      const jpeg = canvas.toDataURL("image/jpeg", 0.8);
      if (isPicture(jpeg)) return jpeg;
      side = Math.round(side * 0.75); // still too big: try smaller
    }
    return null;
  } catch {
    return null;
  }
}
