export const CATEGORIES = ['reminder', 'todo', 'thought', 'note'];
export const MAX_ENTRY_TAGS = 3;
export const MAX_USER_TAGS = 10;

export const GLOBALLY_PERMISSIVE_TAGS = ['openbrain', 'secondbrain'];

export const GLOBALLY_PERMISSIVE_TAGS_NORMALIZED = new Set(
  GLOBALLY_PERMISSIVE_TAGS.map(tag => String(tag).trim().toLowerCase()).filter(Boolean)
);
