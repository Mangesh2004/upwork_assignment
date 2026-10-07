import dayjs from 'dayjs';
import config from '../config';

export const API_DATE_FORMAT = 'YYYY-MM-DD';

export const CATEGORY_SUGGESTIONS = {
  expense: [
    'Groceries',
    'Rent',
    'Utilities',
    'Transport',
    'Restaurants',
    'Health',
    'Entertainment',
    'Shopping',
    'Other'
  ],
  income: ['Salary', 'Freelance', 'Investments', 'Gift', 'Refund', 'Other']
};

// The API stores amounts as integer cents
export const toCents = value => Math.round(Number(value) * 100);
export const fromCents = cents => cents / 100;

const moneyFormatter = new Intl.NumberFormat(config.defaultCostFormat, {
  style: 'currency',
  currency: config.defaultCurrency
});

export const formatMoney = cents => moneyFormatter.format(fromCents(cents));

// Entries are calendar days: parse only the date part so the day never shifts with the browser timezone
export const toDay = value => dayjs(String(value).slice(0, 10), API_DATE_FORMAT);
