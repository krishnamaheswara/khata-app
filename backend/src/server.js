import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kirana Khata API',
      version: '1.0.0',
      description: 'API for customer registration, khata entries, payments, debts, and store management.'
    },
    servers: [{ url: 'http://localhost:4000' }]
  },
  apis: ['./backend/src/server.js']
});

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/khataapp'
});

const resolveCustomerForEntry = async (customerId, customerName, phone) => {
  let resolvedCustomerId = customerId ? Number(customerId) : null;
  let resolvedCustomerName = (customerName || '').trim();

  if (resolvedCustomerId) {
    const customerResult = await pool.query(
      'SELECT id, name FROM customers WHERE id = $1 LIMIT 1',
      [resolvedCustomerId]
    );

    if (!customerResult.rows.length) {
      throw new Error('Selected customer was not found');
    }

    resolvedCustomerName = customerResult.rows[0].name;
    return { resolvedCustomerId, resolvedCustomerName };
  }

  if (!resolvedCustomerName) {
    throw new Error('Please select a customer before saving the entry');
  }

  const existingCustomer = await pool.query(
    'SELECT id, name FROM customers WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [resolvedCustomerName]
  );

  if (existingCustomer.rows.length) {
    resolvedCustomerId = existingCustomer.rows[0].id;
    resolvedCustomerName = existingCustomer.rows[0].name;
  } else {
    const createdCustomer = await pool.query(
      `INSERT INTO customers (name, phone, address)
       VALUES ($1, $2, $3)
       RETURNING id, name`,
      [resolvedCustomerName, phone || '', '']
    );
    resolvedCustomerId = createdCustomer.rows[0].id;
    resolvedCustomerName = createdCustomer.rows[0].name;
  }

  return { resolvedCustomerId, resolvedCustomerName };
};

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: API is running
 */
app.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'Khata API is running' });
});

app.get('/api/summary', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END),0) AS credit_total,
        COALESCE(SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END),0) AS debt_total,
        COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END),0) AS payment_total
      FROM entries
    `);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch summary', error: error.message });
  }
});

app.get('/api/entries', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM entries ORDER BY entry_date DESC, id DESC');
    const normalized = result.rows.map((row) => ({
      ...row,
      customer_name: row.customer_name || row.customer || ''
    }));
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch entries', error: error.message });
  }
});

app.post('/api/entries', async (req, res) => {
  const { customerId, customerName, phone, amount, type, entryDate, notes } = req.body;
  try {
    const { resolvedCustomerId, resolvedCustomerName } = await resolveCustomerForEntry(customerId, customerName, phone);

    const result = await pool.query(
      `INSERT INTO entries (customer_id, customer_name, customer, phone, amount, type, entry_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [resolvedCustomerId, resolvedCustomerName, resolvedCustomerName, phone || '', Number(amount), type, entryDate || new Date().toISOString().slice(0, 10), notes || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    const statusCode = error.message === 'Selected customer was not found' || error.message === 'Please select a customer before saving the entry' ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Unable to create entry', error: error.message });
  }
});

app.put('/api/entries/:id', async (req, res) => {
  const { id } = req.params;
  const { customerId, customerName, phone, amount, type, entryDate, notes } = req.body;
  try {
    const { resolvedCustomerId, resolvedCustomerName } = await resolveCustomerForEntry(customerId, customerName, phone);

    const result = await pool.query(
      `UPDATE entries
       SET customer_id = $1,
           customer_name = $2,
           customer = $3,
           phone = $4,
           amount = $5,
           type = $6,
           entry_date = $7,
           notes = $8
       WHERE id = $9
       RETURNING *`,
      [resolvedCustomerId, resolvedCustomerName, resolvedCustomerName, phone || '', Number(amount), type, entryDate || new Date().toISOString().slice(0, 10), notes || '', id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    const statusCode = error.message === 'Selected customer was not found' || error.message === 'Please select a customer before saving the entry' ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Unable to update entry', error: error.message });
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    const monthFilter = String(req.query.month || '').trim();
    const yearFilter = String(req.query.year || '').trim();

    const customersResult = await pool.query(`
      SELECT c.*, s.name AS store_name
      FROM customers c
      LEFT JOIN stores s ON s.id = c.store_id
      ORDER BY c.name
    `);
    const entriesResult = await pool.query(
      'SELECT customer_id, customer_name, customer, type, amount, entry_date FROM entries'
    );

    const filteredEntries = entriesResult.rows.filter((entry) => {
      const entryDate = entry.entry_date ? String(entry.entry_date) : '';
      const entryYear = entryDate.slice(0, 4);
      const entryMonth = entryDate.slice(5, 7);
      const matchesYear = yearFilter ? entryYear === yearFilter : true;
      const normalizedMonth = monthFilter ? monthFilter.padStart(2, '0') : '';
      const matchesMonth = monthFilter ? (monthFilter.includes('-') ? entryDate.slice(0, 7) === monthFilter : entryMonth === normalizedMonth) : true;
      return matchesYear && matchesMonth;
    });

    const customersWithBalances = customersResult.rows.map((customer) => {
      const totals = filteredEntries.reduce(
        (acc, entry) => {
          const entryCustomerId = entry.customer_id ? Number(entry.customer_id) : null;
          const entryName = (entry.customer_name || entry.customer || '').trim().toLowerCase();
          const customerName = (customer.name || '').trim().toLowerCase();
          const matchesCustomer = entryCustomerId === Number(customer.id) || (!entryCustomerId && entryName === customerName);

          if (!matchesCustomer) {
            return acc;
          }

          if (entry.type === 'credit') {
            acc.credit_total += Number(entry.amount || 0);
          } else if (entry.type === 'debt') {
            acc.debt_total += Number(entry.amount || 0);
          } else if (entry.type === 'payment') {
            acc.payment_total += Number(entry.amount || 0);
          }

          return acc;
        },
        { credit_total: 0, debt_total: 0, payment_total: 0 }
      );

      return {
        ...customer,
        credit_total: Number(totals.credit_total || 0),
        debt_total: Number(totals.debt_total || 0),
        payment_total: Number(totals.payment_total || 0),
        balance_total: Number(totals.credit_total || 0) - Number(totals.debt_total || 0) - Number(totals.payment_total || 0)
      };
    });

    res.json(customersWithBalances);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch customers', error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, address, storeId } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO customers (name, phone, address, store_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, phone || '', address || '', storeId ? Number(storeId) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create customer', error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, storeId } = req.body;
  try {
    const result = await pool.query(
      `UPDATE customers SET name = $1, phone = $2, address = $3, store_id = $4 WHERE id = $5 RETURNING *`,
      [name, phone || '', address || '', storeId ? Number(storeId) : null, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update customer', error: error.message });
  }
});

app.get('/api/stores', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stores ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch stores', error: error.message });
  }
});

app.post('/api/stores', async (req, res) => {
  const { name, owner, phone, address } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO stores (name, owner, phone, address) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, owner || '', phone || '', address || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create store', error: error.message });
  }
});

app.put('/api/stores/:id', async (req, res) => {
  const { id } = req.params;
  const { name, owner, phone, address } = req.body;
  try {
    const result = await pool.query(
      `UPDATE stores SET name = $1, owner = $2, phone = $3, address = $4 WHERE id = $5 RETURNING *`,
      [name, owner || '', phone || '', address || '', id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update store', error: error.message });
  }
});

app.get('/api/analytics', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT TO_CHAR(entry_date, 'YYYY-MM') AS month,
        SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) AS credit_total,
        SUM(CASE WHEN type='debt' THEN amount ELSE 0 END) AS debt_total,
        SUM(CASE WHEN type='payment' THEN amount ELSE 0 END) AS payment_total
      FROM entries
      GROUP BY TO_CHAR(entry_date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch analytics', error: error.message });
  }
});

const server = app.listen(port, () => {
  console.log(`Khata API listening on port ${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing backend process and try again.`);
    process.exit(1);
  }
  throw error;
});
