require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';
const DEFAULT_USER_ID = 1;

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });
}

function computeStatus(session, today) {
  if (session.completed) return 'completed';
  const sessionDate = formatDate(session.date);
  return sessionDate < today ? 'missed' : 'planned';
}

function formatDate(date) {
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return date;
}

function formatSession(session, today) {
  return {
    ...session,
    date: formatDate(session.date),
    status: computeStatus(session, today),
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GET /sessions - list all sessions for the user
app.get('/sessions', async (req, res) => {
  try {
    const today = getToday();
    const sessions = await db('sessions')
      .where('user_id', DEFAULT_USER_ID)
      .orderBy('date', 'desc');

    res.json(sessions.map((s) => formatSession(s, today)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /sessions/streak - get current streak count
app.get('/sessions/streak', async (req, res) => {
  try {
    const today = getToday();
    const sessions = await db('sessions')
      .where('user_id', DEFAULT_USER_ID)
      .where('date', '<=', today)
      .orderBy('date', 'desc');

    let streak = 0;
    for (const session of sessions) {
      if (session.completed) {
        streak++;
      } else {
        break;
      }
    }

    res.json({ streak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /sessions/:id - get a single session
app.get('/sessions/:id', async (req, res) => {
  try {
    const today = getToday();
    const session = await db('sessions')
      .where({ id: req.params.id, user_id: DEFAULT_USER_ID })
      .first();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(formatSession(session, today));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /sessions - create a new session
app.post('/sessions', async (req, res) => {
  try {
    const { date, type, label, distance_miles, completed } = req.body;

    if (!date || !type) {
      return res.status(400).json({ error: 'date and type are required' });
    }

    if (!['run', 'strength'].includes(type)) {
      return res.status(400).json({ error: 'type must be "run" or "strength"' });
    }

    const [session] = await db('sessions')
      .insert({
        user_id: DEFAULT_USER_ID,
        date,
        type,
        label: label || null,
        distance_miles: type === 'run' ? distance_miles : null,
        completed: completed || false,
      })
      .returning('*');

    const today = getToday();
    res.status(201).json(formatSession(session, today));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /sessions/:id - update a session
app.patch('/sessions/:id', async (req, res) => {
  try {
    const { date, type, label, distance_miles, completed } = req.body;

    const session = await db('sessions')
      .where({ id: req.params.id, user_id: DEFAULT_USER_ID })
      .first();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (type && !['run', 'strength'].includes(type)) {
      return res.status(400).json({ error: 'type must be "run" or "strength"' });
    }

    const updates = {};
    if (date !== undefined) updates.date = date;
    if (type !== undefined) updates.type = type;
    if (label !== undefined) updates.label = label;
    if (distance_miles !== undefined) updates.distance_miles = distance_miles;
    if (completed !== undefined) updates.completed = completed;

    const [updated] = await db('sessions')
      .where({ id: req.params.id, user_id: DEFAULT_USER_ID })
      .update(updates)
      .returning('*');

    const today = getToday();
    res.json(formatSession(updated, today));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /sessions/:id - delete a session
app.delete('/sessions/:id', async (req, res) => {
  try {
    const deleted = await db('sessions')
      .where({ id: req.params.id, user_id: DEFAULT_USER_ID })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const MILESTONE_TYPES = ['race', '5k', '10k', 'half', 'full', 'custom'];

function formatMilestone(milestone) {
  return {
    ...milestone,
    date: formatDate(milestone.date),
  };
}

// GET /milestones - list all milestones for the user
app.get('/milestones', async (req, res) => {
  try {
    const milestones = await db('milestones')
      .where('user_id', DEFAULT_USER_ID)
      .orderBy('date', 'asc');

    res.json(milestones.map(formatMilestone));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /milestones/:id - get a single milestone
app.get('/milestones/:id', async (req, res) => {
  try {
    const milestone = await db('milestones')
      .where({ id: req.params.id, user_id: DEFAULT_USER_ID })
      .first();

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json(formatMilestone(milestone));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /milestones - create a new milestone
app.post('/milestones', async (req, res) => {
  try {
    const { date, label, type } = req.body;

    if (!date || !label || !type) {
      return res.status(400).json({ error: 'date, label, and type are required' });
    }

    if (!MILESTONE_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${MILESTONE_TYPES.join(', ')}` });
    }

    if (type === 'race') {
      const existingRace = await db('milestones')
        .where({ user_id: DEFAULT_USER_ID, type: 'race' })
        .first();

      if (existingRace) {
        return res.status(409).json({ error: 'A primary race already exists. Update or delete it first.' });
      }
    }

    const [milestone] = await db('milestones')
      .insert({
        user_id: DEFAULT_USER_ID,
        date,
        label,
        type,
      })
      .returning('*');

    res.status(201).json(formatMilestone(milestone));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /milestones/:id - update a milestone
app.patch('/milestones/:id', async (req, res) => {
  try {
    const { date, label, type } = req.body;

    const milestone = await db('milestones')
      .where({ id: req.params.id, user_id: DEFAULT_USER_ID })
      .first();

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    if (type && !MILESTONE_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${MILESTONE_TYPES.join(', ')}` });
    }

    if (type === 'race' && milestone.type !== 'race') {
      const existingRace = await db('milestones')
        .where({ user_id: DEFAULT_USER_ID, type: 'race' })
        .first();

      if (existingRace) {
        return res.status(409).json({ error: 'A primary race already exists. Update or delete it first.' });
      }
    }

    const updates = {};
    if (date !== undefined) updates.date = date;
    if (label !== undefined) updates.label = label;
    if (type !== undefined) updates.type = type;

    const [updated] = await db('milestones')
      .where({ id: req.params.id, user_id: DEFAULT_USER_ID })
      .update(updates)
      .returning('*');

    res.json(formatMilestone(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /milestones/:id - delete a milestone
app.delete('/milestones/:id', async (req, res) => {
  try {
    const deleted = await db('milestones')
      .where({ id: req.params.id, user_id: DEFAULT_USER_ID })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
