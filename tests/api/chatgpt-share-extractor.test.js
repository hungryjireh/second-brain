import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  extractChatGptShareConversation,
  stripTagsToMarkdown,
  writeChatGptShareConversationFile,
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

test("extractChatGptShareConversation attaches estuary URL to assistant image messages", () => {
  const html = fs.readFileSync("sample/chatgpt/sample_chat_2.txt", "utf8");
  const estuaryUrl =
    "https://chatgpt.com/backend-api/estuary/content?id=file_0000000080f07207adb8508ee31a1d92&ts=494245&p=fs&cid=1&sig=d57f74aa7b64941a36b4ab41b9fb7be7204658e2eb7759ce82111de43e2b1893&v=0";
  const payload = extractChatGptShareConversation(html, {
    estuaryUrls: [estuaryUrl],
  });
  const messages = payload[0].chat_messages;
  const imageMessage = messages.find((message) =>
    message.files.some(
      (file) => file.id === "file_0000000080f07207adb8508ee31a1d92",
    ),
  );

  assert.equal(Boolean(imageMessage), true);
  const imageFile = imageMessage.files.find(
    (file) => file.id === "file_0000000080f07207adb8508ee31a1d92",
  );
  assert.equal(Boolean(imageFile), true);
  assert.equal(imageFile.url, estuaryUrl);
});

test("extractChatGptShareConversation matches backend-anon file download URLs by file id in path", () => {
  const html = fs.readFileSync("sample/chatgpt/sample_chat_2.txt", "utf8");
  const estuaryUrl =
    "https://chatgpt.com/backend-anon/files/download/file_0000000080f07207adb8508ee31a1d92?shared_conversation_id=6a0db525-3a40-83ec-aed6-2917e4c81963&inline=false";
  const payload = extractChatGptShareConversation(html, {
    estuaryUrls: [estuaryUrl],
  });
  const imageMessage = payload[0].chat_messages.find((message) =>
    message.files.some(
      (file) => file.id === "file_0000000080f07207adb8508ee31a1d92",
    ),
  );

  assert.equal(Boolean(imageMessage), true);
  const imageFile = imageMessage.files.find(
    (file) => file.id === "file_0000000080f07207adb8508ee31a1d92",
  );
  assert.equal(Boolean(imageFile), true);
  assert.equal(imageFile.url, estuaryUrl);
});

test("writeChatGptShareConversationFile writes estuary URLs into output JSON", () => {
  const inputPath = "sample/chatgpt/sample_chat_2.txt";
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "chatgpt-share-extractor-"),
  );
  const outputPath = path.join(tempDir, "conversation.json");
  const estuaryUrls = [
    "https://chatgpt.com/backend-anon/files/download/file_0000000080f07207adb8508ee31a1d92?shared_conversation_id=6a0db525-3a40-83ec-aed6-2917e4c81963&inline=false",
    "https://chatgpt.com/backend-anon/files/download/file_0000000096087207b95f139e192ab7dd?shared_conversation_id=6a0db525-3a40-83ec-aed6-2917e4c81963&inline=false",
  ];

  try {
    writeChatGptShareConversationFile(inputPath, outputPath, { estuaryUrls });
    const writtenPayload = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    const messageUrls = writtenPayload[0].chat_messages.flatMap((message) =>
      message.files.map((file) => file.url),
    );

    assert.equal(messageUrls.includes(estuaryUrls[0]), true);
    assert.equal(messageUrls.includes(estuaryUrls[1]), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
