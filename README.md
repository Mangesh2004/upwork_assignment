# Web assessment (React, Node.js)

## Solution: Expense and Income Diary

A diary to record daily incomes and expenses, with full CRUD, filters and running totals.

- **Frontend** (`FrontEnd/src/routes/Transactions.jsx`): Ant Design table with sorting, filters by type, date range (with presets) and text search, summary cards (total income, total expenses, balance) and an add/edit dialog. Responsive, English and Italian translations.
- **API** (`Api/routes/transactions.js`): REST endpoints, validated with the template's AJV validator and documented in Swagger at `http://localhost:8000/api-docs`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/transactions` | List the logged user's entries. Query: `type`, `category`, `search`, `from`, `to`, `sorter`, `limit`, `count` |
| `GET` | `/transactions/summary` | Income, expense and balance totals for the same filters |
| `POST` | `/transactions` | Create an entry: `type` (`income`/`expense`), `amount` (cents), `category`, `date` (`YYYY-MM-DD`), `description` (optional) |
| `GET` | `/transactions/:id` | Read one entry |
| `PATCH` | `/transactions/:id` | Update one or more fields |
| `DELETE` | `/transactions/:id` | Delete an entry |

### Run it

Requires Docker.

```bash
docker compose up -d
```

- App: `http://localhost:3000`, login `test@meblabs.com` / `testtest` (the demo user is created automatically on first start)
- API: `http://localhost:8000`, Swagger docs at `http://localhost:8000/api-docs`

### Run the API tests

The tests (`Api/specs/transactions.test.js`, Jest + Supertest) run against a separate, disposable database on the MongoDB container:

```bash
docker compose run --rm --no-deps api sh -c 'MONGO_TEST_URI="mongodb://$MONGO_INITDB_ROOT_USERNAME:$MONGO_INITDB_ROOT_PASSWORD@mongo:27017/transactions_test?authSource=admin" npm run test:transactions'
```

They cover authentication, validation of every field, filtering, sorting, totals, and that a user can never read, change or delete another user's entries.

### Design decisions

- **Amounts are stored as integer cents**, so totals never suffer floating point rounding. The UI converts to and from currency values (the template's `centsBasedCosts` setting).
- **Every query is scoped to the logged user.** Another user's entry returns `404`, so the API does not reveal that it exists.
- **Dates are calendar days** (`YYYY-MM-DD`), and the UI parses only the date part, so an entry never shifts by a day in other timezones.
- **Search input is escaped** before building the regular expression, so user input cannot inject regex patterns.
- **Pagination happens in the browser**, which is enough for a personal diary. The API already supports cursor pagination (`limit`, `nextKey`) through the template's `getter` helper.

### Changes to the template

- **Authentication:** login accepted any email and password and `isAuth` let every request through. Login now checks the password against MongoDB, and `isAuth` verifies the JWT cookie and loads the user.
- **Validator bug:** the validator middleware called `next()` again after reporting an error, so invalid requests still reached the controller. It now stops at the first error.
- **Dev environment:** Docker Compose runs MongoDB, the API (port 8000) and the frontend (port 3000) end to end.
- **Template test suites:** `specs/auth`, `specs/users`, `specs/companies` and `specs/s3` import an auth helper (`genereteAuthToken`) that does not exist in this template, so they are excluded in `jest.config.js`. `npm test` runs the transactions suite and the template's `mongooseHistory` suite.

### With more time

Server-side pagination with infinite scroll, charts per category and month, CSV export, a real password reset flow, and rewriting the template's excluded test suites.

---

This repository is designed to test the technical skills of candidates for a full stack developer position. It consists of the following structure:

- **Api**: The backend folder built with Node.js.
- **Frontend**: The frontend folder built with React and Ant Design.

### Objective

Expense and Income Diary: Create an application to track daily expenses and incomes. Users should be able to add, read, update, and delete expense and income entries.

### Task Description

1. **Clone this repository** to your local machine.
2. Create a new repository on your own GitHub account.
3. Push the cloned repository to your new GitHub repository.
4. Implement a small API that performs CRUD operations as specified.
5. Create a frontend application to interact with the CRUD API.


**Note**:
The template provides several features, helpers, and middleware for the backend, and components for the frontend. It is up to the candidate to choose whether to use them or not. You are not required to overdo or spend excessive time on this task. The exercise will be a discussion point, where you can justify your choices and explain any features you omitted due to time constraints or other reasons.

### Commit Guidelines

Please make your commits in a structured and meaningful way. Ideally, follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

### Evaluation Criteria

1. **Code Quality**: Clean, well-structured, and commented code.
2. **Functionality**: The CRUD operations work as expected and are tested in the `api/specs` folder.
3. **UI/UX**: The frontend is user-friendly and visually appealing.

### Requirements

- [Node.js](https://nodejs.org/) (use version 20.x)
- [npm](https://www.npmjs.com/)
- [VSCode](https://code.visualstudio.com/) (recommended extensions: [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode))

### Getting Started

1. Clone the repository.
2. Install the packages with `npm install` in both the `api` and `frontend` folders.
3. Visit `http://localhost` to access the application. Use the following credentials, created by the seed process, to log in:
   - **Email**: `test@meblabs.com`
   - **Password**: `testtest`
4. Start coding!

### Submission

- Record a 3-5mins of [Loom video](https://www.loom.com) showing how it works, including the expected and actual behavior if you're testing.
- Once you’ve completed the tasks, send the result to https://forms.gle/1E2z5713vGV9vhr4A.
- Please make sure that your repository is **public** or share access if it's private.

### Deadline

Please complete and submit the result within 2 hour since you accepted the invitation, unless otherwise discussed.