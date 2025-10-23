// server.js
const express = require('express');
const cors = require('cors');
const { Low, JSONFile } = require('lowdb');
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// DB setup
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data = db.data || { countries: [] };
  await db.write();
}
initDB();

app.use(cors());
app.use(express.json());

// Routes

// GET /api/countries - list of countries (basic fields)
app.get('/api/countries', async (req, res) => {
  await db.read();
  const countries = (db.data.countries || []).map(c => ({
    id: c.id,
    name: c.name,
    capital: c.capital,
    region: c.region,
    population: c.population
  }));
  res.json(countries);
});

// GET /api/countries/:id - full country object including notes
app.get('/api/countries/:id', async (req, res) => {
  await db.read();
  const id = req.params.id;
  const country = (db.data.countries || []).find(c => c.id === id);
  if (!country) return res.status(404).json({ error: 'Country not found' });
  res.json(country);
});

// POST /api/countries/:id/notes - add a note
app.post('/api/countries/:id/notes', async (req, res) => {
  await db.read();
  const { title, content, author } = req.body;
  const id = req.params.id;
  if (!title || !content) {
    return res.status(400).json({ error: 'title and content required' });
  }
  const country = (db.data.countries || []).find(c => c.id === id);
  if (!country) return res.status(404).json({ error: 'Country not found' });

  const note = {
    id: nanoid(),
    title,
    content,
    author: author || 'Anonymous',
    createdAt: new Date().toISOString()
  };

  country.notes = country.notes || [];
  country.notes.unshift(note); // newest first
  await db.write();
  res.status(201).json(note);
});

// DELETE /api/countries/:id/notes/:noteId
app.delete('/api/countries/:id/notes/:noteId', async (req, res) => {
  await db.read();
  const { id, noteId } = req.params;
  const country = (db.data.countries || []).find(c => c.id === id);
  if (!country) return res.status(404).json({ error: 'Country not found' });

  const prevLen = (country.notes || []).length;
  country.notes = (country.notes || []).filter(n => n.id !== noteId);
  if (country.notes.length === prevLen) {
    return res.status(404).json({ error: 'Note not found' });
  }
  await db.write();
  res.status(204).send();
});

// PUT /api/countries/:id/notes/:noteId - update note
app.put('/api/countries/:id/notes/:noteId', async (req, res) => {
  await db.read();
  const { id, noteId } = req.params;
  const { title, content } = req.body;
  const country = (db.data.countries || []).find(c => c.id === id);
  if (!country) return res.status(404).json({ error: 'Country not found' });

  const note = (country.notes || []).find(n => n.id === noteId);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  if (title) note.title = title;
  if (content) note.content = content;
  note.updatedAt = new Date().toISOString();
  await db.write();
  res.json(note);
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
