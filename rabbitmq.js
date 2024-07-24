import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

export async function listenToQueue(queueName, messageProcessor) {
  try {
    // Create a connection to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);

    // Create a channel
    const channel = await connection.createChannel();

    // Make sure the queue exists
    await channel.assertQueue(queueName, { durable: false });

    console.log(`Waiting for messages in queue: ${queueName}`);

    // Consume messages from the queue
    channel.consume(queueName, (msg) => {
      if (msg !== null) {
        const message = msg.content.toString();
        console.log(`Received message: ${message}`);

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
