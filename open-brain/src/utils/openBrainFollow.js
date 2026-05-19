export async function executeOpenBrainFollowToggle({
  token,
  targetUserId,
  isFollowing,
  apiRequest,
  sendFollowNotification,
}) {
  if (!targetUserId) return false;

  if (isFollowing) {
    await apiRequest(
      `/open-brain/follows?following_id=${encodeURIComponent(targetUserId)}`,
      {
        method: "DELETE",
        token,
      },
    );
    return true;
  }

  await apiRequest("/open-brain/follows", {
    method: "POST",
    token,
    body: { following_id: targetUserId },
  });
  await sendFollowNotification(token, targetUserId);
  return true;
}
