import { ExEx } from './index.js';
import { promises as fs } from 'fs';

async function main() {
  let data;
  try {
    data = await fs.readFile('data.json');
    data = data.toString();
    data = data.replaceAll('\\', '');
    data = data.slice(1, -1);
    data = JSON.parse(data);
    // console.log('data keys: ', Object.keys(data));
  } catch (err) {
    console.timeEnd('init');
    console.error(
      'Failed to initialize ExEx function before calling users function: ',
      err,
    );
    return;
  }
  try {
    const now = new Date();
    const dateStr = now.toISOString();
    console.log(
      '\nRunning Test ExEx at ',
      dateStr,
      ' ===================================',
    );
    console.time('exex took');
    await ExEx(data);
    console.timeEnd('exex took');
  } catch (err) {
    console.timeEnd('exex took');
    console.error('Error in main: ', err);
  }
}

// Run test func with test data
main();

