// import { ExEx } from './index.js';
// import amqplib from 'amqplib';

// function main() {
//   console.log('Starting main');
//   try {
//     ExEx('Hi!');

//     subscribe();
//   } catch (err) {
//     console.error('error in main: ', err);
//   }
// }

// // Start main thread
// main();

// // Subscribe to events from RabbitMQ
// async function subscribe() {
//   // TODO: actual retry

//   await new Promise((r) => setTimeout(r, 10_000));

//   const RABBITMQ_URL =
//     process.env.RABBITMQ_URL || 'amqp://user:password@localhost:5672';

//   const QUEUE_NAME = 'exex';
//   const conn = await amqplib.connect(RABBITMQ_URL);

//   console.log('got connection to rabbitmq');

//   const ch1 = await conn.createChannel();
//   console.log('created channel');
//   await ch1.assertQueue(QUEUE_NAME);
//   console.log('assertedQueue');

//   // Listener
//   ch1.consume(QUEUE_NAME, (msg) => {
//     if (msg !== null) {
//       console.log('Received:', msg.content.toString());
//       ch1.ack(msg);
//     } else {
//       console.log('Consumer cancelled by server');
//     }
//   });

//   console.log('Consuming messages from ', QUEUE_NAME);

//   // Sender
//   // const ch2 = await conn.createChannel();
//   // console.log('created sender channel');

//   // setInterval(() => {
//   //   console.log('sending to queue');
//   //   ch2.sendToQueue(QUEUE_NAME, Buffer.from('something to do'));
//   // }, 1000);
// }

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
      '\nRunning ExEx at ',
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

