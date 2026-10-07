/* eslint-disable no-console */
const mongoose = require('mongoose');
const config = require('./config');

// MONGO_TEST_URI points to a dedicated, disposable database (it is wiped before every test).
// Without it an in-memory server is used, which needs the optional mongodb-memory-server package.
const getMongoUri = async () => {
  if (process.env.MONGO_TEST_URI) return process.env.MONGO_TEST_URI;

  // eslint-disable-next-line global-require, import/no-unresolved
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongoServer = await MongoMemoryServer.create();
  global.__MONGOINSTANCE = mongoServer;
  return mongoServer.getUri();
};

const connect = async () => {
  // Prevent MongooseError: Can't call `openUri()` on
  // an active connection with different connection strings
  await mongoose.disconnect();

  const mongoUri = await getMongoUri();
  return mongoose
    .set('strictQuery', false)
    .connect(mongoUri, config)
    .catch(err => {
      console.error(`[MongoDB-TEST] ${err} -- Retrying in 5s`);
    });
};

const close = async () => {
  try {
    await mongoose.disconnect();
    if (global.__MONGOINSTANCE) await global.__MONGOINSTANCE.stop();
  } catch (err) {
    console.error(err);
  }
};

const clear = async () => {
  const { collections } = mongoose.connection;

  return Promise.all(Object.keys(collections).map(key => collections[key].deleteMany())).catch(console.error);
};

module.exports = {
  connect,
  close,
  clear
};
