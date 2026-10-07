const bcrypt = require('bcryptjs');
const User = require('../models/user');
const {
  SendData,
  ServerError,
  NotFound,
  EmailAlreadyExists,
  InactiveAccount,
  WrongEmail,
  WrongPassword
} = require('../helpers/response');
const { generateToken, clearTokens } = require('../helpers/auth');
const { langs, defaultLang } = require('../config');

const toProfile = user => ({ id: user.id, email: user.email, ...user.response('profile') });

exports.login = async ({ body: { email, password } }, res, next) => {
  try {
    const user = await User.findOne(
      { email: email.toLowerCase() },
      { ...User.getProjectFields('profile'), email: 1, password: 1, active: 1 }
    );
    if (!user) return next(WrongEmail());

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(WrongPassword());
    if (!user.active) return next(InactiveAccount());

    await generateToken(res, user);

    return next(SendData(toProfile(user)));
  } catch (e) {
    return next(ServerError(e));
  }
};

exports.check = async (req, { locals: { user } }, next) => next(SendData(toProfile(user)));

exports.checkIfEmailExists = async ({ params: { email } }, res, next) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() }, { _id: 1, email: 1 });
    if (!user) return next(NotFound());

    return next(SendData({ message: 'Email exists!', id: user.id, email: user.email }));
  } catch (err) {
    return next(ServerError(err));
  }
};

exports.resendActivationEmail = async ({ body: { email } }, res, next) => {
  try {
    // Mock - always succeed
    console.log(`[MOCK] Resend activation email to: ${email}`);
    return next(SendData());
  } catch (e) {
    return next(ServerError(e));
  }
};

exports.register = async ({ body }, res, next) => {
  try {
    if (!body.lang || !langs.includes(body.lang.toLowerCase())) body.lang = defaultLang;

    if (await User.exists({ email: body.email.toLowerCase() })) return next(EmailAlreadyExists());

    // Accounts are activated immediately: this project has no email delivery for activation links
    const user = await new User({ ...body, active: true, roles: ['user'] }).save();
    await generateToken(res, user);

    return next(SendData(toProfile(user)));
  } catch (e) {
    return next(ServerError(e));
  }
};

exports.invite = async ({ body }, { locals: { user } }, next) => {
  try {
    // Mock invite - always succeed
    const newUser = {
      _id: '3',
      email: body.email,
      name: body.name || 'Invited User',
      response() {
        return {
          id: this._id,
          email: this.email,
          name: this.name
        };
      }
    };
    return next(SendData(newUser.response()));
  } catch (err) {
    return next(ServerError(err));
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { user } = res.locals;
    await generateToken(res, user);

    return next(SendData(toProfile(user)));
  } catch (e) {
    return next(ServerError(e));
  }
};

exports.logout = async (req, res, next) => {
  clearTokens(res);
  return next(SendData({ message: 'Logout succesfully!' }));
};

exports.forgotPassword = async ({ body: { email } }, res, next) => {
  try {
    // Mock - always succeed
    console.log(`[MOCK] Forgot password for: ${email}`);
    return next(SendData());
  } catch (err) {
    return next(ServerError(err));
  }
};

exports.restoreUser = async ({ body: { email } }, res, next) => {
  try {
    // Mock - always succeed
    console.log(`[MOCK] Restore user: ${email}`);
    return next(SendData());
  } catch (err) {
    return next(ServerError(err));
  }
};

exports.changePassword = async ({ params: { email }, body: { password } }, res, next) => {
  try {
    // Mock - always succeed
    console.log(`[MOCK] Change password for: ${email}`);
    res.clearCookie('accessToken', {
      httpOnly: true,
      sameSite: 'strict',
      path: '/'
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      path: '/'
    });
    return next(SendData({ message: 'Password changed successfully' }));
  } catch (err) {
    return next(ServerError(err));
  }
};
