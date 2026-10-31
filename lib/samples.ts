import type { Pair } from "@/lib/importer";

/*
  Two ready-made decks, so a new user can try studying straight away.
  One for my own field, and one for South Africa.
*/

export type Sample = { name: string; colour: string; description: string; cards: Pair[] };

export const SAMPLES: Sample[] = [
  {
    name: "Web development basics",
    colour: "#3b4cca",
    description: "HTML, CSS, JavaScript, HTTP, SQL and Git in 12 cards",
    cards: [
      { front: "What does HTML stand for?", back: "HyperText Markup Language" },
      { front: "What does CSS stand for?", back: "Cascading Style Sheets" },
      { front: "Which HTTP status code means \"Not Found\"?", back: "404" },
      { front: "Which HTTP method is usually used to create something new?", back: "POST" },
      { front: "What does JSON stand for?", back: "JavaScript Object Notation" },
      { front: "In JavaScript, what's the difference between let and const?", back: "A const variable can't be given a new value; a let variable can" },
      { front: "In JavaScript, what does === check?", back: "That two values are equal and the same type, without converting either one" },
      { front: "What does API stand for?", back: "Application Programming Interface" },
      { front: "What does SQL stand for?", back: "Structured Query Language" },
      { front: "What is a primary key in a database table?", back: "A column whose value is unique for every row, so each row can be found exactly" },
      { front: "What does git commit do?", back: "Saves a snapshot of your staged changes to the project's history" },
      { front: "What does a CSS media query do?", back: "Applies styles only when a condition is true, such as a screen narrower than 640px" },
    ],
  },
  {
    name: "Everyday Afrikaans",
    colour: "#d4572e",
    description: "12 words and phrases you'll hear every day",
    cards: [
      { front: "Hello", back: "Hallo" },
      { front: "Thank you", back: "Dankie" },
      { front: "Please", back: "Asseblief" },
      { front: "Good morning", back: "Goeie môre" },
      { front: "How are you?", back: "Hoe gaan dit?" },
      { front: "Yes / No", back: "Ja / Nee" },
      { front: "Excuse me", back: "Verskoon my" },
      { front: "Today", back: "Vandag" },
      { front: "Tomorrow", back: "Môre" },
      { front: "Bread", back: "Brood" },
      { front: "Milk", back: "Melk" },
      { front: "Friend", back: "Vriend" },
    ],
  },
];

export const DECK_COLOURS = ["#3b4cca", "#d4572e", "#2f8f5b", "#b8860b", "#8e44ad", "#c2185b", "#00838f", "#5d4037"];
export const COLOUR_NAMES: Record<string, string> = {
  "#3b4cca": "Ink blue",
  "#d4572e": "Coral",
  "#2f8f5b": "Green",
  "#b8860b": "Mustard",
  "#8e44ad": "Purple",
  "#c2185b": "Pink",
  "#00838f": "Teal",
  "#5d4037": "Brown",
};
