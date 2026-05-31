import { render } from "@testing-library/react-native";

const mockParseThoughtBlocks = jest.fn((value) => [
  { text: String(value || ""), isQuote: false },
]);

jest.mock("../../utils/openBrainThoughtText", () => ({
  normalizeThoughtText: (value) => String(value || "").trim(),
  parseThoughtBlocks: (...args) => mockParseThoughtBlocks(...args),
}));

import OpenBrainThoughtCard from "../OpenBrainThoughtCard";

describe("OpenBrainThoughtCard parse cache", () => {
  beforeEach(() => {
    mockParseThoughtBlocks.mockClear();
  });

  it("reuses cached parsed blocks for identical text across component instances", () => {
    const thoughtText = "cacheable thought text";
    const first = render(
      <OpenBrainThoughtCard text={thoughtText} topMeta="Top" />,
    );

    expect(mockParseThoughtBlocks).toHaveBeenCalledTimes(1);

    first.unmount();
    render(<OpenBrainThoughtCard text={thoughtText} topMeta="Top" />);

    expect(mockParseThoughtBlocks).toHaveBeenCalledTimes(1);
  });
});
