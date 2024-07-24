import pkg from 'pg';
const { Pool } = pkg;
const { POSTGRES_URL } = process.env;

export const pool = new Pool({
  connectionString: POSTGRES_URL,
});

export const sql = (strings, ...values) => {
  return {
    text: strings.reduce((prev, curr, i) => prev + '$' + i + curr),
    values: values,
  };
};

export const query = async (queryObject) => {
  const client = await pool.connect();
  try {
    const result = await client.query(queryObject);
    return result;
  } finally {
    client.release();
  }
};

export default {
  query: (strings, ...values) => query(sql(strings, ...values)),
  sql,
};
