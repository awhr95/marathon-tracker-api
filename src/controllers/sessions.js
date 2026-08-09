const db = require('../db');
const { getToday, formatDate } = require('../utils/date');
const { DEFAULT_USER_ID, SESSION_TYPES } = require('../utils/constants');

function computeStatus(session, today) {
  if (session.completed) return 'completed';
  const sessionDate = formatDate(session.date);
  return sessionDate < today ? 'missed' : 'planned';
}

function formatSession(session, today) {
  return {
    ...session,
    date: formatDate(session.date),
    status: computeStatus(session, today),
  };
}

exports.list = async (req, res) => {
  try {
    const today = getToday();
    const sessions = await db('sessions')
      .where('user_id', DEFAULT_USER_ID)
      .orderBy('date', 'desc');

    res.json(sessions.map((s) => formatSession(s, today)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.streak = async (req, res) => {
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
};

exports.getOne = async (req, res) => {
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
};

exports.create = async (req, res) => {
  try {
    const { date, type, label, distance_miles, completed } = req.body;

    if (!date || !type) {
      return res.status(400).json({ error: 'date and type are required' });
    }

    if (!SESSION_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${SESSION_TYPES.join(', ')}` });
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
};

exports.update = async (req, res) => {
  try {
    const { date, type, label, distance_miles, completed } = req.body;

    const session = await db('sessions')
      .where({ id: req.params.id, user_id: DEFAULT_USER_ID })
      .first();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (type && !SESSION_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${SESSION_TYPES.join(', ')}` });
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
};

exports.remove = async (req, res) => {
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
};
