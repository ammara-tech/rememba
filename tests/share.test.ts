import { describe, expect, it } from "vitest";
import {
  MAX_SHARED_CARDS,
  SHARE_ALPHABET,
  SHARE_CODE_LENGTH,
  codeFromInput,
  isShareCode,
  makeShareCode,
  readShared,
  shareLink,
  shareMessage,
  sharedCards,
  sharedIsOutOfDate,
} from "@/lib/share";
import { newSchedule } from "@/lib/srs";
import type { Card } from "@/lib/types";

const card = (id: string, deckId: string, front: string, back: string, createdAt: number, tags: string[] = []): Card => ({
  id,
  deckId,
  front,
  back,
  tags,
  createdAt,
  ...newSchedule(0),
});

describe("share codes", () => {
  it("are 12 letters and digits that can't be mixed up", () => {
    const code = makeShareCode();
    expect(code).toHaveLength(SHARE_CODE_LENGTH);
    expect(isShareCode(code)).toBe(true);
    expect(SHARE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it("skip random bytes that would make some letters more likely", () => {
    // 255 is skipped, 0 is the first letter, 31 wraps round to the first letter again
    const bytes = [255, 0, 31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const code = makeShareCode((n) => Uint8Array.from(bytes.slice(0, n)));
    expect(code.startsWith("AAB")).toBe(true);
  });

  it("are read from a pasted link or a typed code", () => {
    expect(codeFromInput("https://rememba-one.vercel.app/shared?code=ABCDEFGHJKMN")).toBe("ABCDEFGHJKMN");
    expect(codeFromInput("abcd efgh jkmn")).toBe("ABCDEFGHJKMN");
    expect(codeFromInput("ABCD-EFGH-JKMN")).toBe("ABCDEFGHJKMN");
    expect(codeFromInput("hello")).toBeNull();
    expect(codeFromInput("ABCDEFGHJKM0")).toBeNull(); // 0 is never used
  });

  it("make a link and a message to send", () => {
    const link = shareLink("https://rememba-one.vercel.app/", "ABCDEFGHJKMN");
    expect(link).toBe("https://rememba-one.vercel.app/shared?code=ABCDEFGHJKMN");
    expect(shareMessage("Biology", 1, link)).toContain('"Biology" (1 card)');
    expect(shareMessage("Biology", 12, link)).toContain("(12 cards)");
  });
});

describe("the shared copy", () => {
  const cards = [card("2", "bio", "Stomata", "Pores", 2, ["exam"]), card("1", "bio", "Chlorophyll", "Green pigment", 1), card("3", "maths", "2 + 2", "4", 3)];

  it("has only that deck's words and tags, in order, never the progress", () => {
    expect(sharedCards(cards, "bio")).toEqual([
      { front: "Chlorophyll", back: "Green pigment", tags: [] },
      { front: "Stomata", back: "Pores", tags: ["exam"] },
    ]);
  });

  it(`stops at ${MAX_SHARED_CARDS} cards`, () => {
    const many = Array.from({ length: MAX_SHARED_CARDS + 5 }, (_, i) => card(String(i), "big", `Q${i}`, `A${i}`, i));
    expect(sharedCards(many, "big")).toHaveLength(MAX_SHARED_CARDS);
  });

  it("knows when the deck has changed since it was shared", () => {
    const shared = { name: "Biology", cards: sharedCards(cards, "bio") };
    expect(sharedIsOutOfDate(shared, { id: "bio", name: "Biology" }, cards)).toBe(false);
    expect(sharedIsOutOfDate(shared, { id: "bio", name: "Biology 101" }, cards)).toBe(true);
    const edited = cards.map((c) => (c.id === "2" ? { ...c, back: "Tiny pores" } : c));
    expect(sharedIsOutOfDate(shared, { id: "bio", name: "Biology" }, edited)).toBe(true);
  });
});

describe("opening a shared deck", () => {
  it("reads a good one", () => {
    const shared = readShared("ABCDEFGHJKMN", { name: "Biology", colour: "#16a34a", ownerName: "Ammara", createdBy: "u1", cards: [{ front: "Q", back: "A", tags: ["exam"] }], updatedAt: 5 });
    expect(shared).toEqual({ code: "ABCDEFGHJKMN", name: "Biology", colour: "#16a34a", ownerName: "Ammara", createdBy: "u1", cards: [{ front: "Q", back: "A", tags: ["exam"] }], updatedAt: 5 });
  });

  it("drops broken cards and fixes odd values instead of breaking the page", () => {
    const shared = readShared("ABCDEFGHJKMN", { name: "Maths", colour: "red; background: url(x)", cards: [{ front: "Q" }, null, { front: "1+1", back: "2", tags: "x" }] });
    expect(shared?.cards).toEqual([{ front: "1+1", back: "2", tags: [] }]);
    expect(shared?.colour).toBe("#4f46e5");
    expect(shared?.ownerName).toBe("Someone");
  });

  it("gives up on something that isn't a deck", () => {
    expect(readShared("ABCDEFGHJKMN", null)).toBeNull();
    expect(readShared("ABCDEFGHJKMN", { name: " ", cards: [] })).toBeNull();
    expect(readShared("ABCDEFGHJKMN", { name: "No cards list" })).toBeNull();
  });
});
