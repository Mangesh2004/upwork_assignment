const supertest = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const db = require('../db/connect-test');
const User = require('../models/user');
const Transaction = require('../models/transaction');

jest.mock('../helpers/secrets.js');

const PASSWORD = 'testtest';

const createUser = email => new User({ email, password: PASSWORD, name: 'Test', active: true, roles: ['user'] }).save();

const loginAgent = async email => {
  const agent = supertest.agent(app);
  await agent.post('/auth/login').send({ email, password: PASSWORD }).expect(200);
  return agent;
};

const entry = (overrides = {}) => ({
  type: 'expense',
  amount: 1250,
  category: 'Groceries',
  description: 'Weekly shopping',
  date: '2026-10-05',
  ...overrides
});

let alice;
let bob;
let aliceAgent;
let bobAgent;

beforeAll(async () => await db.connect());
beforeEach(async () => {
  await db.clear();
  [alice, bob] = await Promise.all([createUser('alice@example.com'), createUser('bob@example.com')]);
  [aliceAgent, bobAgent] = await Promise.all([loginAgent('alice@example.com'), loginAgent('bob@example.com')]);
});
afterEach(async () => await jest.clearAllMocks());
afterAll(async () => await db.close());

describe('Authentication', () => {
  test('Requests without a session are rejected', async () => {
    await supertest(app).get('/transactions').expect(401);
    await supertest(app).post('/transactions').send(entry()).expect(401);
  });

  test('Login fails with a wrong password', async () => {
    const res = await supertest(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'nope' })
      .expect(400);
    expect(res.body.error).toBe(301);
  });

  test('Login fails with an unknown email', async () => {
    const res = await supertest(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: PASSWORD })
      .expect(400);
    expect(res.body.error).toBe(300);
  });

  test('/auth/check returns the logged user', async () => {
    const res = await aliceAgent.get('/auth/check').expect(200);
    expect(res.body.email).toBe('alice@example.com');
  });
});

describe('POST /transactions', () => {
  test('Creates an entry owned by the logged user', async () => {
    const res = await aliceAgent.post('/transactions').send(entry()).expect(201);

    expect(res.body).toMatchObject({
      type: 'expense',
      amount: 1250,
      category: 'Groceries',
      description: 'Weekly shopping'
    });
    expect(res.body._id).toBeDefined();
    expect(res.body.user).toBeUndefined();

    const saved = await Transaction.findById(res.body._id, { user: 1 });
    expect(saved.user.toString()).toBe(alice.id);
  });

  test('Description is optional', async () => {
    const { description, ...withoutDescription } = entry();
    await aliceAgent.post('/transactions').send(withoutDescription).expect(201);
  });

  test.each(['amount', 'date', 'type', 'category'])('Rejects an entry without %s', async field => {
    const res = await aliceAgent
      .post('/transactions')
      .send(entry({ [field]: undefined }))
      .expect(400);
    expect(res.body.error).toBe(201);
  });

  test.each([
    ['an unknown type', { type: 'transfer' }],
    ['a zero amount', { amount: 0 }],
    ['a negative amount', { amount: -100 }],
    ['a decimal amount (amounts are cents)', { amount: 12.5 }],
    ['an invalid date', { date: '2026-13-45' }],
    ['an empty category', { category: '   ' }]
  ])('Rejects %s', async (_, overrides) => {
    await aliceAgent.post('/transactions').send(entry(overrides)).expect(400);
    expect(await Transaction.countDocuments()).toBe(0);
  });

  test('Rejects fields that are not part of the schema, such as a different owner', async () => {
    const res = await aliceAgent
      .post('/transactions')
      .send(entry({ user: bob.id }))
      .expect(400);
    expect(res.body.error).toBe(202);
    expect(await Transaction.countDocuments()).toBe(0);
  });
});

describe('GET /transactions', () => {
  beforeEach(async () => {
    await Promise.all([
      aliceAgent.post('/transactions').send(entry({ date: '2026-10-01', amount: 1000 })),
      aliceAgent.post('/transactions').send(entry({ date: '2026-10-03', amount: 2000, category: 'Rent' })),
      aliceAgent
        .post('/transactions')
        .send(
          entry({ type: 'income', category: 'Salary', description: 'October', date: '2026-10-02', amount: 300000 })
        ),
      bobAgent.post('/transactions').send(entry({ description: 'Bob private entry' }))
    ]);
  });

  test("Returns only the logged user's entries, newest date first", async () => {
    const res = await aliceAgent.get('/transactions').expect(200);

    expect(res.body).toHaveLength(3);
    expect(res.body.map(e => e.date.slice(0, 10))).toEqual(['2026-10-03', '2026-10-02', '2026-10-01']);
    expect(res.body.some(e => e.description === 'Bob private entry')).toBe(false);
  });

  test('Filters by type', async () => {
    const res = await aliceAgent.get('/transactions?type=income').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].category).toBe('Salary');
  });

  test('Filters by date range (inclusive)', async () => {
    const res = await aliceAgent.get('/transactions?from=2026-10-02&to=2026-10-03').expect(200);
    expect(res.body).toHaveLength(2);
  });

  test('Searches description and category, treating input as plain text', async () => {
    const byCategory = await aliceAgent.get('/transactions?search=rent').expect(200);
    expect(byCategory.body).toHaveLength(1);

    const regexLike = await aliceAgent.get(`/transactions?search=${encodeURIComponent('.*')}`).expect(200);
    expect(regexLike.body).toHaveLength(0);
  });

  test('Sorts by amount and returns the total count header', async () => {
    const res = await aliceAgent.get('/transactions?sorter=-amount&count=true').expect(200);
    expect(res.body.map(e => e.amount)).toEqual([300000, 2000, 1000]);
    expect(res.headers['x-total-count']).toBe('3');
  });

  test('Rejects unknown query parameters', async () => {
    await aliceAgent.get('/transactions?owner=someone').expect(400);
  });
});

describe('GET /transactions/summary', () => {
  test('Returns totals and balance in cents', async () => {
    await Promise.all([
      aliceAgent.post('/transactions').send(entry({ amount: 1250 })),
      aliceAgent.post('/transactions').send(entry({ amount: 750 })),
      aliceAgent.post('/transactions').send(entry({ type: 'income', category: 'Salary', amount: 10000 })),
      bobAgent.post('/transactions').send(entry({ amount: 99999 }))
    ]);

    const res = await aliceAgent.get('/transactions/summary').expect(200);
    expect(res.body).toEqual({ income: 10000, expense: 2000, balance: 8000, count: 3 });
  });

  test('Returns zeros when there are no entries', async () => {
    const res = await aliceAgent.get('/transactions/summary').expect(200);
    expect(res.body).toEqual({ income: 0, expense: 0, balance: 0, count: 0 });
  });
});

describe('Single entry: GET, PATCH, DELETE /transactions/:id', () => {
  let created;

  beforeEach(async () => {
    created = (await aliceAgent.post('/transactions').send(entry())).body;
  });

  test('Reads an own entry', async () => {
    const res = await aliceAgent.get(`/transactions/${created._id}`).expect(200);
    expect(res.body).toMatchObject({ _id: created._id, amount: 1250 });
  });

  test("Returns 404 for another user's entry, without revealing it exists", async () => {
    await bobAgent.get(`/transactions/${created._id}`).expect(404);
    await bobAgent.patch(`/transactions/${created._id}`).send({ amount: 1 }).expect(404);
    await bobAgent.delete(`/transactions/${created._id}`).expect(404);

    const untouched = await Transaction.findById(created._id);
    expect(untouched.amount).toBe(1250);
  });

  test('Returns 404 for an id that does not exist and 400 for a malformed id', async () => {
    await aliceAgent.get(`/transactions/${new mongoose.Types.ObjectId()}`).expect(404);
    await aliceAgent.get('/transactions/not-an-id').expect(400);
  });

  test('Updates only the provided fields', async () => {
    const res = await aliceAgent
      .patch(`/transactions/${created._id}`)
      .send({ amount: 4200, type: 'income', category: 'Refund' })
      .expect(200);

    expect(res.body).toMatchObject({
      amount: 4200,
      type: 'income',
      category: 'Refund',
      description: 'Weekly shopping'
    });
  });

  test('Rejects invalid or empty updates', async () => {
    await aliceAgent.patch(`/transactions/${created._id}`).send({ amount: -5 }).expect(400);
    await aliceAgent.patch(`/transactions/${created._id}`).send({}).expect(400);
    await aliceAgent.patch(`/transactions/${created._id}`).send({ user: bob.id }).expect(400);
  });

  test('Deletes an own entry', async () => {
    await aliceAgent.delete(`/transactions/${created._id}`).expect(200);
    await aliceAgent.get(`/transactions/${created._id}`).expect(404);
    await aliceAgent.delete(`/transactions/${created._id}`).expect(404);
  });
});
