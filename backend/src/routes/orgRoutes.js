const express = require('express');
const router = express.Router();

// In-memory store (replace with DB model as needed)
let todos = [];
let events = [];
let nextId = 1;

// ─── Todos ────────────────────────────────────────────────────────────────────

router.get('/todos', (req, res) => {
  const { status } = req.query;
  let result = todos;
  if (status === 'active') result = todos.filter(t => !t.completed);
  if (status === 'completed') result = todos.filter(t => t.completed);
  res.json(result);
});

router.post('/todos', (req, res) => {
  const { title, priority = 'medium', dueDate } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
  const todo = { id: nextId++, title: title.trim(), priority, dueDate: dueDate || null, completed: false, createdAt: new Date().toISOString() };
  todos.push(todo);
  res.status(201).json(todo);
});

router.patch('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = todos.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Todo not found' });
  todos[idx] = { ...todos[idx], ...req.body, id };
  res.json(todos[idx]);
});

router.delete('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = todos.length;
  todos = todos.filter(t => t.id !== id);
  if (todos.length === before) return res.status(404).json({ error: 'Todo not found' });
  res.json({ success: true });
});

// ─── Calendar Events ──────────────────────────────────────────────────────────

router.get('/events', (req, res) => {
  const { from, to } = req.query;
  let result = events;
  if (from) result = result.filter(e => e.date >= from);
  if (to) result = result.filter(e => e.date <= to);
  res.json(result.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
});

router.post('/events', (req, res) => {
  const { title, date, time = '09:00', color = '#4f86f7', notes = '' } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
  if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  const event = { id: nextId++, title: title.trim(), date, time, color, notes, createdAt: new Date().toISOString() };
  events.push(event);
  res.status(201).json(event);
});

router.patch('/events/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Event not found' });
  events[idx] = { ...events[idx], ...req.body, id };
  res.json(events[idx]);
});

router.delete('/events/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = events.length;
  events = events.filter(e => e.id !== id);
  if (events.length === before) return res.status(404).json({ error: 'Event not found' });
  res.json({ success: true });
});

module.exports = router;
