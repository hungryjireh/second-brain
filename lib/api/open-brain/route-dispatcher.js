import addToSecondBrainClickHandler from "../../open-brain/routes/add-to-second-brain-click.js";
import feedHandler from "../../open-brain/routes/feed.js";
import followsHandler from "../../open-brain/routes/follows.js";
import notificationsHandler from "../../open-brain/routes/notifications.js";
import profileHandler from "../../open-brain/routes/profile.js";
import publicThoughtsHandler from "../../open-brain/routes/public-thoughts.js";
import searchHandler from "../../open-brain/routes/search.js";
import sharedThoughtHandler from "../../open-brain/routes/shared-thought.js";
import thoughtsHandler from "../../open-brain/routes/thoughts.js";

const ROUTE_HANDLERS = {
  "add-to-second-brain-click": addToSecondBrainClickHandler,
  feed: feedHandler,
  follows: followsHandler,
  notifications: notificationsHandler,
  profile: profileHandler,
  "public-thoughts": publicThoughtsHandler,
  search: searchHandler,
  "shared-thought": sharedThoughtHandler,
  thoughts: thoughtsHandler,
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();

  const route = String(req.query?.route || "").trim();
  const routeHandler = ROUTE_HANDLERS[route];
  if (!routeHandler) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await routeHandler(req, res);
}
