import { Alert, Share } from "react-native";
import { apiRequest, invalidateApiCache } from "../api";
import { buildThoughtSharePayload } from "../share";

export async function addThoughtToSecondBrain({
  token,
  thought,
  onThoughtMarkedAdded,
  exactPaths = [],
  pathPrefixes = [],
}) {
  const thoughtText = String(thought?.text || "").trim();
  if (!thoughtText) return false;

  const thoughtId = thought?.id;
  const username =
    String(
      thought?.profile?.username || thought?.username || "unknown",
    ).trim() || "unknown";
  const description = `Thought taken from @${username}:\n\n${thoughtText}`;

  await apiRequest("/entries", {
    method: "POST",
    token,
    body: { description, category: "thought", tags: ["openbrain"] },
  });

  if (thoughtId) {
    await apiRequest("/open-brain/add-to-second-brain-click", {
      method: "POST",
      token,
      body: { thought_id: thoughtId },
    });
    await onThoughtMarkedAdded?.(thoughtId);
  }

  await invalidateApiCache({
    token,
    exactPaths,
    pathPrefixes,
  });

  return true;
}

export async function shareThought(thought) {
  const payload = buildThoughtSharePayload(thought);
  if (!payload) return false;
  await Share.share(payload);
  return true;
}

export async function addThoughtToSecondBrainWithAlert({
  token,
  thought,
  onThoughtMarkedAdded,
  exactPaths = [],
  pathPrefixes = [],
}) {
  try {
    await addThoughtToSecondBrain({
      token,
      thought,
      onThoughtMarkedAdded,
      exactPaths,
      pathPrefixes,
    });
    Alert.alert("Added to SecondBrain", "Thought saved to your SecondBrain.");
  } catch (err) {
    Alert.alert(
      "Add to SecondBrain",
      err?.message || "Unable to save thought.",
    );
  }
}

export function groupThoughtsByDay(thoughts, dateFormatter) {
  const today = new Date();
  const todayThoughts = [];
  const pastThoughts = [];

  (thoughts || []).forEach((thought) => {
    const created = new Date(thought?.created_at);
    const isValidDate = !Number.isNaN(created.getTime());
    const isToday =
      isValidDate &&
      created.getFullYear() === today.getFullYear() &&
      created.getMonth() === today.getMonth() &&
      created.getDate() === today.getDate();

    if (isToday) {
      todayThoughts.push(thought);
      return;
    }
    pastThoughts.push(thought);
  });

  return {
    todayThoughts,
    pastThoughts,
    todayItems: todayThoughts.map((thought) => ({
      thought,
      dateLabel: dateFormatter?.(thought?.created_at) || "",
    })),
    pastItems: pastThoughts.map((thought) => ({
      thought,
      dateLabel: dateFormatter?.(thought?.created_at) || "",
    })),
  };
}

export function buildThoughtSectionRows({
  todayItems = [],
  pastItems = [],
  todaySectionId = "section-today",
  pastSectionId = "section-past",
  todaySectionTitle = "Today's Thoughts",
  pastSectionTitle = "Past Thoughts",
  mapThoughtItem,
}) {
  const normalizeThoughtItem =
    typeof mapThoughtItem === "function"
      ? mapThoughtItem
      : ({ thought, dateLabel }) => ({ thought, dateLabel });
  const rows = [];

  if (todayItems.length > 0) {
    rows.push({
      type: "section",
      id: todaySectionId,
      title: todaySectionTitle,
    });
    todayItems.forEach((item) =>
      rows.push({
        type: "thought",
        ...normalizeThoughtItem(item),
      }),
    );
  }

  if (pastItems.length > 0) {
    rows.push({ type: "section", id: pastSectionId, title: pastSectionTitle });
    pastItems.forEach((item) =>
      rows.push({
        type: "thought",
        ...normalizeThoughtItem(item),
      }),
    );
  }

  return rows;
}
