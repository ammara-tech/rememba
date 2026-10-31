import { describe, expect, it } from "vitest";
import { MAX_SIDE, csvFields, parseCards, parseFile, parseNotes, splitLine } from "@/lib/importer";
import { SAMPLES } from "@/lib/samples";

describe("pasting cards in", () => {
  it.each([
    ["Hello - Hallo", "Hello", "Hallo"],
    ["Thank you = Dankie", "Thank you", "Dankie"],
    ["Please\tAsseblief", "Please", "Asseblief"],
    ["Good morning; Goeie môre", "Good morning", "Goeie môre"],
  ])("%s → %s / %s", (line, front, back) => {
    expect(splitLine(line)).toEqual({ front, back });
  });

  it("prefers a Tab (from a spreadsheet) over a dash inside the text", () => {
    expect(splitLine("e-mail address\tE-posadres")).toEqual({ front: "e-mail address", back: "E-posadres" });
  });

  it("skips lines it can't split, and counts them", () => {
    expect(parseCards("Hello - Hallo\n\njust a line\n - no front\nYes = Ja")).toEqual({
      cards: [
        { front: "Hello", back: "Hallo" },
        { front: "Yes", back: "Ja" },
      ],
      skipped: 2,
    });
  });

  it("keeps each side to a sensible length", () => {
    expect(splitLine(`${"a".repeat(900)} - b`)!.front).toHaveLength(MAX_SIDE);
  });
});

describe("turning study notes into cards", () => {
  it("reads 'Term: meaning' lines, bullets, numbered lists and Q/A pairs, and leaves out headings", () => {
    const notes = [
      "# Chapter 3: Plants",
      "Photosynthesis:",
      "- Chlorophyll: the green pigment that captures light",
      "2. Stomata – tiny pores that let gases in and out",
      "Q: What gas do plants give off?",
      "A: Oxygen",
      "Just a sentence with no meaning split",
    ].join("\n");
    expect(parseNotes(notes)).toEqual({
      cards: [
        { front: "Chlorophyll", back: "the green pigment that captures light" },
        { front: "Stomata", back: "tiny pores that let gases in and out" },
        { front: "What gas do plants give off?", back: "Oxygen" },
      ],
      skipped: 1,
    });
  });
});

describe("importing a file", () => {
  it("reads an Anki text export: Tab-separated, with # header lines and HTML", () => {
    const anki = "#separator:tab\n#html:true\nHello\tHallo<br>(informal)\nBread\t<b>Brood</b>\n";
    expect(parseFile("Afrikaans.txt", anki).cards).toEqual([
      { front: "Hello", back: "Hallo\n(informal)" },
      { front: "Bread", back: "Brood" },
    ]);
  });

  it("reads a CSV spreadsheet, with quotes and a header row", () => {
    const csv = 'Front,Back\n"Capital of SA, legislative",Cape Town\nTshwane,"Pretoria, the ""administrative"" capital"\nonly one column\n';
    expect(parseFile("capitals.csv", csv)).toEqual({
      cards: [
        { front: "Capital of SA, legislative", back: "Cape Town" },
        { front: "Tshwane", back: 'Pretoria, the "administrative" capital' },
      ],
      skipped: 1,
    });
    expect(csvFields('a,"b,c",""')).toEqual(["a", "b,c", ""]);
  });
});

describe("the sample decks", () => {
  it("each have a name, a colour and 12 complete cards", () => {
    for (const s of SAMPLES) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.colour).toMatch(/^#[0-9a-f]{6}$/);
      expect(s.cards).toHaveLength(12);
      for (const c of s.cards) {
        expect(c.front.length).toBeGreaterThan(0);
        expect(c.back.length).toBeGreaterThan(0);
        expect(c.front.length).toBeLessThanOrEqual(MAX_SIDE);
      }
    }
  });
});
