# Use the latest LTS version of Node.js with Alpine
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Set the working directory
WORKDIR /app

COPY . /app

# Install dependencies using pnpm
RUN pnpm install

# Command to run your application (adjust as necessary)
CMD ["node", "index.js"]
