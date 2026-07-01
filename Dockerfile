# --- Stage 1: Build Environment ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first to cache dependencies layers
COPY package*.json ./

# Install dependencies matching local setup constraints
RUN npm ci --legacy-peer-deps

# Copy the rest of the application files
COPY . .

# Run TypeScript compilation and build production static bundle
RUN npm run build

# --- Stage 2: Lightweight Production Server ---
FROM nginx:alpine

# Copy static bundle output from Stage 1 into Nginx default serving path
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for HTTP traffic
EXPOSE 80

# Run nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]
