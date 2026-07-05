import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/khataapp'
});

const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      address TEXT,
      store_id INTEGER REFERENCES stores(id),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stores (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      owner VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id),
      customer_name VARCHAR(255),
      customer VARCHAR(255),
      phone VARCHAR(50),
      amount NUMERIC(12,2) NOT NULL,
      type VARCHAR(20) NOT NULL,
      entry_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS store_id INTEGER;
  `);

  await pool.query(`
    ALTER TABLE entries
      ADD COLUMN IF NOT EXISTS customer_id INTEGER,
      ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS customer VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS type VARCHAR(20),
      ADD COLUMN IF NOT EXISTS entry_date DATE,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `);

  await pool.query(`
    UPDATE entries
    SET customer_name = COALESCE(customer_name, customer)
    WHERE customer_name IS NULL AND customer IS NOT NULL;
  `);

  const firstStoreResult = await pool.query('SELECT id FROM stores ORDER BY id LIMIT 1');
  const firstStoreId = firstStoreResult.rows[0]?.id;

  if (firstStoreId) {
    await pool.query(
      `UPDATE customers
       SET store_id = $1
       WHERE store_id IS NULL`,
      [firstStoreId]
    );
  }

  console.log('Database initialized');
  await pool.end();
};

init().catch((error) => {
  console.error(error);
  process.exit(1);
});
