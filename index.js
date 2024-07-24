import 'dotenv/config';
import './listen-to-logs.js';
import { listenToQueue } from './rabbitmq.js';
import { build } from './docker/build.js';
import { run } from './docker/run.js';
import db from './db.js';

listenToQueue('testrun', async (messageStr) => {
  let message;
  try {
    message = JSON.parse(messageStr);
  } catch (err) {
    console.error('Failed to parse message from queue testrun');
    return;
  }

  console.log('Got message: ', message);

  try {
    await build(message.name, 'testrun');
  } catch (err) {
    console.error(`Failed to build docker file for ${message.name}`, err);
    return;
  }

  let logs;
  try {
    logs = await run(message.name, 'testrun');
  } catch (err) {
    console.error(`Failed to run docker file for ${message.name}`, err);
  }

  try {
    await db.query`
      INSERT INTO repo_logs (github_repos_name, logs)
      VALUES (${message.name}, ${JSON.stringify(logs)}::jsonb)
    `;
  } catch (err) {
    console.error('Error saving to postgres', err);
  }

  console.log('logs after docker run: ', logs);
});

listenToQueue('exex', async (messageStr) => {
  console.log('messageStr: ', messageStr);
  const message = JSON.parse(messageStr);
  console.log('message : ', message);
});
