import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the current file's path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the protobuf
const PROTO_PATH = resolve(__dirname, 'exex.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// Create a client
const client = new protoDescriptor.exex.RemoteExEx(
  'localhost:10000',
  grpc.credentials.createInsecure(),
);

// Subscribe to the stream
const call = client.Subscribe({});

call.on('data', (notification) => {
  console.log('Received notification:', notification);

  // Handle different types of notifications
  if (notification.chainCommitted) {
    console.log('Chain Committed:', notification.chainCommitted);
  } else if (notification.chainReorged) {
    console.log('Chain Reorged:', notification.chainReorged);
  } else if (notification.chainReverted) {
    console.log('Chain Reverted:', notification.chainReverted);
  }
});

call.on('end', () => {
  console.log('Stream ended');
});

call.on('error', (error) => {
  console.error('Error:', error);
});
