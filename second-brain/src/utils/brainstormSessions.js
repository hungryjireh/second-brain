import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_PREFIX = "brainstorm:session:";
const ENTRY_LINK_PREFIX = "brainstorm:entry:";

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

export async function readBrainstormSession(sessionId) {
  if (!sessionId) return null;
  const raw = await AsyncStorage.getItem(sessionKey(sessionId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeBrainstormSession(session) {
  if (!session?.id) return;
  await AsyncStorage.setItem(sessionKey(session.id), JSON.stringify(session));
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

export async function createBrainstormSession({ entryId, seedText } = {}) {
  const seed = String(seedText || "").trim();
  const createdAt = nowIso();
  const session = {
    id: buildSessionId(),
    lifecycle: "active",
    createdAt,
    updatedAt: createdAt,
    entryId: entryId ?? null,
    finalizeGuards: {
      ended: false,
      wipSaved: false,
    },
    messages: seed
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
  const source = Array.isArray(messages) ? messages : [];
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
