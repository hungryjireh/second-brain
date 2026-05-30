import { supabaseRequest } from "./helpers.js";

function normalizeUuidList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => value.length > 0);
}

const DEFAULT_REACTION_SUMMARY = {
  felt_this: 0,
  me_too: 0,
  made_me_think: 0,
  mine: {
    felt_this: false,
    me_too: false,
    made_me_think: false,
  },
};

function toReactionSummaryEntry(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const mine =
    source.mine &&
    typeof source.mine === "object" &&
    !Array.isArray(source.mine)
      ? source.mine
      : {};
  return {
    felt_this: Number(source.felt_this || 0),
    me_too: Number(source.me_too || 0),
    made_me_think: Number(source.made_me_think || 0),
    mine: {
      felt_this: mine.felt_this === true,
      me_too: mine.me_too === true,
      made_me_think: mine.made_me_think === true,
    },
  };
}

export async function loadOpenBrainReactionSummary({
  token,
  thoughtIds = [],
  viewerId,
} = {}) {
  const normalizedThoughtIds = normalizeUuidList(thoughtIds);
  const normalizedViewerId = String(viewerId || "").trim();
  if (!normalizedThoughtIds.length || !normalizedViewerId.length) {
    return new Map();
  }

  const payload = await supabaseRequest(
    "/rest/v1/rpc/open_brain_reaction_summary",
    {
      method: "POST",
      authToken: token,
      body: {
        thought_ids: normalizedThoughtIds,
        viewer_id: normalizedViewerId,
      },
    },
  );

  const rawSummary =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    payload.summary &&
    typeof payload.summary === "object"
      ? payload.summary
      : {};

  const summary = new Map();
  for (const thoughtId of normalizedThoughtIds) {
    summary.set(thoughtId, DEFAULT_REACTION_SUMMARY);
  }
  for (const [thoughtId, value] of Object.entries(rawSummary)) {
    summary.set(thoughtId, toReactionSummaryEntry(value));
  }
  return summary;
}
