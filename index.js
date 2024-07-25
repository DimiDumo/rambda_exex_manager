import 'dotenv/config';
// import './listen-to-logs.js';
import './listen-to-protobuf.js';
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
  const timestamp = new Date().getTime();
  console.log('timestamp : ', timestamp);

  console.log('Got new message');
  console.time('parse');
  const parsed = JSON.parse(messageStr);
  console.timeEnd('parse');
  try {
    // Create timestamp for filename
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}.json`;

    // Ensure the block_data directory exists
    const dir = 'block_data';
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }

    // Create full file path
    const filePath = path.join(dir, fileName);

    // Write data to file
    await fs.writeFile(filePath, messageStr);
    console.log(`File written successfully: ${filePath}`);
  } catch (err) {
    console.error('Error writing file:', err);
  }
});
