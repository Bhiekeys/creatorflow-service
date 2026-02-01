const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   POST /api/auth/signin
// @desc    Authenticate user and get token
// @access  Public
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password',
      });
    }

    // Check for user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          randomIdeaCount: user.randomIdeaCount || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   GET /api/auth/usage
// @desc    Get user's AI usage count
// @access  Private
router.get('/usage', require('../middleware/auth').protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        randomIdeaCount: user.randomIdeaCount || 0,
        collaborationCount: user.collaborationCount || 0,
        expansionCount: user.expansionCount || 0,
        hookGenerationCount: user.hookGenerationCount || 0,
        scriptGenerationCount: user.scriptGenerationCount || 0,
        scriptRefinementCount: user.scriptRefinementCount || 0,
        limit: 5,
        remaining: Math.max(0, 5 - (user.randomIdeaCount || 0)),
        collaborationRemaining: Math.max(0, 5 - (user.collaborationCount || 0)),
        expansionRemaining: Math.max(0, 5 - (user.expansionCount || 0)),
        hookGenerationRemaining: Math.max(0, 5 - (user.hookGenerationCount || 0)),
        scriptGenerationRemaining: Math.max(0, 5 - (user.scriptGenerationCount || 0)),
        scriptRefinementRemaining: Math.max(0, 10 - (user.scriptRefinementCount || 0)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   POST /api/auth/increment-usage
// @desc    Increment user's random idea count
// @access  Private
router.post('/increment-usage', require('../middleware/auth').protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Check limit before incrementing
    if ((user.randomIdeaCount || 0) >= 5) {
      return res.status(403).json({
        success: false,
        error: 'LIMIT_REACHED',
        message: 'You have reached your limit of 5 Random Ideas. Subscribe to unlock unlimited access.',
      });
    }

    user.randomIdeaCount = (user.randomIdeaCount || 0) + 1;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        randomIdeaCount: user.randomIdeaCount,
        limit: 5,
        remaining: Math.max(0, 5 - user.randomIdeaCount),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// @route   POST /api/auth/increment-ai-usage
// @desc    Increment user's AI feature usage (collaboration or expansion)
// @access  Private
router.post('/increment-ai-usage', require('../middleware/auth').protect, async (req, res) => {
  try {
    const { type } = req.body; // 'collaboration' or 'expansion'
    
    if (!type || !['collaboration', 'expansion', 'hook', 'script', 'script_refinement'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid usage type. Must be "collaboration", "expansion", "hook", "script", or "script_refinement"',
      });
    }

    const user = await User.findById(req.user._id);
    
    // Check limit before incrementing
    if (type === 'collaboration') {
      if ((user.collaborationCount || 0) >= 5) {
        return res.status(403).json({
          success: false,
          error: 'LIMIT_REACHED',
          message: 'You have reached your limit of 5 Collaboration Messages. Subscribe to unlock unlimited access.',
        });
      }
      user.collaborationCount = (user.collaborationCount || 0) + 1;
    } else if (type === 'expansion') {
      if ((user.expansionCount || 0) >= 5) {
        return res.status(403).json({
          success: false,
          error: 'LIMIT_REACHED',
          message: 'You have reached your limit of 5 Idea Expansions. Subscribe to unlock unlimited access.',
        });
      }
      user.expansionCount = (user.expansionCount || 0) + 1;
    } else if (type === 'hook') {
      if ((user.hookGenerationCount || 0) >= 5) {
        return res.status(403).json({
          success: false,
          error: 'LIMIT_REACHED',
          message: 'You have reached your limit of 5 Hook Generations. Subscribe to unlock unlimited access.',
        });
      }
      user.hookGenerationCount = (user.hookGenerationCount || 0) + 1;
    } else if (type === 'script') {
      if ((user.scriptGenerationCount || 0) >= 5) {
        return res.status(403).json({
          success: false,
          error: 'LIMIT_REACHED',
          message: 'You have reached your limit of 5 Script Generations. Subscribe to unlock unlimited access.',
        });
      }
      user.scriptGenerationCount = (user.scriptGenerationCount || 0) + 1;
    } else if (type === 'script_refinement') {
      if ((user.scriptRefinementCount || 0) >= 10) {
        return res.status(403).json({
          success: false,
          error: 'LIMIT_REACHED',
          message: 'You have reached your limit of 10 Script Refinements. Subscribe to unlock unlimited access.',
        });
      }
      user.scriptRefinementCount = (user.scriptRefinementCount || 0) + 1;
    }
    
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        collaborationCount: user.collaborationCount || 0,
        expansionCount: user.expansionCount || 0,
        hookGenerationCount: user.hookGenerationCount || 0,
        scriptGenerationCount: user.scriptGenerationCount || 0,
        scriptRefinementCount: user.scriptRefinementCount || 0,
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