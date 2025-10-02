FROM node:24-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Add build argument for NODE_ENV
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Install dependencies based on the NODE_ENV
# For production, omit dev dependencies
RUN \
	if [ "$NODE_ENV" = "production" ]; then \
		npm ci --omit=dev; \
	else \
		npm ci; \
	fi

# Copy all files before running Prisma generate to ensure schema is available
COPY . .

# Generate Prisma client after copying all files
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]