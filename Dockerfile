FROM node:22-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy ALL source files (this layer will always be fresh)
COPY . .

# Verify main.jsx is present
RUN ls -la src/ && echo "main.jsx check:" && cat src/main.jsx

# Build the frontend
RUN npm run build

# Expose port
EXPOSE 3001

# Start the backend server
CMD ["node", "interaction-server.cjs"]
