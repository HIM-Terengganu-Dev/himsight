import { Pool } from 'pg';

function getPool() {
  const connectionString = process.env.HIM_WELLNESS_TTDI_DB;
  
  if (!connectionString) {
    throw new Error(
      'HIM_WELLNESS_TTDI_DB environment variable is not set. ' +
      'Please check your .env.local file.'
    );
  }

  return new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased timeout
  });
}

const pool = getPool();

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export default pool;
