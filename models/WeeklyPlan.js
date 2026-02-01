const mongoose = require('mongoose');

const weeklyPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  weekStartDate: {
    type: Date,
    required: true,
    index: true,
  },
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0, // Monday
    max: 6, // Sunday
  },
  ideaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Idea',
    default: null,
  },
  note: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['planned', 'posted', 'skipped'],
    default: 'planned',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to prevent duplicate day assignments in same week
weeklyPlanSchema.index({ userId: 1, weekStartDate: 1, dayOfWeek: 1 }, { unique: true });

// Update updatedAt before saving
weeklyPlanSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WeeklyPlan', weeklyPlanSchema);
