const User = require('../models/user');

const DEMO_USER = {
  email: 'test@meblabs.com',
  password: 'testtest',
  name: 'Test',
  lastname: 'User',
  lang: 'EN',
  active: true,
  roles: ['superuser']
};

/**
 * Creates the demo account documented in the README if it does not exist yet.
 * Same user as migrations/1688550513962-superuser.js, without requiring the migrate CLI.
 */
module.exports = async () => {
  if (await User.exists({ email: DEMO_USER.email })) return false;

  await new User(DEMO_USER).save();
  return true;
};
