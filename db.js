import pkg from 'pg';
const { Pool } = pkg;
const { POSTGRES_URL } = process.env;

console.log('POSTGRES_URL : ', POSTGRES_URL);

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


const chunkSize = 100;
export async function insertLogs(repoName, logs, branch, db) {
  try {

    for (let i = 0; i < logs.length; i += chunkSize) {
      const chunkLogs = logs.slice(i, i + chunkSize);

      await db.query`
        INSERT INTO repo_logs (github_repos_name, logs, branch)
        VALUES (${repoName}, ${JSON.stringify(chunkLogs)}::jsonb, ${branch})
      `;
    }
  } catch (err) {
    console.error('Error saving logs to postgres:', err);
    throw err;
  }
}

