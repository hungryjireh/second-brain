import { render } from '@testing-library/react-native';
import SecondBrainMarkdownBody from '../SecondBrainMarkdownBody';

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
};

describe('SecondBrainMarkdownBody', () => {
  it('renders heading, inline markdown, lists, quotes, and code blocks', () => {
    const text = [
      '# Heading',
      'Plain **bold** __underlined__ *italic* `code` [link](https://example.com)',
      '- One',
      '- Two',
      '1. First',
      '2. Second',
      '> Quoted line',
      '```',
      'const x = 1;',
      '```',
    ].join('\n');

    const { getByText } = render(<SecondBrainMarkdownBody text={text} styles={styles} />);

    expect(getByText('Heading')).toBeTruthy();
    expect(getByText('bold')).toBeTruthy();
    expect(getByText('underlined')).toBeTruthy();
    expect(getByText('italic')).toBeTruthy();
    expect(getByText('code')).toBeTruthy();
    expect(getByText('link')).toBeTruthy();
    expect(getByText('One')).toBeTruthy();
    expect(getByText('Two')).toBeTruthy();
    expect(getByText('First')).toBeTruthy();
    expect(getByText('Second')).toBeTruthy();
    expect(getByText('Quoted line')).toBeTruthy();
    expect(getByText('const x = 1;')).toBeTruthy();
  });
});
