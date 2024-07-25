import Docker from 'dockerode';
import path from 'path';

const { DOCKER_SOCKET_PATH, GITHUB_ACCESS_TOKEN, DOCKER_FILE_PATH } =
  process.env;

// Initialize Docker client
const docker = new Docker({
  socketPath: DOCKER_SOCKET_PATH || '/var/run/docker.sock',
});

export async function build(repoName, branchName) {
  repoName = repoName.toLowerCase();

  // Define build arguments (environment variables)
  const buildArgs = {
    REPO_NAME: repoName,
    BRANCH_NAME: branchName,
    GITHUB_ACCESS_TOKEN,
    // Force git pull to be rebuilt
    CACHE_BUST: Date.now().toString(),
  };

  console.log('buildArgs: ', buildArgs);

  // Path to your Dockerfile
  const dockerfilePath = path.join(process.cwd(), 'js_build');

  console.log('dockerfilePath: ', dockerfilePath);

  const dockerfile = `${branchName}.Dockerfile`;

  try {
    // Create a tar stream of the build context
    const buildContext = {
      context: dockerfilePath,
      src: [dockerfile, `${branchName}-exex-manager.js`], // Add any other files/directories needed for the build
    };

    console.log('buildContext : ', buildContext);

    const tag = `${repoName}:${branchName}`;

    console.log('tag: ', tag);

    // Start the build
    const stream = await docker.buildImage(buildContext, {
      t: tag,
      buildargs: buildArgs,
      dockerfile,
    });

    console.log('got stream');

    // Wait for the build to complete
    await new Promise((resolve, reject) => {
      docker.modem.followProgress(stream, (err, res) => {
        if (err) {
          return reject(err);
        } else if (res[res.length - 1].error) {
          return reject(res[res.length - 1]);
        }

        console.log('Docker build success: ', res);
        console.log('tag: ', tag);

        return resolve(res);
      });
    });

    // await checkBuiltImage(tag);
  } catch (err) {
    console.error('Error during Docker build for ', repoName);
    throw err;
  }
}

async function checkBuiltImage(imageName) {
  console.log(`Checking built image: ${imageName}`);

  try {
    const [image] = await docker.listImages({
      filters: { reference: [imageName] },
    });
    if (image) {
      console.log(`Image found: ${imageName}`);
      console.log(`Image ID: ${image.Id}`);
      console.log(
        `Created: ${new Date(image.Created * 1000).toLocaleString()}`,
      );
      console.log(`Size: ${(image.Size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log(`Image not found: ${imageName}`);
    }
  } catch (err) {
    console.error('Error checking built image:', err);
  }
}
