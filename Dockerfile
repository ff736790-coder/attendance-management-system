# Multi-stage production-ready Dockerfile for AI-Powered Attendance Management System
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Final slim runtime image
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Install curl for container health check
RUN apk add --no-cache curl

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy application source code
COPY backend ./backend
COPY frontend ./frontend

# Create non-root user for container security
USER node

# Expose HTTP port
EXPOSE 5000

# Docker Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/system/health || exit 1

# Start production server
CMD ["node", "backend/src/server.js"]
