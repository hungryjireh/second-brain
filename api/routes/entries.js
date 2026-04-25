import { Router } from 'express';
import { getAllEntries, getEntriesByCategory, deleteEntry, insertEntry } from '../services/db.js';
import { classify } from '../services/classify.js';

const router = Router();

// GET /entries          – all entries
// GET /entries?category=reminder  – filtered
router.get('/', (req, res) => {
  const { category } = req.query;
  const entries = category ? getEntriesByCategory(category) : getAllEntries();
  res.json(entries);
});

// POST /entries  – create directly from text (optional web input)
router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

  try {
    const { category, content, remind_at } = await classify(text.trim());
    const entry = insertEntry({ raw_text: text.trim(), category, content, remind_at });
    res.status(201).json(entry);
  } catch (err) {
    console.error('[POST /entries]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /entries/:id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });

  const deleted = deleteEntry(id);
  if (!deleted) return res.status(404).json({ error: 'not found' });
  res.json({ deleted: true });
});

export default router;
