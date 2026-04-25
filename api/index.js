import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import entriesRouter from './routes/entries.js';
import { startCron } from './services/cron.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Routes
app.use('/entries', entriesRouter);

// Start server
app.listen(PORT, () => {
  console.log(`[api] Listening on http://localhost:${PORT}`);
  startCron();
});
