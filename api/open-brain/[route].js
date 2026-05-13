import addToSecondBrainClickHandler from '../../lib/open-brain/routes/add-to-second-brain-click.js';
import feedHandler from '../../lib/open-brain/routes/feed.js';
import followsHandler from '../../lib/open-brain/routes/follows.js';
import notificationsHandler from '../../lib/open-brain/routes/notifications.js';
import profileHandler from '../../lib/open-brain/routes/profile.js';
import publicThoughtsHandler from '../../lib/open-brain/routes/public-thoughts.js';
import searchHandler from '../../lib/open-brain/routes/search.js';
import sharedThoughtHandler from '../../lib/open-brain/routes/shared-thought.js';
import thoughtsHandler from '../../lib/open-brain/routes/thoughts.js';

const ROUTE_HANDLERS = {
  'add-to-second-brain-click': addToSecondBrainClickHandler,
  feed: feedHandler,
  follows: followsHandler,
  notifications: notificationsHandler,
  profile: profileHandler,
  'public-thoughts': publicThoughtsHandler,
  search: searchHandler,
  'shared-thought': sharedThoughtHandler,
  thoughts: thoughtsHandler,
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();

  const route = String(req.query?.route || '').trim();
  const routeHandler = ROUTE_HANDLERS[route];
  if (!routeHandler) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  await routeHandler(req, res);
}
