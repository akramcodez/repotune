# Use a pinned stable Debian-based Node.js image
FROM node:20.17.0-bookworm-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# git is often required for repository tooling and CI tasks
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install exact dependencies using npm ci
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Set the default command (can be overridden by Turing)
CMD ["npm", "run", "test:all"]
