import { ScrollView, Text, View } from 'react-native';

function renderInlineMarkdown(text) {
  const source = String(text ?? '');
  const segments = [];
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) segments.push({ key: `text-${match.index}`, type: 'text', text: source.slice(lastIndex, match.index) });
    if (match[2] && match[3]) segments.push({ key: `link-${match.index}`, type: 'link', text: match[2] });
    else if (match[4]) segments.push({ key: `bold-${match.index}`, type: 'bold', text: match[4] });
    else if (match[5]) segments.push({ key: `underline-${match.index}`, type: 'underline', text: match[5] });
    else if (match[6]) segments.push({ key: `italic-${match.index}`, type: 'italic', text: match[6] });
    else if (match[7]) segments.push({ key: `code-${match.index}`, type: 'code', text: match[7] });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < source.length) segments.push({ key: `text-end-${lastIndex}`, type: 'text', text: source.slice(lastIndex) });
  return segments;
}

function MarkdownText({ text, style, styles }) {
  const segments = renderInlineMarkdown(text);
  return (
    <Text style={style}>
      {segments.map(segment => {
        if (segment.type === 'bold') return <Text key={segment.key} style={styles.markdownBold}>{segment.text}</Text>;
        if (segment.type === 'underline') return <Text key={segment.key} style={styles.markdownUnderline}>{segment.text}</Text>;
        if (segment.type === 'italic') return <Text key={segment.key} style={styles.markdownItalic}>{segment.text}</Text>;
        if (segment.type === 'code') return <Text key={segment.key} style={styles.markdownCode}>{segment.text}</Text>;
        if (segment.type === 'link') return <Text key={segment.key} style={styles.markdownLink}>{segment.text}</Text>;
        return <Text key={segment.key}>{segment.text}</Text>;
      })}
    </Text>
  );
}

export default function SecondBrainMarkdownBody({ text, styles }) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(
        <View key={`code-${i}`} style={styles.markdownCodeBlock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.markdownCodeScrollContent}>
            <Text style={styles.markdownCodeBlockText}>{codeLines.join('\n')}</Text>
          </ScrollView>
        </View>
      );
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push(<MarkdownText key={`heading-${i}`} text={heading[2]} style={[styles.markdownParagraph, styles.markdownHeading]} styles={styles} />);
      i += 1;
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      const items = [];
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^[-*]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        i += 1;
      }
      blocks.push(
        <View key={`ul-${i}`} style={styles.markdownList}>
          {items.map((item, idx) => (
            <View key={`li-${i}-${idx}`} style={styles.markdownListItem}>
              <Text style={styles.markdownListBullet}>•</Text>
              <MarkdownText text={item} style={styles.markdownParagraph} styles={styles} />
            </View>
          ))}
        </View>
      );
      continue;
    }
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      const items = [];
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^\d+\.\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        i += 1;
      }
      blocks.push(
        <View key={`ol-${i}`} style={styles.markdownList}>
          {items.map((item, idx) => (
            <View key={`oli-${i}-${idx}`} style={styles.markdownListItem}>
              <Text style={styles.markdownListBullet}>{idx + 1}.</Text>
              <MarkdownText text={item} style={styles.markdownParagraph} styles={styles} />
            </View>
          ))}
        </View>
      );
      continue;
    }
    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      const quoteLines = [];
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^>\s?(.+)$/);
        if (!itemMatch) break;
        quoteLines.push(itemMatch[1]);
        i += 1;
      }
      blocks.push(
        <View key={`quote-${i}`} style={styles.markdownQuote}>
          <MarkdownText text={quoteLines.join('\n')} style={[styles.markdownParagraph, styles.markdownQuoteText]} styles={styles} />
        </View>
      );
      continue;
    }
    blocks.push(<MarkdownText key={`p-${i}`} text={line} style={styles.markdownParagraph} styles={styles} />);
    i += 1;
  }
  return <View style={styles.markdownBody}>{blocks}</View>;
}
