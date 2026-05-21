import assert from "node:assert/strict";
import test from "node:test";

import { parseClaudeConversationsImport } from "../../lib/llm-conversation-import.js";

test("parseClaudeConversationsImport preserves message files and URLs", () => {
  const source = [
    {
      uuid: "conversation-1",
      name: "Imported ChatGPT conversation",
      chat_messages: [
        {
          uuid: "m1",
          sender: "assistant",
          text: "Generated image: sample",
          files: [
            {
              id: "file_abc",
              kind: "image",
              source: "chatgpt_estuary",
              url: "https://chatgpt.com/backend-anon/files/download/file_abc?inline=false",
            },
          ],
        },
      ],
    },
  ];

  const parsed = parseClaudeConversationsImport(source);
  assert.equal(parsed.length, 1);

  const rawPayload = JSON.parse(parsed[0].raw_text);
  assert.equal(Array.isArray(rawPayload.messages), true);
  assert.equal(Array.isArray(rawPayload.messages[0].files), true);
  assert.equal(rawPayload.messages[0].files[0].id, "file_abc");
  assert.equal(
    rawPayload.messages[0].files[0].url,
    "https://chatgpt.com/backend-anon/files/download/file_abc?inline=false",
  );
});
