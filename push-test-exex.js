import 'dotenv/config';
import { postToQueue } from './rabbitmq.js';
import { promises as fs } from 'fs';

async function pushTestExExToQueue() {
  try {
    console.log('reading file');
    const data = await fs.readFile('test-data.json');
    console.log('got file data: ', typeof data);
    await postToQueue('exex', data);
    console.log('pushed test data to queue');
  } catch (err) {
    console.error('Failed to push to queue', err);
  }
}

pushTestExExToQueue();
