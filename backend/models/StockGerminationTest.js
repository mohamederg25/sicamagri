/**
 * StockGerminationTest Model — Germination Test on Seed Stock
 * =============================================================
 *
 * Records a germination test performed directly on a StockSemence entry.
 * This is the scientific quality check: take X seeds, count how many
 * germinate, calculate the percentage.
 *
 * Business rules:
 *   - grainesGermees <= grainesTestees
 *   - At least 1 seed must be tested
 *   - Multiple tests can exist per stock entry (unlike the semis workflow)
 *   - If a formal test exists, it overrides the manual tauxManuel in display
 *
 * Computed fields:
 *   tauxGermination (virtual) = (grainesGermees / grainesTestees) × 100
 */

const mongoose = require('mongoose');

const stockGerminationTestSchema = new mongoose.Schema({
  stockSemence: { type: mongoose.Schema.Types.ObjectId, ref: 'StockSemence', required: true },
  dateTest: { type: Date, default: Date.now },
  grainesTestees: {
    type: Number,
    required: true,
    min: [1, 'Au moins une graine doit être testée']
  },
  grainesGermees: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function (value) {
        return value <= this.grainesTestees;
      },
      message: 'Le nombre de graines germées ({VALUE}) ne peut pas dépasser le nombre de graines testées',
    },
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Virtual: tauxGermination — Calculated germination rate.
 * Returns a percentage rounded to 2 decimal places.
 */
stockGerminationTestSchema.virtual('tauxGermination').get(function () {
  if (this.grainesTestees === 0) return 0;
  return Math.round((this.grainesGermees / this.grainesTestees) * 10000) / 100;
});

// ── Indexes ──
stockGerminationTestSchema.index({ stockSemence: 1, dateTest: -1 });
stockGerminationTestSchema.index({ dateTest: -1 });

module.exports = mongoose.model('StockGerminationTest', stockGerminationTestSchema);
