import assert from "node:assert/strict";
import test from "node:test";

import {
  importLlmConversationsAsEntries,
  parseClaudeConversationsImport,
} from "../../lib/api/second-brain/llm-conversation-import.js";

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return body === null ? "" : JSON.stringify(body);
    },
  };
}

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

test("importLlmConversationsAsEntries applies classifier output", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";
  process.env.GROQ_API_KEY = "test-key";

  const tagsTable = [];
  const entryTagsTable = [];
  let createdEntryBody = null;
  let nextTagId = 1;

  global.fetch = async (input, options = {}) => {
    const method = options.method || "GET";
    const url = new URL(String(input));
    const path = url.pathname;
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (path === "/rest/v1/entries" && method === "POST") {
      createdEntryBody = body?.[0] ?? null;
      return jsonResponse(201, [
        {
          id: 1001,
          user_id: createdEntryBody.user_id,
          category: createdEntryBody.category,
          title: createdEntryBody.title,
          summary: createdEntryBody.summary,
          raw_text: createdEntryBody.raw_text,
          remind_at: createdEntryBody.remind_at,
          created_at: 1779256972,
          updated_at: 1779256975,
        },
      ]);
    }

    if (path === "/rest/v1/entry_tags" && method === "DELETE") {
      return jsonResponse(204, null);
    }

    if (path === "/rest/v1/tags" && method === "POST") {
      const row = body?.[0] ?? {};
      const exists = tagsTable.some(
        (tag) =>
          tag.user_id === row.user_id &&
          tag.normalized_name === row.normalized_name,
      );
      if (!exists) {
        tagsTable.push({
          id: nextTagId++,
          user_id: row.user_id,
          name: row.name,
          normalized_name: row.normalized_name,
        });
      }
      return jsonResponse(201, null);
    }

    if (path === "/rest/v1/tags" && method === "GET") {
      const userId = (url.searchParams.get("user_id") || "").replace("eq.", "");
      const normalizedIn = url.searchParams.get("normalized_name") || "";
      if (!normalizedIn) {
        return jsonResponse(
          200,
          tagsTable.filter((tag) => tag.user_id === userId),
        );
      }
      const values = normalizedIn
        .replace(/^in\.\(/, "")
        .replace(/\)$/, "")
        .split(",")
        .map((value) => value.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
      return jsonResponse(
        200,
        tagsTable.filter(
          (tag) =>
            tag.user_id === userId && values.includes(tag.normalized_name),
        ),
      );
    }

    if (path === "/rest/v1/entry_tags" && method === "POST") {
      for (const row of body ?? []) {
        entryTagsTable.push({
          user_id: row.user_id,
          entry_id: row.entry_id,
          tag_id: row.tag_id,
        });
      }
      return jsonResponse(201, null);
    }

    if (path === "/rest/v1/entry_tags" && method === "GET") {
      const entryId = Number(
        (url.searchParams.get("entry_id") || "").replace("eq.", ""),
      );
      const rows = entryTagsTable
        .filter((row) => row.entry_id === entryId)
        .map((row) => {
          const tag = tagsTable.find((t) => t.id === row.tag_id);
          return {
            tags: tag
              ? { name: tag.name, normalized_name: tag.normalized_name }
              : null,
          };
        });
      return jsonResponse(200, rows);
    }

    if (path === "/rest/v1/tags" && method === "DELETE") {
      return jsonResponse(204, null);
    }

    throw new Error(`Unhandled fetch: ${method} ${path}`);
  };

  try {
    const created = await importLlmConversationsAsEntries({
      userId: "11111111-1111-4111-8111-111111111111",
      authToken: "token",
      conversations: [
        {
          uuid: "conversation-1",
          name: "Import Me",
          chat_messages: [{ sender: "human", text: "Need to call mom at 5pm" }],
        },
      ],
      classifyFn: async () => ({
        category: "reminder",
        title: "Call Mom",
        summary: "Remember to call mom at 5pm",
        remind_at: 1779258000,
        tags: ["family", "calls"],
      }),
    });

    assert.equal(Array.isArray(created), true);
    assert.equal(created.length, 1);
    assert.equal(createdEntryBody.category, "reminder");
    assert.equal(createdEntryBody.title, "Call Mom");
    assert.equal(createdEntryBody.summary, "Remember to call mom at 5pm");
    assert.equal(createdEntryBody.remind_at, 1779258000);
    const linkedTagIds = entryTagsTable
      .filter((row) => row.entry_id === 1001)
      .map((row) => row.tag_id);
    const linkedNormalizedTags = tagsTable
      .filter((tag) => linkedTagIds.includes(tag.id))
      .map((tag) => tag.normalized_name)
      .sort();
    assert.deepEqual(linkedNormalizedTags, ["calls", "family"]);
  } finally {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.GROQ_API_KEY = originalEnv.GROQ_API_KEY;
  }
});

test("importLlmConversationsAsEntries falls back when classifier fails", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";
  process.env.GROQ_API_KEY = "test-key";

  let createdEntryBody = null;
  const tagsTable = [];
  const entryTagsTable = [];
  let nextTagId = 1;

  global.fetch = async (input, options = {}) => {
    const method = options.method || "GET";
    const url = new URL(String(input));
    const path = url.pathname;
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (path === "/rest/v1/entries" && method === "POST") {
      createdEntryBody = body?.[0] ?? null;
      return jsonResponse(201, [
        {
          id: 1002,
          user_id: createdEntryBody.user_id,
          category: createdEntryBody.category,
          title: createdEntryBody.title,
          summary: createdEntryBody.summary,
          raw_text: createdEntryBody.raw_text,
          remind_at: createdEntryBody.remind_at,
          created_at: 1779256972,
          updated_at: 1779256975,
        },
      ]);
    }

    if (path === "/rest/v1/entry_tags" && method === "DELETE") {
      return jsonResponse(204, null);
    }

    if (path === "/rest/v1/tags" && method === "POST") {
      const row = body?.[0] ?? {};
      const exists = tagsTable.some(
        (tag) =>
          tag.user_id === row.user_id &&
          tag.normalized_name === row.normalized_name,
      );
      if (!exists) {
        tagsTable.push({
          id: nextTagId++,
          user_id: row.user_id,
          name: row.name,
          normalized_name: row.normalized_name,
        });
      }
      return jsonResponse(201, null);
    }

    if (path === "/rest/v1/tags" && method === "GET") {
      const userId = (url.searchParams.get("user_id") || "").replace("eq.", "");
      const normalizedIn = url.searchParams.get("normalized_name") || "";
      if (!normalizedIn) {
        return jsonResponse(
          200,
          tagsTable.filter((tag) => tag.user_id === userId),
        );
      }
      const values = normalizedIn
        .replace(/^in\.\(/, "")
        .replace(/\)$/, "")
        .split(",")
        .map((value) => value.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
      return jsonResponse(
        200,
        tagsTable.filter(
          (tag) =>
            tag.user_id === userId && values.includes(tag.normalized_name),
        ),
      );
    }

    if (path === "/rest/v1/entry_tags" && method === "POST") {
      for (const row of body ?? []) {
        entryTagsTable.push({
          user_id: row.user_id,
          entry_id: row.entry_id,
          tag_id: row.tag_id,
        });
      }
      return jsonResponse(201, null);
    }

    if (path === "/rest/v1/entry_tags" && method === "GET") {
      const entryId = Number(
        (url.searchParams.get("entry_id") || "").replace("eq.", ""),
      );
      const rows = entryTagsTable
        .filter((row) => row.entry_id === entryId)
        .map((row) => {
          const tag = tagsTable.find((t) => t.id === row.tag_id);
          return {
            tags: tag
              ? { name: tag.name, normalized_name: tag.normalized_name }
              : null,
          };
        });
      return jsonResponse(200, rows);
    }

    if (path === "/rest/v1/tags" && method === "DELETE") {
      return jsonResponse(204, null);
    }

    throw new Error(`Unhandled fetch: ${method} ${path}`);
  };

  try {
    await importLlmConversationsAsEntries({
      userId: "11111111-1111-4111-8111-111111111111",
      authToken: "token",
      conversations: [
        {
          id: "chatgpt-conversation-1",
          title: "Trip planning ideas",
          create_time: 1779256972,
          update_time: 1779256975,
          messages: [{ author: "user", text: "Ideas for Kyoto trip" }],
        },
      ],
      classifyFn: async () => {
        throw new Error("classifier unavailable");
      },
    });

    assert.equal(createdEntryBody.category, "note");
    assert.equal(createdEntryBody.remind_at, null);
    const linkedTagIds = entryTagsTable
      .filter((row) => row.entry_id === 1002)
      .map((row) => row.tag_id);
    const linkedNormalizedTags = tagsTable
      .filter((tag) => linkedTagIds.includes(tag.id))
      .map((tag) => tag.normalized_name)
      .sort();
    assert.deepEqual(linkedNormalizedTags, ["chatgpt", "imported"]);
  } finally {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.GROQ_API_KEY = originalEnv.GROQ_API_KEY;
  }
});
