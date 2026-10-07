/**
 * @openapi
 * tags:
 *  name: Transactions
 *  description: Expense and income entries of the logged user
 */

/**
 *  @openapi
 *  components:
 *    schemas:
 *      TransactionInput:
 *        type: object
 *        properties:
 *          type:
 *            type: string
 *            enum: [income, expense]
 *          amount:
 *            type: integer
 *            minimum: 1
 *            description: Amount in cents (e.g. 1250 = 12.50)
 *            example: 1250
 *          category:
 *            type: string
 *            maxLength: 64
 *            example: Groceries
 *          description:
 *            type: string
 *            maxLength: 256
 *            example: Weekly shopping
 *          date:
 *            type: string
 *            format: date
 *            example: '2026-10-07'
 *      Transaction:
 *        allOf:
 *          - $ref: '#/components/schemas/TransactionInput'
 *          - type: object
 *            properties:
 *              _id:
 *                $ref: '#/components/definitions/ObjectId'
 *              createdAt:
 *                type: string
 *                format: date-time
 *              updatedAt:
 *                $ref: '#/components/definitions/UpdatedAt'
 */

const express = require('express');
const controller = require('../controllers/transactions');
const { isAuth } = require('../middlewares/isAuth');
const { validator } = require('../middlewares/validator');

const router = express.Router();

/**
 * @openapi
 *
 *  /transactions:
 *    get:
 *      summary: List the logged user's transactions (newest first by default)
 *      tags: [Transactions]
 *      parameters:
 *        - in: query
 *          name: type
 *          schema: { type: string, enum: [income, expense] }
 *        - in: query
 *          name: category
 *          schema: { type: string }
 *        - in: query
 *          name: search
 *          schema: { type: string }
 *        - in: query
 *          name: from
 *          schema: { type: string, format: date }
 *        - in: query
 *          name: to
 *          schema: { type: string, format: date }
 *        - in: query
 *          name: sorter
 *          schema: { type: string, enum: [date, -date, amount, -amount, createdAt, -createdAt] }
 *        - in: query
 *          name: limit
 *          schema: { type: integer }
 *        - in: query
 *          name: count
 *          description: When true the total count is returned in the x-total-count header
 *          schema: { type: boolean }
 *      responses:
 *        200:
 *          description: The list of transactions
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/Transaction'
 *        400:
 *          $ref: '#/components/responses/BadRequest'
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 *    post:
 *      summary: Create a transaction
 *      tags: [Transactions]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/TransactionInput'
 *                - required: [type, amount, category, date]
 *      responses:
 *        201:
 *          description: The created transaction
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Transaction'
 *        400:
 *          $ref: '#/components/responses/BadRequest'
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 */
router
  .route('/')
  .get(isAuth, validator({ query: 'listTransactions' }), controller.get)
  .post(isAuth, validator('createTransaction'), controller.create);

/**
 * @openapi
 *
 *  /transactions/summary:
 *    get:
 *      summary: Totals (in cents) of incomes, expenses and the balance, using the same filters as the list
 *      tags: [Transactions]
 *      parameters:
 *        - in: query
 *          name: type
 *          schema: { type: string, enum: [income, expense] }
 *        - in: query
 *          name: search
 *          schema: { type: string }
 *        - in: query
 *          name: from
 *          schema: { type: string, format: date }
 *        - in: query
 *          name: to
 *          schema: { type: string, format: date }
 *      responses:
 *        200:
 *          description: The totals
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  income: { type: integer }
 *                  expense: { type: integer }
 *                  balance: { type: integer }
 *                  count: { type: integer }
 *        401:
 *          $ref: '#/components/responses/Unauthorized'
 */
router.get('/summary', isAuth, validator({ query: 'listTransactions' }), controller.summary);

/**
 * @openapi
 *
 *  /transactions/{id}:
 *    parameters:
 *      - in: path
 *        name: id
 *        required: true
 *        schema:
 *          $ref: '#/components/definitions/ObjectId'
 *    get:
 *      summary: Get one of the logged user's transactions
 *      tags: [Transactions]
 *      responses:
 *        200:
 *          description: The transaction
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Transaction'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *    patch:
 *      summary: Update one or more fields of a transaction
 *      tags: [Transactions]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/TransactionInput'
 *      responses:
 *        200:
 *          description: The updated transaction
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Transaction'
 *        400:
 *          $ref: '#/components/responses/BadRequest'
 *        404:
 *          $ref: '#/components/responses/NotFound'
 *    delete:
 *      summary: Delete a transaction
 *      tags: [Transactions]
 *      responses:
 *        200:
 *          description: The transaction has been deleted
 *        404:
 *          $ref: '#/components/responses/NotFound'
 */
router
  .route('/:id')
  .get(isAuth, validator({ params: 'id' }), controller.getById)
  .patch(isAuth, validator({ params: 'id', body: 'updateTransaction' }), controller.update)
  .delete(isAuth, validator({ params: 'id' }), controller.delete);

module.exports = router;
