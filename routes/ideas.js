const express = require('express');
const Idea = require('../models/Idea');
const { protect } = require('../middleware/auth');
const router = express.Router();

// All routes are protected
router.use(protect);

// @route   GET /api/ideas
// @desc    Get ideas for the logged in user (paginated)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    // Fetch ideas with pagination
    const ideas = await Idea.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Get total count for pagination info
    const total = await Idea.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
      count: ideas.length,
      total,
      hasMore: skip + ideas.length < total,
      data: ideas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   GET /api/ideas/:id
// @desc    Get single idea
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const idea = await Idea.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!idea) {
      return res.status(404).json({
        success: false,
        error: 'Idea not found',
      });
    }

    res.status(200).json({
      success: true,
      data: idea,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   POST /api/ideas
// @desc    Create a new idea
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { title, description, tags } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a title',
      });
    }

    const idea = await Idea.create({
      title: title.trim(),
      description: description?.trim() || '',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(t => t) : []),
      hook: req.body.hook?.trim() || '',
      user: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: idea,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   PUT /api/ideas/:id
// @desc    Update an idea
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    let idea = await Idea.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!idea) {
      return res.status(404).json({
        success: false,
        error: 'Idea not found',
      });
    }

    const { title, description, tags, hook, script } = req.body;

    // Update fields
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Title cannot be empty',
        });
      }
      idea.title = title.trim();
    }

    if (description !== undefined) {
      idea.description = description?.trim() || '';
    }

    if (tags !== undefined) {
      idea.tags = Array.isArray(tags) 
        ? tags 
        : (tags ? tags.split(',').map(t => t.trim()).filter(t => t) : []);
    }

    if (hook !== undefined) {
      idea.hook = hook?.trim() || '';
    }

    if (script !== undefined && typeof script === 'object' && script !== null) {
      idea.script = idea.script || {};
      if (script.content !== undefined) idea.script.content = String(script.content || '').trim();
      if (script.generatedBy !== undefined && ['manual', 'ai'].includes(script.generatedBy)) {
        idea.script.generatedBy = script.generatedBy;
      }
      idea.script.lastUpdatedAt = new Date();
    }

    idea = await idea.save();

    res.status(200).json({
      success: true,
      data: idea,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   DELETE /api/ideas/:id
// @desc    Delete an idea
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const idea = await Idea.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!idea) {
      return res.status(404).json({
        success: false,
        error: 'Idea not found',
      });
    }

    await idea.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

module.exports = router;