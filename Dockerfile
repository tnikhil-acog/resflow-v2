# Dockerfile for ResFlow Application with Cron Support
FROM node:20-alpine

# Install cron and curl
RUN apk add --no-cache curl dcron

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build the Next.js application
RUN pnpm build

# Make scripts executable
RUN chmod +x /app/scripts/docker-entrypoint.sh
RUN chmod +x /app/scripts/cron-runner.sh

# Create log directory
RUN mkdir -p /var/log && \
    touch /var/log/cron-daily.log /var/log/cron-weekly.log && \
    chmod 666 /var/log/cron-daily.log /var/log/cron-weekly.log

# Expose port
EXPOSE 3000

# Set entrypoint
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]

# Start the application
CMD ["pnpm", "start"]
