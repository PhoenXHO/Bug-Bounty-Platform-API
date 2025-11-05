# 🛡️ Bug Bounty Platform API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)
[![Test Coverage](https://img.shields.io/badge/coverage-99.34%25-brightgreen)](https://github.com/PhoenXHO/Bug-Bounty-Platform-API)

A production-ready RESTful API for managing bug bounty programs, built with modern backend technologies and best practices. This platform enables security researchers to submit vulnerability reports and companies to manage their bug bounty programs efficiently.

## Features

### Core Functionality
- **User Authentication & Authorization** - JWT-based authentication with role-based access control (RBAC)
- **Program Management** - Companies can create, update, and manage bug bounty programs
- **Report Submission** - Researchers can submit detailed vulnerability reports with severity levels
- **Security First** - Rate limiting, bcrypt password hashing, and secure token management
- **Status Tracking** - Real-time report status management (OPEN, IN_REVIEW, RESOLVED, REJECTED)

### Technical Highlights
- **RESTful API Design** - Clean, intuitive endpoints following REST principles
- **Docker Support** - Fully containerized with Docker Compose for easy deployment
- **API Documentation** - Interactive Swagger/OpenAPI documentation
- **Type Safety** - Prisma ORM with strongly-typed database queries
- **Comprehensive Testing** - 99.34% test coverage with unit and integration tests
- **Rate Limiting** - Multiple rate limiters for different endpoint types
- **Production Ready** - Separate dev/prod environments with proper error handling

## Technology Stack

### Backend Framework
- **Node.js** (v24+) - JavaScript runtime
- **Express.js** - Fast, minimalist web framework
- **Prisma ORM** - Next-generation Node.js and TypeScript ORM

### Database
- **PostgreSQL** - Robust, open-source relational database

### Security
- **JWT** (jsonwebtoken) - Secure authentication tokens
- **bcrypt** - Password hashing with salt rounds
- **express-rate-limit** - API rate limiting middleware

### Testing
- **Jest** - Comprehensive testing framework
- **Supertest** - HTTP assertions for API testing
- **99.34% Coverage** - Unit and integration tests

### DevOps & Tools
- **Docker & Docker Compose** - Containerization and orchestration
- **Swagger/OpenAPI** - Interactive API documentation
- **ESLint** - Code quality and consistency
- **Nodemon** - Development auto-reload

## Prerequisites

- Node.js >= 24.0.0
- PostgreSQL >= 17
- Docker & Docker Compose (optional, for containerized deployment)
- npm or yarn package manager

## 🚀 Quick Start

### Option 1: Docker (Recommended)

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/PhoenXHO/Bug-Bounty-Platform-API.git
cd Bug-Bounty-Platform-API

# Start the application with Docker Compose
docker-compose up -d

# Run database migrations
docker-compose exec app npx prisma migrate deploy

# Seed the database (optional)
docker-compose exec app npm run prisma db seed

# Access the API
curl http://localhost:3000/api-docs
```

The API will be available at `http://localhost:3000` with live reload enabled in development mode.

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/PhoenXHO/Bug-Bounty-Platform-API.git
cd Bug-Bounty-Platform-API

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Seed the database (optional)
npm run prisma db seed

# Start development server
npm run dev
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/bugbounty?schema=public"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server
PORT=3000
NODE_ENV=development
```

### Docker Environment

For Docker deployments, use `.env.dev` for development and `.env` for production configurations.

## 📚 API Documentation

Interactive API documentation is available via Swagger UI:

- **Development**: http://localhost:3000/api-docs
- **Production**: https://your-domain.com/api-docs

### API Endpoints Overview

#### Authentication
```
POST   /api/auth/register    - Register a new user
POST   /api/auth/login       - Login and receive JWT token
GET    /api/auth/me          - Get current user profile
```

#### Programs
```
GET    /api/programs         - List all bug bounty programs
GET    /api/programs/:id     - Get specific program details
POST   /api/programs         - Create new program (Company only)
PUT    /api/programs/:id     - Update program (Owner only)
DELETE /api/programs/:id     - Delete program (Owner only)
```

#### Reports
```
POST   /api/reports                      - Submit vulnerability report (Researcher only)
GET    /api/reports/:id                  - Get report details
GET    /api/reports/program/:programId   - List reports for a program
PATCH  /api/reports/:id/status           - Update report status (Company only)
```

## Testing

The project includes comprehensive test suites with 99.34% coverage:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run tests with coverage report
npm test -- --coverage
```

### Test Structure
- **Unit Tests** - Controllers, middleware, utilities
- **Integration Tests** - End-to-end API testing
- **Test Coverage** - 99.34% statement coverage

## Project Structure

```
bug-bounty-platform/
├── src/
│   ├── controllers/         # Request handlers
│   │   ├── authController.js
│   │   ├── programController.js
│   │   └── reportController.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # JWT authentication & authorization
│   │   ├── errorHandler.js  # Global error handling
│   │   └── rateLimiter.js   # Rate limiting configurations
│   ├── routes/              # API route definitions
│   │   ├── auth.js
│   │   ├── programs.js
│   │   └── reports.js
│   ├── utils/               # Utility functions
│   │   ├── bcrypt.js
│   │   ├── jwt.js
│   │   └── prisma.js
│   ├── app.js               # Express app configuration
│   └── server.js            # Server entry point
├── tests/                   # Test suites
│   ├── controllers/         # Controller tests
│   ├── middleware/          # Middleware tests
│   ├── integration/         # Integration tests
│   └── utils/               # Utility tests
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Database migrations
│   └── seed.js              # Database seeding
├── docs/                    # API documentation
│   ├── swagger.yaml
│   └── components/
├── docker-compose.yaml      # Production Docker config
├── docker-compose.override.yaml  # Development overrides
├── Dockerfile               # Multi-stage Docker build
└── package.json
```

## Security Features

### Authentication & Authorization
- JWT-based authentication with secure token generation
- Role-based access control (RESEARCHER, COMPANY, ADMIN)
- Password hashing with bcrypt (10 salt rounds)
- Protected routes with authentication middleware

### Rate Limiting
- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 failed attempts per 15 minutes
- **Report Submission**: 10 reports per hour
- **Program Creation**: 5 programs per day

### Data Security
- SQL injection prevention via Prisma ORM
- Input validation and sanitization
- Secure environment variable handling
- CORS configuration for production

## Database Schema

### Core Models

#### User
- Unique email-based authentication
- Role-based permissions (RESEARCHER, COMPANY, ADMIN)
- Password hashing with bcrypt
- Timestamps for audit trails

#### Program
- Bug bounty program details
- Reward range configuration
- Company ownership with foreign key constraints
- Cascade deletion handling

#### Report
- Vulnerability report details
- Severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Status workflow (OPEN, IN_REVIEW, RESOLVED, REJECTED)
- Researcher and program relationships

## Deployment

### Docker Deployment

```bash
# Production deployment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

1. Set environment variables for production
2. Build and run database migrations
3. Generate Prisma Client
4. Start the server with `npm start`

### Environment Configuration

- Development: Uses `.env.dev` with hot reload
- Production: Uses `.env` with optimized settings

## Performance & Scalability

- **Database Connection Pooling** - Optimized Prisma connection management
- **Rate Limiting** - Prevents API abuse and ensures fair usage
- **Efficient Queries** - Optimized database queries with Prisma
- **Docker Support** - Easy horizontal scaling with container orchestration
- **Stateless Authentication** - JWT enables distributed deployment

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.