import Docker from 'dockerode';
const { DOCKER_SOCKET_PATH, ABSOLUTE_DATA_FILE_PATH } = process.env;

// Initialize Docker client
const docker = new Docker({
  socketPath: DOCKER_SOCKET_PATH || '/var/run/docker.sock',
});

export async function run(tagName, branchName, filePath) {
  try {
    tagName = tagName.toLowerCase();
    console.log('Running container: ', tagName);

    // Run the container
    const container = await docker.createContainer({
      Image: `${tagName}:${branchName}`,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      HostConfig: {
        Binds: [`${ABSOLUTE_DATA_FILE_PATH}/${filePath}:/app/data.json`],
      },
    });

    await container.start();

    // Get container logs
    const logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
    });

    // Collect and print logs
    const logs = [];
    await new Promise((resolve, reject) => {
      logStream.on('data', (chunk) => {
        logs.push(...parseLog(chunk));
      });

      logStream.on('end', async () => {
        console.log('Stream ended');

        // Wait for the container to finish
        const containerData = await container.inspect();
        await container.remove();

        if (containerData.State.ExitCode !== 0) {
          reject(
            new Error(
              `Container exited with code ${containerData.State.ExitCode}`,
            ),
          );
        } else {
          resolve(
            new Response('Docker container ran successfully', { status: 200 }),
          );
        }
      });

      logStream.on('error', (err) => {
        reject(err);
      });
    });
    console.log('logs: ', logs);

    return logs;
  } catch (err) {
    console.error(`error running docker container ${tagName}`);
    throw err;
  }
}
function parseLog(log) {
  const entries = [];
  let offset = 0;

  while (offset < log.length) {
    const type = log[offset] === 1 ? 'INFO' : 'ERROR';
    const size = log.readUInt32BE(offset + 4);
    const text = log
      .slice(offset + 8, offset + 8 + size)
      .toString('utf8')
      .trim();
    entries.push({ type, text });
    offset += 8 + size;
  }

  return entries;
}
