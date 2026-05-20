import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  extractChatGptShareConversation,
  stripTagsToMarkdown,
} from "../../lib/extract-chatgpt-share-html.js";

test("stripTagsToMarkdown converts relevant HTML blocks to Markdown", () => {
  const html = `
    <h2>Comparison</h2>
    <p>This is a <strong>bold</strong> and <em>italic</em> and <u>underline</u> and <code>code</code> and <a href="https://example.com">link</a>.</p>
    <blockquote><p>Quoted text</p></blockquote>
    <ul><li>one</li><li>two</li></ul>
    <ol><li>first</li><li>second</li></ol>
    <table>
      <tr><th>Feature</th><th>A</th><th>B</th></tr>
      <tr><td>Seat</td><td>19</td><td>18</td></tr>
    </table>
    <pre><code>const x = 1;</code></pre>
  `;

  const text = stripTagsToMarkdown(html);
  assert.match(text, /## Comparison/);
  assert.match(text, /\*\*bold\*\*/);
  assert.match(text, /\*italic\*/);
  assert.match(text, /__underline__/);
  assert.match(text, /`code`/);
  assert.match(text, /\[link\]\(https:\/\/example\.com\)/);
  assert.match(text, /> Quoted text/);
  assert.match(text, /- one/);
  assert.match(text, /- two/);
  assert.match(text, /1\. first/);
  assert.match(text, /2\. second/);
  assert.match(text, /\|\s+Feature\s+\|\s+A\s+\|\s+B\s+\|/);
  assert.match(text, /\| --- \| --- \| --- \|/);
  assert.match(text, /```[\s\S]*const x = 1;[\s\S]*```/);
});

test("extractChatGptShareConversation returns Claude-like payload with messages", () => {
  const html = `
    <html>
      <head><title>Sample Conversation</title></head>
      <body>
        "create_time",1779256972.371769
        "update_time",1779256975.248884
        <a href="https://chatgpt.com/share/6a0d4e8c-5ce0-83ec-baae-fac16aeb19db">share</a>
        <div data-message-author-role="user" data-message-id="m1"><p>Hello</p></div>
        <div data-message-author-role="assistant" data-message-id="m2">
          <h3>Answer</h3>
          <ul><li>Item A</li><li>Item B</li></ul>
        </div>
      </body>
    </html>
  `;

  const payload = extractChatGptShareConversation(html);
  assert.equal(Array.isArray(payload), true);
  assert.equal(payload.length, 1);
  assert.equal(payload[0].uuid, "6a0d4e8c-5ce0-83ec-baae-fac16aeb19db");
  assert.equal(payload[0].name, "Sample Conversation");
  assert.equal(payload[0].chat_messages.length, 2);
  assert.equal(payload[0].chat_messages[0].sender, "human");
  assert.equal(payload[0].chat_messages[1].sender, "assistant");
  assert.match(payload[0].chat_messages[1].text, /### Answer/);
  assert.match(payload[0].chat_messages[1].text, /- Item A/);
});

test("extractChatGptShareConversation preserves sequence for image responses", () => {
  const html = fs.readFileSync("sample/chatgpt/sample_chat_2.txt", "utf8");
  const payload = extractChatGptShareConversation(html);
  const messages = payload[0].chat_messages;
  const texts = messages.map((message) => message.text);

  assert.equal(
    texts.includes("Generated image: Silent connection across the void"),
    true,
  );
  const firstUserPromptIndex = texts.findIndex((text) =>
    text.startsWith("generate a GIF based on this poem:"),
  );
  const imageResponseIndex = texts.findIndex(
    (text) => text === "Generated image: Silent connection across the void",
  );
  const secondUserPromptIndex = texts.findIndex(
    (text) => text === "too creepy. the idea is a strong sense of longing",
  );

  assert.equal(firstUserPromptIndex >= 0, true);
  assert.equal(imageResponseIndex > firstUserPromptIndex, true);
  assert.equal(secondUserPromptIndex > imageResponseIndex, true);
});
