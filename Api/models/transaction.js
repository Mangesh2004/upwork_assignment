const mongoose = require('mongoose');
const dbFields = require('../helpers/dbFields');

const { Schema } = mongoose;

const TRANSACTION_TYPES = ['income', 'expense'];

const schema = Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true
    },
    // Integer amount in cents, so totals never suffer from floating point rounding
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'amount must be an integer number of cents' }
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64
    },
    description: {
      type: String,
      trim: true,
      maxlength: 256
    },
    date: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

schema.index({ user: 1, date: -1 });

const responseFields = ['_id', 'type', 'amount', 'category', 'description', 'date', 'createdAt', 'updatedAt'];

schema.plugin(dbFields, {
  fields: {
    public: responseFields,
    listing: responseFields
  }
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', schema);
module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
