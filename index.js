import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';

import './listen-to-logs.js';
// import './listen-to-protobuf.js';
import { listenToQueue } from './rabbitmq.js';
import { build } from './docker/build.js';
import { run } from './docker/run.js';
import db from './db.js';

const { ABSOLUTE_DATA_FILE_PATH } = process.env;

listenToQueue('testrun', async (messageStr) => {
  let message;
  try {
    message = JSON.parse(messageStr);
  } catch (err) {
    console.error('Failed to parse message from queue testrun');
    return;
  }

  console.log('Got message for "testrun": ', message);

  try {
    await build(message.name, 'testrun');
  } catch (err) {
    console.error(`Failed to build docker file for ${message.name}`, err);
    return;
  }

  const dirname = process.cwd();

  let logs;
  try {
    logs = await run(message.name, 'testrun', `test-data.json`);
  } catch (err) {
    console.error(`Failed to run docker file for ${message.name}`, err);
  }

  try {
    await db.query`
      INSERT INTO repo_logs (github_repos_name, logs, branch)
      VALUES (${message.name}, ${JSON.stringify(logs)}::jsonb, 'testrun')
    `;
  } catch (err) {
    console.error('Error saving to postgres', err);
  }

  console.log('logs after docker run: ', logs);
});

listenToQueue('main', async (messageStr) => {
  let message;
  try {
    message = JSON.parse(messageStr);
  } catch (err) {
    console.error('Failed to parse message from queue testrun');
    return;
  }

  console.log('Got message: ', message);

  try {
    await build(message.name, 'main');
  } catch (err) {
    console.error(`Failed to build docker file for ${message.name}`, err);
    return;
  }

  try {
    await db.query`
      UPDATE deployments
      SET is_active = false
      WHERE repo_name = ${message.name}
    `;

    await db.query`
      INSERT INTO deployments (repo_name, is_active)
      VALUES (${message.name}, true)
    `;
  } catch (err) {
    console.error('Error saving to postgres', err);
  }
});

listenToQueue('exex', async (messageStr) => {
  console.log('Got new message');
  // let data;
  // try {
  //   console.time('parse');
  //   data = JSON.parse(messageStr);
  //   console.timeEnd('parse');
  // } catch (err) {
  //   console.timeEnd('parse');
  //   console.error('Failed to parse exex message');
  //   return;
  // }

  try {
    console.log('will handle exex here');
    // const dirname = process.cwd();
    // console.log('dirname : ', dirname);

    // const filePath = `${dirname}/exex-data.json`;
    // await fs.writeFile(filePath, messageStr);

    // const sharedDataPath = '/app/shared_data';
    // const filename = 'message_data.json';
    // const filePath = path.join(sharedDataPath, filename);

    const filename = 'exex-data.json';
    const filePath = path.join('/app/shared_data', filename);

    await fs.writeFile(filePath, JSON.stringify(messageStr), { flag: 'w' });

    const { rows } = await db.query`
      select * from deployments
      where is_active = true
    `;

    await Promise.all(
      rows.map(async (row) => {
        let logs;
        try {
          logs = await run(row.repo_name, 'main', filename);
        } catch (err) {
          console.error('Failed to run container for row: ', row);
          console.error('err: ', err);
          return;
        }

        try {
          await db.query`
              INSERT INTO repo_logs (github_repos_name, logs, branch)
              VALUES (${row.repo_name}, ${JSON.stringify(logs)}::jsonb, 'main')
            `;
        } catch (err) {
          console.error('Error saving to postgres', err);
        }
      }),
    );

    console.log('rows: ', rows);

    // Create timestamp for filename
    // const timestamp = new Date().getTime();
    // const fileName = `${timestamp}.json`;

    // // Ensure the block_data directory exists
    // const dir = 'block_data';
    // try {
    //   await fs.access(dir);
    // } catch {
    //   await fs.mkdir(dir, { recursive: true });
    // }

    // // Create full file path
    // const filePath = path.join(dir, fileName);

    // // Write data to file
    // await fs.writeFile(filePath, messageStr);
    // console.log(`File written successfully: ${filePath}`);
  } catch (err) {
    console.error('Error writing file:', err);
  }
});
