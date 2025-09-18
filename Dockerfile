FROM node:24-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy all files before running Prisma generate to ensure schema is available
COPY . .

# Generate Prisma client after copying all files
RUN npx prisma generate

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]