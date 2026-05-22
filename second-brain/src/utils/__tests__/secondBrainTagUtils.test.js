import { parseTagInput } from "../secondBrainTagUtils";

describe("parseTagInput", () => {
  it("does not cap parsed tags at three", () => {
    expect(parseTagInput("one,two,three,four,five")).toEqual([
      "one",
      "two",
      "three",
      "four",
      "five",
    ]);
  });

  it("normalizes and deduplicates while preserving first-seen order", () => {
    expect(parseTagInput(" Work,work, personal-note, #focus , focus")).toEqual([
      "work",
      "personalnote",
      "focus",
    ]);
  });
});
