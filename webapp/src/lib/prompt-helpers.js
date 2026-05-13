export function flattenPrompts(payload) {
  if (!payload || typeof payload !== 'object') return [];
  return Object.values(payload)
    .flatMap(group => (Array.isArray(group) ? group : []))
    .filter(prompt => typeof prompt === 'string' && prompt.trim().length > 0);
}

export function getRandomPrompt(prompts, currentPrompt = '') {
  if (!Array.isArray(prompts) || prompts.length === 0) return '';
  if (prompts.length === 1) return prompts[0];

  let next = currentPrompt;
  while (next === currentPrompt) {
    next = prompts[Math.floor(Math.random() * prompts.length)];
  }
  return next;
}
