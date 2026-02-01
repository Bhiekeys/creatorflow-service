const express = require('express');
const WeeklyPlan = require('../models/WeeklyPlan');
const Idea = require('../models/Idea');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Helper: Get Monday of current week (00:00:00)
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Calculate days to subtract to get to Monday
  // If Sunday (0), subtract 6 days. Otherwise subtract (day - 1) days.
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Helper: Get Sunday of current week (23:59:59)
function getWeekEnd(date = new Date()) {
  const monday = getWeekStart(date);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

// @route   GET /api/planner/current-week
// @desc    Get current week's plan for user (or next week if nextWeek=true)
// @access  Private
router.get('/current-week', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if user wants next week
    const nextWeek = req.query.nextWeek === 'true';
    
    // Calculate week start (current or next week)
    let weekStart = getWeekStart();
    if (nextWeek) {
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    // Find all plans for this week
    const plans = await WeeklyPlan.find({
      userId,
      weekStartDate: weekStart,
    }).populate('ideaId', 'title description tags');

    // Create a map for quick lookup
    const plansMap = {};
    plans.forEach(plan => {
      plansMap[plan.dayOfWeek] = plan;
    });

    // Calculate dates for each day in the week
    const dayDates = [];
    for (let day = 0; day < 7; day++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + day);
      dayDates.push(dayDate);
    }

    // Create response with all 7 days (Mon-Sun)
    const weekPlan = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (let day = 0; day < 7; day++) {
      const plan = plansMap[day] || null;
      const dayDate = dayDates[day];
      const isPast = dayDate < today;

      weekPlan.push({
        dayOfWeek: day,
        dayName: dayNames[day],
        date: dayDate,
        isPast: isPast,
        ideaId: plan?.ideaId?._id || null,
        idea: plan?.ideaId ? {
          id: plan.ideaId._id,
          title: plan.ideaId.title,
          description: plan.ideaId.description,
          tags: plan.ideaId.tags,
        } : null,
        note: plan?.note || '',
        status: plan?.status || 'planned',
        planId: plan?._id || null,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        weekStart: weekStart,
        weekEnd: getWeekEnd(weekStart),
        days: weekPlan,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   POST /api/planner/assign-idea
// @desc    Assign an idea to a specific day (current or next week)
// @access  Private
router.post('/assign-idea', protect, async (req, res) => {
  try {
    const { dayOfWeek, ideaId, nextWeek } = req.body;
    const userId = req.user._id;

    // Validation
    if (dayOfWeek === undefined || dayOfWeek === null) {
      return res.status(400).json({
        success: false,
        error: 'Please provide dayOfWeek (0-6)',
      });
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({
        success: false,
        error: 'dayOfWeek must be between 0 (Monday) and 6 (Sunday)',
      });
    }

    // Calculate week start (current or next week)
    let weekStart = getWeekStart();
    if (nextWeek) {
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    // Check if day is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayOfWeek);
    
    if (dayDate < today) {
      return res.status(400).json({
        success: false,
        error: 'Cannot assign ideas to past days',
      });
    }

    // Verify idea belongs to user (if ideaId provided)
    if (ideaId) {
      const idea = await Idea.findOne({ _id: ideaId, user: userId });
      if (!idea) {
        return res.status(404).json({
          success: false,
          error: 'Idea not found',
        });
      }
    }

    // Prevent duplicate assignment of same idea in same week
    if (ideaId) {
      const existingAssignment = await WeeklyPlan.findOne({
        userId,
        weekStartDate: weekStart,
        ideaId,
      });

      if (existingAssignment && existingAssignment.dayOfWeek !== dayOfWeek) {
        return res.status(400).json({
          success: false,
          error: 'This idea is already assigned to another day this week',
        });
      }
    }

    // Find or create plan for this day
    let plan = await WeeklyPlan.findOne({
      userId,
      weekStartDate: weekStart,
      dayOfWeek,
    });

    if (plan) {
      // Update existing plan
      plan.ideaId = ideaId || null;
      if (!ideaId) {
        // If removing idea, reset status to planned
        plan.status = 'planned';
      }
      plan = await plan.save();
    } else {
      // Create new plan
      plan = await WeeklyPlan.create({
        userId,
        weekStartDate: weekStart,
        dayOfWeek,
        ideaId: ideaId || null,
        status: 'planned',
      });
    }

    // Populate idea
    await plan.populate('ideaId', 'title description tags');

    res.status(200).json({
      success: true,
      data: {
        dayOfWeek: plan.dayOfWeek,
        ideaId: plan.ideaId?._id || null,
        idea: plan.ideaId ? {
          id: plan.ideaId._id,
          title: plan.ideaId.title,
          description: plan.ideaId.description,
          tags: plan.ideaId.tags,
        } : null,
        note: plan.note,
        status: plan.status,
        planId: plan._id,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        success: false,
        error: 'This day already has a plan. Please update it instead.',
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   PUT /api/planner/update-status
// @desc    Update status of a day (current or next week)
// @access  Private
router.put('/update-status', protect, async (req, res) => {
  try {
    const { dayOfWeek, status, nextWeek } = req.body;
    const userId = req.user._id;

    // Validation
    if (dayOfWeek === undefined || dayOfWeek === null) {
      return res.status(400).json({
        success: false,
        error: 'Please provide dayOfWeek (0-6)',
      });
    }

    if (!['planned', 'posted', 'skipped'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be one of: planned, posted, skipped',
      });
    }

    // Calculate week start (current or next week)
    let weekStart = getWeekStart();
    if (nextWeek) {
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    // Check if day is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayOfWeek);
    
    if (dayDate < today) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update status of past days',
      });
    }

    const plan = await WeeklyPlan.findOne({
      userId,
      weekStartDate: weekStart,
      dayOfWeek,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'No plan found for this day',
      });
    }

    plan.status = status;
    await plan.save();

    res.status(200).json({
      success: true,
      data: {
        dayOfWeek: plan.dayOfWeek,
        status: plan.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   PUT /api/planner/update-note
// @desc    Update note for a day (current or next week)
// @access  Private
router.put('/update-note', protect, async (req, res) => {
  try {
    const { dayOfWeek, note, nextWeek } = req.body;
    const userId = req.user._id;

    // Validation
    if (dayOfWeek === undefined || dayOfWeek === null) {
      return res.status(400).json({
        success: false,
        error: 'Please provide dayOfWeek (0-6)',
      });
    }

    // Calculate week start (current or next week)
    let weekStart = getWeekStart();
    if (nextWeek) {
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    // Check if day is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayOfWeek);
    
    if (dayDate < today) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update notes for past days',
      });
    }

    let plan = await WeeklyPlan.findOne({
      userId,
      weekStartDate: weekStart,
      dayOfWeek,
    });

    if (!plan) {
      // Create plan if it doesn't exist (for notes without ideas)
      plan = await WeeklyPlan.create({
        userId,
        weekStartDate: weekStart,
        dayOfWeek,
        note: note || '',
        status: 'planned',
      });
    } else {
      plan.note = note || '';
      await plan.save();
    }

    res.status(200).json({
      success: true,
      data: {
        dayOfWeek: plan.dayOfWeek,
        note: plan.note,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

module.exports = router;
