const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  tags: {
    type: [String],
    default: [],
  },
  hook: {
    type: String,
    trim: true,
    default: '',
  },
  script: {
    content: { type: String, trim: true, default: '' },
    generatedBy: { type: String, enum: ['manual', 'ai'], default: 'manual' },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
ideaSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Idea', ideaSchema);