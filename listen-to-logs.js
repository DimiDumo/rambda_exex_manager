import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import pg from 'pg';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Global map to store all subscriptions
const subscriptionsByRepoName = new Map();

async function setupPgListener(repoName, callback) {
  const { POSTGRES_URL } = process.env;
  const client = new pg.Client(POSTGRES_URL);

  client.connect((err, client) => {
    client.query('LISTEN repo_log_created_event');
    client.on('notification', (log) => {
      const { payload } = log;
      const row = JSON.parse(payload);
      console.log('A new log has been inserted: ', row);
      console.log('subscriptionsByRepoName: ', !!subscriptionsByRepoName);
      const repoSubsciptionsBySocketId = subscriptionsByRepoName.get(
        row.github_repos_name.toLowerCase(),
      );
      console.log('repoSubsciptionsBySocketId: ', !!repoSubsciptionsBySocketId);
      if (repoSubsciptionsBySocketId) {
        for (const socket of repoSubsciptionsBySocketId.values()) {
          socket.emit('repoUpdate', row);
        }
      }
    });
  });
}

setupPgListener();

// TODO: Will break completely if a user listens to multiple repos
io.on('connection', (socket) => {
  console.log('A user connected: ', socket.id);

  let repoName;
  socket.on('subscribe', async (_repoName) => {
    console.log('got subscript event!: ', _repoName);
    repoName = _repoName;
    console.log('new subscription on: ', repoName);
    let repoSubsciptionsBySocketId = subscriptionsByRepoName.get(repoName);
    if (!repoSubsciptionsBySocketId) {
      repoSubsciptionsBySocketId = new Map();
      subscriptionsByRepoName.set(
        repoName.toLowerCase(),
        repoSubsciptionsBySocketId,
      );
    }

    repoSubsciptionsBySocketId.set(socket.id, socket);
  });

  socket.on('unsubscribe', async () => {
    const repoSubsciptionsBySocketId = subscriptionsByRepoName.get(repoName);
    if (repoSubsciptionsBySocketId) {
      repoSubsciptionsBySocketId.delete(socket.id);
    }
  });

  socket.on('disconnect', async () => {
    const repoSubsciptionsBySocketId = subscriptionsByRepoName.get(repoName);
    if (repoSubsciptionsBySocketId) {
      repoSubsciptionsBySocketId.delete(socket.id);
    }
  });
});

