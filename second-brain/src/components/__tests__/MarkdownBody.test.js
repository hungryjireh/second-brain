import { fireEvent, render } from "@testing-library/react-native";
import { Linking } from "react-native";
import MarkdownBody from "../MarkdownBody";

const styles = {
  markdownBody: {},
  markdownParagraph: {},
  markdownHeading: {},
  markdownBold: {},
  markdownUnderline: {},
  markdownItalic: {},
  markdownCode: {},
  markdownLink: {},
  markdownCodeBlock: {},
  markdownCodeScrollContent: {},
  markdownCodeBlockText: {},
  markdownList: {},
  markdownListItem: {},
  markdownListBullet: {},
  markdownQuote: {},
  markdownQuoteText: {},
  markdownTableWrap: {},
  markdownTable: {},
  markdownTableRow: {},
  markdownTableHeaderRow: {},
  markdownTableCell: {},
  markdownTableHeaderCell: {},
  markdownTableHeaderText: {},
  markdownTableText: {},
};

describe("MarkdownBody", () => {
  it("renders heading, inline markdown, lists, quotes, code blocks, and tables", () => {
    const text = [
      "# Heading",
      "Plain **bold** __underlined__ *italic* `code` [link](https://example.com)",
      "| Name | Score |",
      "| --- | --- |",
      "| Alice | 10 |",
      "| Bob | 8 |",
      "- One",
      "- Two",
      "1. First",
      "2. Second",
      "> Quoted line",
      "```",
      "const x = 1;",
      "```",
    ].join("\n");

    const { getByText } = render(<MarkdownBody text={text} styles={styles} />);

    expect(getByText("Heading")).toBeTruthy();
    expect(getByText("bold")).toBeTruthy();
    expect(getByText("underlined")).toBeTruthy();
    expect(getByText("italic")).toBeTruthy();
    expect(getByText("code")).toBeTruthy();
    expect(getByText("link")).toBeTruthy();
    expect(getByText("Name")).toBeTruthy();
    expect(getByText("Score")).toBeTruthy();
    expect(getByText("Alice")).toBeTruthy();
    expect(getByText("10")).toBeTruthy();
    expect(getByText("One")).toBeTruthy();
    expect(getByText("Two")).toBeTruthy();
    expect(getByText("First")).toBeTruthy();
    expect(getByText("Second")).toBeTruthy();
    expect(getByText("Quoted line")).toBeTruthy();
    expect(getByText("const x = 1;")).toBeTruthy();
  });

  it("renders attachment links from fileUrls", () => {
    const { getByText } = render(
      <MarkdownBody
        text="Generated image: sample"
        fileUrls={["https://example.com/file-a.png"]}
        styles={styles}
      />,
    );

    expect(getByText("Attachments:")).toBeTruthy();
    expect(getByText("Attachment 1")).toBeTruthy();
  });

  it("opens URLs when markdown links are pressed", () => {
    const openUrlSpy = jest
      .spyOn(Linking, "openURL")
      .mockResolvedValue(undefined);
    const { getByText } = render(
      <MarkdownBody text="[Open](https://example.com/path)" styles={styles} />,
    );

    fireEvent.press(getByText("Open"));
    expect(openUrlSpy).toHaveBeenCalledWith("https://example.com/path");
    openUrlSpy.mockRestore();
  });

  it("opens bare URLs when pressed", () => {
    const openUrlSpy = jest
      .spyOn(Linking, "openURL")
      .mockResolvedValue(undefined);
    const { getByText } = render(
      <MarkdownBody text="Visit https://example.com/bare" styles={styles} />,
    );

    fireEvent.press(getByText("https://example.com/bare"));
    expect(openUrlSpy).toHaveBeenCalledWith("https://example.com/bare");
    openUrlSpy.mockRestore();
  });

  it("opens multiple links in one paragraph", () => {
    const openUrlSpy = jest
      .spyOn(Linking, "openURL")
      .mockResolvedValue(undefined);
    const { getByText } = render(
      <MarkdownBody
        text="Links: [One](https://example.com/1) and https://example.com/2"
        styles={styles}
      />,
    );

    fireEvent.press(getByText("One"));
    fireEvent.press(getByText("https://example.com/2"));
    expect(openUrlSpy).toHaveBeenNthCalledWith(1, "https://example.com/1");
    expect(openUrlSpy).toHaveBeenNthCalledWith(2, "https://example.com/2");
    openUrlSpy.mockRestore();
  });

  it("renders links with accessibility role", () => {
    const { getByText } = render(
      <MarkdownBody text="[Open](https://example.com/path)" styles={styles} />,
    );

    expect(getByText("Open").props.accessibilityRole).toBe("link");
  });

  it("opens attachment links generated from fileUrls", () => {
    const openUrlSpy = jest
      .spyOn(Linking, "openURL")
      .mockResolvedValue(undefined);
    const { getByText } = render(
      <MarkdownBody
        text="Generated image: sample"
        fileUrls={["https://example.com/file-a.png"]}
        styles={styles}
      />,
    );

    fireEvent.press(getByText("Attachment 1"));
    expect(openUrlSpy).toHaveBeenCalledWith("https://example.com/file-a.png");
    openUrlSpy.mockRestore();
  });
});
