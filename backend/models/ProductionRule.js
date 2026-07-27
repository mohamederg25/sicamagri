/**
 * ProductionRule Model — Configurable Production Duration Rules
 * ==============================================================
 *
 * Defines production duration windows based on calendar sowing periods.
 * Instead of hardcoding durations, these rules are stored in the database
 * and can be managed by administrators via CRUD.
 *
 * How it works:
 *   - Each rule defines a sowing period (startDate → endDate)
 *   - When a production lot is created, the system finds the matching rule
 *     based on the sowing date
 *   - The rule provides productionMinDays / productionMaxDays / maturityWindowDays
 *   - Calculated dates are stored in the Lot for historical consistency
 *
 * Rule matching logic:
 *   - First tries to find a rule matching both the variete AND the period
 *   - Falls back to a rule matching only the period (variete = null)
 *   - The date range can span across year boundaries (e.g., Oct 1 → Feb 28)
 *
 * Fields:
 *   - sowingPeriodLabel  — Human-readable label (e.g., "Fin Décembre")
 *   - startDate          — Period start (Date)
 *   - endDate            — Period end (Date, can be next year for cross-year)
 *   - variete            — Optional: specific variety override
 *   - productionMinDays  — Minimum production duration in days
 *   - productionMaxDays  — Maximum production duration in days
 *   - maturityWindowDays — Duration of the maturity window (productionMaxDays - productionMinDays)
 *   - isActive           — Soft-enable/disable toggle
 *   - notes              — Optional notes / reason for the rule
 *
 * Code prefix: PXXX (ProductionRule) — e.g., P001, P042
 */

const mongoose = require('mongoose');

const productionRuleSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  sowingPeriodLabel: {
    type: String,
    required: [true, 'Le libellé de la période de semis est requis'],
    trim: true,
  },
  startDate: {
    type: Date,
    required: [true, 'La date de début est requise'],
  },
  endDate: {
    type: Date,
    required: [true, 'La date de fin est requise'],
    validate: {
      validator: function (value) {
        return value >= this.startDate;
      },
      message: 'La date de fin doit être postérieure ou égale à la date de début',
    },
  },
  variete: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variete',
    default: null,
  },
  productionMinDays: {
    type: Number,
    required: [true, 'La durée minimale de production est requise'],
    min: 1,
  },
  productionMaxDays: {
    type: Number,
    required: [true, 'La durée maximale de production est requise'],
    min: 1,
    validate: {
      validator: function (value) {
        return value >= this.productionMinDays;
      },
      message: 'La durée maximale doit être supérieure ou égale à la durée minimale',
    },
  },
  maturityWindowDays: {
    type: Number,
    required: [true, 'La fenêtre de maturité est requise'],
    min: 0,
    validate: {
      validator: function (value) {
        // The maturity window must equal productionMaxDays - productionMinDays
        const expected = this.productionMaxDays - this.productionMinDays;
        return value === expected;
      },
      message: function () {
        const expected = this.productionMaxDays - this.productionMinDays;
        return `La fenêtre de maturité doit être égale à la différence entre la durée max et la durée min (${this.productionMaxDays} - ${this.productionMinDays} = ${expected} jours). Valeur reçue : ${this.maturityWindowDays} jours`;
      },
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

// Indexes
productionRuleSchema.index({ startDate: 1, endDate: 1, isActive: 1 });
productionRuleSchema.index({ variete: 1, startDate: 1, endDate: 1 });
productionRuleSchema.index({ isActive: 1 });
productionRuleSchema.index({ code: -1 });  // Code generation

module.exports = mongoose.model('ProductionRule', productionRuleSchema);
