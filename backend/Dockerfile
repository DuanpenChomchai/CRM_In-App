# ============================================================
# Stage 1: Builder — compile TypeScript
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc --project tsconfig.json

# ============================================================
# Stage 2: Production — lean runtime image
# ============================================================
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Prisma schema and re-generate client for production
COPY prisma ./prisma
RUN npx prisma generate

# Copy compiled JS from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory (used for temp file handling)
RUN mkdir -p uploads

EXPOSE 3000

# Run Prisma migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
