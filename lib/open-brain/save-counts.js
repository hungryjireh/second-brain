import { supabaseRequest } from "./helpers.js";

function normalizeUuidList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => value.length > 0);
}

export async function loadOpenBrainSaveCounts({
  token,
  profileIds = [],
  thoughtIds = [],
} = {}) {
  const normalizedProfileIds = normalizeUuidList(profileIds);
  const normalizedThoughtIds = normalizeUuidList(thoughtIds);

  if (!normalizedProfileIds.length && !normalizedThoughtIds.length) {
    return { profileCounts: new Map(), thoughtCounts: new Map() };
  }

  const payload = await supabaseRequest("/rest/v1/rpc/open_brain_save_counts", {
    method: "POST",
    authToken: token,
    body: {
      profile_ids: normalizedProfileIds,
      thought_ids: normalizedThoughtIds,
    },
  });

  const profileCounts = new Map();
  const thoughtCounts = new Map();

  const rawProfileCounts =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    payload.profile_counts &&
    typeof payload.profile_counts === "object"
      ? payload.profile_counts
      : {};
  const rawThoughtCounts =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    payload.thought_counts &&
    typeof payload.thought_counts === "object"
      ? payload.thought_counts
      : {};

  for (const [profileId, value] of Object.entries(rawProfileCounts)) {
    profileCounts.set(profileId, Number(value || 0));
  }
  for (const [thoughtId, value] of Object.entries(rawThoughtCounts)) {
    thoughtCounts.set(thoughtId, Number(value || 0));
  }

  return { profileCounts, thoughtCounts };
}
