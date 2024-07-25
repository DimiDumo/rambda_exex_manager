import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

export async function listenToQueue(queueName, messageProcessor) {
  try {
    // Create a connection to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);

    // Create a channel
    const channel = await connection.createChannel();

    // Make sure the queue exists
    await channel.assertQueue(queueName, { durable: true });

    console.log(`Waiting for messages in queue: ${queueName}`);

    // Consume messages from the queue
    channel.consume(queueName, (msg) => {
      if (msg !== null) {
        const message = msg.content.toString();
        console.log(`Received message`);

        // Process the message here
        messageProcessor(message);

        // Acknowledge the message
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
  }
}

export async function postToQueue(queueName, message) {
  try {
    console.log('creating connection');
    // Create a connection to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);

    console.log('creating channel');
    // Create a channel
    const channel = await connection.createChannel();

    console.log('asserting queue');
    // Make sure the queue exists
    await channel.assertQueue(queueName, { durable: true });

    console.log('Sending message');
    // Send the message
    channel.sendToQueue(queueName, Buffer.from(message));

    console.log(`Message sent to queue ${queueName}`);

    // Close the channel and connection
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('Error posting message to RabbitMQ:', error);
    throw error;
  }
}
