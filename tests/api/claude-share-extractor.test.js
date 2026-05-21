import assert from "node:assert/strict";
import test from "node:test";

import { extractClaudeShareConversation } from "../../lib/extract-claude-share-html.js";

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
