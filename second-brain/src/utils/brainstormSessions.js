import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_PREFIX = "brainstorm:session:";
const ENTRY_LINK_PREFIX = "brainstorm:entry:";
const BRAINSTORM_SESSION_MODES = {
  TEXT: "text",
  TALK: "talk",
};

function buildSessionId() {
  return `brainstorm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function sessionKey(sessionId) {
  return `${SESSION_PREFIX}${sessionId}`;
}

function entryLinkKey(entryId) {
  return `${ENTRY_LINK_PREFIX}${String(entryId)}`;
}

function normalizeBrainstormMode(value) {
  return value === BRAINSTORM_SESSION_MODES.TALK
    ? BRAINSTORM_SESSION_MODES.TALK
    : BRAINSTORM_SESSION_MODES.TEXT;
}

function normalizeBrainstormMessage(message, fallbackRole = "user") {
  if (!message || typeof message !== "object") return null;
  const role = message.role === "assistant" ? "assistant" : fallbackRole;
  const content = String(message.content || "").trim();
  if (!content) return null;
  const createdAt = String(message.createdAt || "").trim() || nowIso();
  return {
    id: String(
      message.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ),
    role,
    content,
    createdAt,
  };
}

function normalizeBrainstormMessages(messages) {
  const source = Array.isArray(messages) ? messages : [];
  const normalized = [];
  for (const message of source) {
    const parsed = normalizeBrainstormMessage(message);
    if (parsed) normalized.push(parsed);
  }
  return normalized;
}

export function normalizeBrainstormSession(session) {
  if (!session || typeof session !== "object") return null;
  const normalizedCreatedAt =
    String(session.createdAt || "").trim() || nowIso();
  const normalizedUpdatedAt =
    String(session.updatedAt || "").trim() || normalizedCreatedAt;
  const normalizedMessages = normalizeBrainstormMessages(session.messages);
  return {
    ...session,
    id: String(session.id || buildSessionId()),
    mode: normalizeBrainstormMode(session.mode),
    lifecycle: String(session.lifecycle || "active"),
    createdAt: normalizedCreatedAt,
    updatedAt: normalizedUpdatedAt,
    entryId:
      session.entryId === null || session.entryId === undefined
        ? null
        : session.entryId,
    finalizeGuards: {
      ended: Boolean(session?.finalizeGuards?.ended),
      wipSaved: Boolean(session?.finalizeGuards?.wipSaved),
    },
    messages: normalizedMessages,
  };
}

export async function readBrainstormSession(sessionId) {
  if (!sessionId) return null;
  const raw = await AsyncStorage.getItem(sessionKey(sessionId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return normalizeBrainstormSession(parsed);
  } catch {
    return null;
  }
}

export async function writeBrainstormSession(session) {
  const normalized = normalizeBrainstormSession(session);
  if (!normalized?.id) return;
  await AsyncStorage.setItem(
    sessionKey(normalized.id),
    JSON.stringify(normalized),
  );
}

export async function getLinkedBrainstormSessionId(entryId) {
  if (!entryId && entryId !== 0) return "";
  const value = await AsyncStorage.getItem(entryLinkKey(entryId));
  return String(value || "");
}

export async function linkEntryToBrainstormSession(entryId, sessionId) {
  if (!entryId && entryId !== 0) return;
  if (!sessionId) return;
  await AsyncStorage.setItem(entryLinkKey(entryId), String(sessionId));
}

export async function createBrainstormSession({
  entryId,
  seedText,
  mode,
  messages,
} = {}) {
  const seed = String(seedText || "").trim();
  const seedMode = normalizeBrainstormMode(mode);
  const initialMessages = normalizeBrainstormMessages(messages);
  const createdAt = nowIso();
  const session = {
    id: buildSessionId(),
    mode: seedMode,
    lifecycle: "active",
    createdAt,
    updatedAt: createdAt,
    entryId: entryId ?? null,
    finalizeGuards: {
      ended: false,
      wipSaved: false,
    },
    messages: initialMessages.length
      ? initialMessages
      : seed
        ? [
            {
              id: `${Date.now()}-seed`,
              role: "user",
              content: seed,
              createdAt,
            },
          ]
        : [],
  };
  await writeBrainstormSession(session);
  if (entryId || entryId === 0) {
    await linkEntryToBrainstormSession(entryId, session.id);
  }
  return session;
}

export function toBrainstormTranscript(messages) {
  const source = normalizeBrainstormMessages(messages);
  return source
    .map((message) => {
      const role = message?.role === "assistant" ? "Assistant" : "User";
      const content = String(message?.content || "").trim();
      if (!content) return "";
      return `${role}: ${content}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function isBrainstormTalkEntry(entry) {
  const tags = Array.isArray(entry?.tags) ? entry.tags : [];
  return tags.some(
    (tag) =>
      String(tag || "")
        .trim()
        .toLowerCase() === "brainstorm-conversation",
  );
}

export { BRAINSTORM_SESSION_MODES, normalizeBrainstormMode };
