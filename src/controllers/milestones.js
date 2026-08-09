const db = require('../db');
const { formatDate } = require('../utils/date');
const { DEFAULT_USER_ID, MILESTONE_TYPES } = require('../utils/constants');

function formatMilestone(milestone) {
  return {
    ...milestone,
    date: formatDate(milestone.date),
  };
}

exports.list = async (req, res) => {
  try {
    const milestones = await db('milestones')
      .where('user_id', DEFAULT_USER_ID)
      .orderBy('date', 'asc');

    res.json(milestones.map(formatMilestone));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
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
};

exports.create = async (req, res) => {
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
};

exports.update = async (req, res) => {
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
};

exports.remove = async (req, res) => {
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
};
