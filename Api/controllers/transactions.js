const { escapeRegExp } = require('lodash');
const dayjs = require('dayjs');

const Transaction = require('../models/transaction');
const { SendData, ServerError, NotFound } = require('../helpers/response');
const getter = require('../helpers/getter');

/**
 * Builds the Mongo filter for the logged user from the (already validated) query string.
 * Every query is scoped to the owner, so a user can never read or change someone else's entries.
 */
const buildFilter = (user, { type, category, search, from, to }) => {
  const filter = { user: user._id };

  if (type) filter.type = type;
  if (category) filter.category = new RegExp(`^${escapeRegExp(category)}$`, 'i');
  if (search) {
    const regex = new RegExp(escapeRegExp(search), 'i');
    filter.$or = [{ description: regex }, { category: regex }];
  }
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = dayjs(from).startOf('day').toDate();
    if (to) filter.date.$lte = dayjs(to).endOf('day').toDate();
  }

  return filter;
};

module.exports.get = async (req, res, next) => {
  try {
    const filter = buildFilter(res.locals.user, req.query);
    if (!req.query.sorter) req.query.sorter = '-date';

    const data = await getter(Transaction, filter, req, res);

    return next(SendData(data));
  } catch (err) {
    return next(ServerError(err));
  }
};

module.exports.summary = async (req, res, next) => {
  try {
    const filter = buildFilter(res.locals.user, req.query);

    const totals = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const byType = totals.reduce((acc, { _id, total, count }) => ({ ...acc, [_id]: { total, count } }), {});
    const income = byType.income?.total || 0;
    const expense = byType.expense?.total || 0;

    return next(
      SendData({
        income,
        expense,
        balance: income - expense,
        count: (byType.income?.count || 0) + (byType.expense?.count || 0)
      })
    );
  } catch (err) {
    return next(ServerError(err));
  }
};

module.exports.create = async ({ body }, { locals: { user } }, next) => {
  try {
    const data = await new Transaction({ ...body, user: user._id }).save();

    return next(SendData(data.response(), 201));
  } catch (err) {
    return next(ServerError(err));
  }
};

module.exports.getById = async ({ params: { id } }, { locals: { user } }, next) => {
  try {
    const data = await Transaction.findOne({ _id: id, user: user._id });
    if (!data) return next(NotFound());

    return next(SendData(data.response()));
  } catch (err) {
    return next(ServerError(err));
  }
};

module.exports.update = async ({ params: { id }, body }, { locals: { user } }, next) => {
  try {
    const data = await Transaction.findOne({ _id: id, user: user._id });
    if (!data) return next(NotFound());

    Object.assign(data, body);
    await data.save();

    return next(SendData(data.response()));
  } catch (err) {
    return next(ServerError(err));
  }
};

module.exports.delete = async ({ params: { id } }, { locals: { user } }, next) => {
  try {
    const { deletedCount } = await Transaction.deleteOne({ _id: id, user: user._id });
    if (!deletedCount) return next(NotFound());

    return next(SendData({ message: 'Transaction deleted successfully' }));
  } catch (err) {
    return next(ServerError(err));
  }
};
