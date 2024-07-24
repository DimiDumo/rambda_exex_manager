import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { pool } from './db.js';
import cors from 'cors';

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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Global map to store all subscriptions
const globalSubscriptions = new Map();

async function setupPgListener(repoName, callback) {
  if (globalSubscriptions.has(repoName)) {
    const { listeners } = globalSubscriptions.get(repoName);
    listeners.push(callback);
    return;
  }

  const pgClient = await pool.connect();
  const channelName = `repo_logs_${repoName}_${Date.now()}`.replace(/-/g, '_');

  try {
    console.log('setting up new listener function');
    // Create the function
    await pgClient.query(`
      CREATE OR REPLACE FUNCTION notify_repo_log_${channelName}() RETURNS trigger AS $$
      BEGIN
        IF NEW.github_repos_name = '${repoName}' THEN
          PERFORM pg_notify('${channelName}', row_to_json(NEW)::text);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create the trigger
    await pgClient.query(`
      CREATE TRIGGER repo_log_trigger_${channelName}
      AFTER INSERT ON repo_logs
      FOR EACH ROW EXECUTE FUNCTION notify_repo_log_${channelName}();
    `);

    const listeners = [callback];

    pgClient.on('notification', (msg) => {
      console.log('got notification: ', msg);
      if (msg.channel === channelName) {
        const payload = JSON.parse(msg.payload);
        listeners.forEach((listener) => listener(payload));
      }
    });

    await pgClient.query(`LISTEN ${channelName}`);

    globalSubscriptions.set(repoName, { pgClient, channelName, listeners });
  } catch (error) {
    console.error('Error in setupPgListener:', error);
    await pgClient.release();
    throw error;
  }
}

async function removePgListener(repoName, callback) {
  const subscription = globalSubscriptions.get(repoName);
  if (!subscription) return;

  const { pgClient, channelName, listeners } = subscription;
  const index = listeners.indexOf(callback);
  if (index > -1) {
    listeners.splice(index, 1);
  }

  if (listeners.length === 0) {
    await pgClient.query(`UNLISTEN ${channelName}`);
    await pgClient.query(
      `DROP TRIGGER IF EXISTS repo_log_trigger_${channelName} ON repo_logs`,
    );
    await pgClient.query(
      `DROP FUNCTION IF EXISTS notify_repo_log_${channelName}()`,
    );
    await pgClient.end();
    globalSubscriptions.delete(repoName);
  }
}

io.on('connection', (socket) => {
  console.log('A user connected');

  const userSubscriptions = new Set();

  socket.on('subscribe', async (repoName) => {
    if (userSubscriptions.has(repoName)) {
      console.log(`User already subscribed to ${repoName}`);
      return;
    }

    const callback = (data) => {
      socket.emit('repoUpdate', { repoName, data });
    };

    await setupPgListener(repoName, callback);
    userSubscriptions.add(repoName);
    console.log(`Subscribed to updates for repo: ${repoName}`);
  });

  socket.on('unsubscribe', async (repoName) => {
    if (userSubscriptions.has(repoName)) {
      await removePgListener(repoName, (data) => {
        socket.emit('repoUpdate', { repoName, data });
      });
      userSubscriptions.delete(repoName);
      console.log(`Unsubscribed from updates for repo: ${repoName}`);
    }
  });

  socket.on('disconnect', async () => {
    for (const repoName of userSubscriptions) {
      await removePgListener(repoName, (data) => {
        socket.emit('repoUpdate', { repoName, data });
      });
    }
    userSubscriptions.clear();
    console.log('User disconnected');
  });
});
