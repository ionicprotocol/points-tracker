# Use node alpine image as the base image
FROM node:alpine
FROM oven/bun:1.0.0
# Set working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
COPY . .
RUN curl -fsSL https://bun.sh/install | bash
# Install dependencies
RUN bun install


# Expose port 3000 (assuming your application runs on this port)
EXPOSE 3000

# Command to run the application
CMD ["bun", "run" , "start"]
