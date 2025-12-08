# Use Node.js 22 (since you upgraded to it)
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files first (better for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Expose the Vite port
EXPOSE 5173

# Start the app with --host so it's accessible outside the container
CMD ["npm", "run", "dev", "--", "--host"]