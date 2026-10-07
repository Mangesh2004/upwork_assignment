const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

if (process.env.ENV === 'dev' && fs.existsSync(path.resolve(__dirname, '.env.development'))) {
  dotenv.config({
    path: path.resolve(__dirname, '.env.development'),
    override: true
  });
} else {
  dotenv.config();
}

const app = require('./app');

const connection = require('./db/connect');
const ensureDemoUser = require('./db/ensureDemoUser');

connection
  .asPromise()
  .then(async () => {
    if (process.env.ENV === 'dev' && (await ensureDemoUser()))
      console.warn('[Seed] Demo user test@meblabs.com created');

    app.listen(process.env.PORT || 8000, () => {
      console.warn(`Server running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch(error => {
    console.error('API startup failed:', error.message);
    process.exit(1);
  });
