const transactionType = { type: 'string', enum: ['income', 'expense'] };
const amount = { type: 'integer', minimum: 1, maximum: 100000000000 };
const category = { type: 'string', minLength: 1, maxLength: 64, isNotEmpty: true };
const description = { type: 'string', maxLength: 256 };
const date = { type: 'string', format: 'date' };

module.exports = {
  createTransaction: {
    $id: 'createTransaction',
    type: 'object',
    properties: {
      type: transactionType,
      amount,
      category,
      description,
      date
    },
    required: ['type', 'amount', 'category', 'date'],
    additionalProperties: false
  },
  updateTransaction: {
    $id: 'updateTransaction',
    type: 'object',
    properties: {
      type: transactionType,
      amount,
      category,
      description,
      date
    },
    minProperties: 1,
    additionalProperties: false
  },
  listTransactions: {
    $id: 'listTransactions',
    type: 'object',
    properties: {
      type: transactionType,
      category: { type: 'string', maxLength: 64 },
      search: { type: 'string', maxLength: 128 },
      from: date,
      to: date,
      sorter: { type: 'string', enum: ['date', '-date', 'amount', '-amount', 'createdAt', '-createdAt'] },
      limit: { type: 'integer', minimum: 0, maximum: 500 },
      count: { type: 'boolean' },
      nextKey: { type: 'string' }
    },
    additionalProperties: false
  }
};
