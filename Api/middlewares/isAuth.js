const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { Unauthorized, MissingRefreshToken, UnauthorizedRefreshToken } = require('../helpers/response');

const sessionFields = { ...User.getProjectFields('profile'), email: 1, roles: 1, active: 1 };

/**
 * Verifies the JWT stored in `cookieName` and loads the matching active user into res.locals.user.
 */
const authenticate =
  (cookieName, { missing = Unauthorized, invalid = Unauthorized } = {}) =>
  async (req, res, next) => {
    const token = req.cookies?.[cookieName];
    if (!token) return next(missing());

    try {
      const { id } = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await User.findOne({ _id: id, active: true }, sessionFields);
      if (!user) return next(invalid());

      res.locals.user = user;
      return next();
    } catch (err) {
      return next(invalid());
    }
  };

const isAuth = authenticate('accessToken');

const isAuthRt = authenticate('refreshToken', { missing: MissingRefreshToken, invalid: UnauthorizedRefreshToken });

// Logging out only clears cookies, so it must work even with an expired session
const isAuthRtlogout = (req, res, next) => next();

// The password reset flow of the template is still mocked (no email delivery in this project)
const isAuthChangePassword = (req, res, next) => next();

module.exports = {
  isAuth,
  isAuthRt,
  isAuthRtlogout,
  isAuthChangePassword
};
