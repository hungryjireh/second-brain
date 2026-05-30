import { __testables } from "../OpenBrainFeedScreen";

describe("OpenBrainFeedScreen helpers", () => {
  describe("updateThoughtAcrossFeed", () => {
    it("returns original list references when no matching thought exists", () => {
      const feed = {
        following: [{ id: "a", value: 1 }],
        everyone: [{ id: "b", value: 2 }],
      };

      const next = __testables.updateThoughtAcrossFeed(feed, "missing", (item) => ({
        ...item,
        value: 999,
      }));

      expect(next.following).toBe(feed.following);
      expect(next.everyone).toBe(feed.everyone);
    });

    it("updates only the list containing the matching thought id", () => {
      const feed = {
        following: [{ id: "a", value: 1 }],
        everyone: [{ id: "b", value: 2 }],
      };

      const next = __testables.updateThoughtAcrossFeed(feed, "a", (item) => ({
        ...item,
        value: 3,
      }));

      expect(next.following).not.toBe(feed.following);
      expect(next.following[0]).toEqual({ id: "a", value: 3 });
      expect(next.everyone).toBe(feed.everyone);
    });
  });

  describe("updateUserAcrossFeed", () => {
    it("returns original list references when no matching user exists", () => {
      const feed = {
        following: [{ id: "a", user_id: "u1", profile: { id: "u1" } }],
        everyone: [{ id: "b", user_id: "u2", profile: { id: "u2" } }],
      };

      const next = __testables.updateUserAcrossFeed(feed, "missing", (item) => ({
        ...item,
        profile: { ...item.profile, is_following: true },
      }));

      expect(next.following).toBe(feed.following);
      expect(next.everyone).toBe(feed.everyone);
    });

    it("updates only rows with matching user or profile id", () => {
      const feed = {
        following: [
          { id: "a", user_id: "u1", profile: { id: "u1", is_following: false } },
          { id: "x", user_id: "u9", profile: { id: "u9", is_following: false } },
        ],
        everyone: [{ id: "b", user_id: "u2", profile: { id: "u2", is_following: false } }],
      };

      const next = __testables.updateUserAcrossFeed(feed, "u1", (item) => ({
        ...item,
        profile: { ...item.profile, is_following: true },
      }));

      expect(next.following).not.toBe(feed.following);
      expect(next.following[0].profile.is_following).toBe(true);
      expect(next.following[1]).toBe(feed.following[1]);
      expect(next.everyone).toBe(feed.everyone);
    });
  });
});
