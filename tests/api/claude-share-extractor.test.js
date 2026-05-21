import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  extractClaudeShareConversation,
  writeClaudeShareConversationFile,
} from "../../lib/extract-claude-share-html.js";

test("extractClaudeShareConversation uses Claude share id as conversation uuid", () => {
  const html = `
    <html>
      <head><title>Claude Share</title></head>
      <body>
        <a href="https://claude.ai/share/52cc8fea-93d2-4aa6-a820-e2b592558077">share</a>
        <div data-message-author-role="user" data-message-id="m1"><p>Hello</p></div>
        <div data-message-author-role="assistant" data-message-id="m2"><p>Hi there</p></div>
      </body>
    </html>
  `;

  const payload = extractClaudeShareConversation(html);
  assert.equal(Array.isArray(payload), true);
  assert.equal(payload.length, 1);
  assert.equal(payload[0].uuid, "52cc8fea-93d2-4aa6-a820-e2b592558077");
});

test("extractClaudeShareConversation extracts human message file thumbnails", () => {
  const html = `
    <html>
      <body>
        <a href="https://claude.ai/share/52cc8fea-93d2-4aa6-a820-e2b592558077">share</a>
        <h2 class="sr-only select-none">You said: review this file</h2>
        <div>
          <div data-testid="file-thumbnail">
            <div>
              <h3>playwright-script.js</h3>
              <div>JS</div>
            </div>
          </div>
          <div data-testid="user-message"><p>review this file</p></div>
        </div>
      </body>
    </html>
  `;

  const payload = extractClaudeShareConversation(html);
  assert.equal(payload.length, 1);
  assert.equal(payload[0].chat_messages.length, 1);
  assert.equal(payload[0].chat_messages[0].sender, "human");
  assert.equal(payload[0].chat_messages[0].files.length, 1);
  assert.equal(payload[0].chat_messages[0].files[0].kind, "document");
  assert.equal(payload[0].chat_messages[0].files[0].source, "claude_share");
});

test("extractClaudeShareConversation parses Claude message blocks with title and build timestamp", () => {
  const html = `
    <html data-build-timestamp="1779326613">
      <body>
        <a href="https://claude.ai/share/52cc8fea-93d2-4aa6-a820-e2b592558077">share</a>
        <div class="truncate text-text-300">Playwright review</div>
        <h2 class="sr-only select-none">You said: please review this</h2>
        <div>
          <div data-testid="user-message"><p>please review this</p></div>
        </div>
        <h2 class="sr-only select-none">Claude responded: Here is feedback</h2>
        <div>
          <div class="standard-markdown"><h3>Findings</h3><ul><li>A</li><li>B</li></ul></div>
        </div>
      </body>
    </html>
  `;

  const payload = extractClaudeShareConversation(html);
  assert.equal(payload.length, 1);
  assert.equal(payload[0].name, "Playwright review");
  assert.equal(payload[0].chat_messages.length, 2);
  assert.equal(payload[0].chat_messages[0].sender, "human");
  assert.equal(payload[0].chat_messages[1].sender, "assistant");
  assert.equal(payload[0].chat_messages[1].text, "Here is feedback");
  assert.equal(payload[0].created_at, "2026-05-21T01:23:33.000Z");
  assert.equal(payload[0].updated_at, "2026-05-21T01:23:33.000Z");
});

test("extractClaudeShareConversation falls back when Claude blocks are absent", () => {
  const html = `
    <html>
      <head><title>Fallback Claude</title></head>
      <body>
        "create_time",1779256972.371769
        "update_time",1779256975.248884
        <a href="https://claude.ai/share/52cc8fea-93d2-4aa6-a820-e2b592558077">share</a>
        <div data-message-author-role="user" data-message-id="m1"><p>Hello</p></div>
        <div data-message-author-role="assistant" data-message-id="m2"><p>Hi there</p></div>
      </body>
    </html>
  `;

  const payload = extractClaudeShareConversation(html);
  assert.equal(payload.length, 1);
  assert.equal(payload[0].uuid, "52cc8fea-93d2-4aa6-a820-e2b592558077");
  assert.equal(payload[0].name, "Fallback Claude");
  assert.equal(payload[0].chat_messages.length, 2);
});

test("writeClaudeShareConversationFile writes parsed payload to disk", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-share-"));
  const inputPath = path.join(tempDir, "input.html");
  const outputPath = path.join(tempDir, "output.json");
  const html = `
    <html data-build-timestamp="1779326613">
      <body>
        <a href="https://claude.ai/share/52cc8fea-93d2-4aa6-a820-e2b592558077">share</a>
        <div class="truncate text-text-300">Export test</div>
        <h2 class="sr-only select-none">You said: hello</h2>
        <div><div data-testid="user-message"><p>hello</p></div></div>
      </body>
    </html>
  `;
  fs.writeFileSync(inputPath, html);

  try {
    const payload = writeClaudeShareConversationFile(inputPath, outputPath);
    const writtenPayload = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    assert.equal(payload.length, 1);
    assert.equal(writtenPayload.length, 1);
    assert.equal(writtenPayload[0].name, "Export test");
    assert.equal(writtenPayload[0].chat_messages.length, 1);
    assert.equal(writtenPayload[0].chat_messages[0].text, "hello");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
