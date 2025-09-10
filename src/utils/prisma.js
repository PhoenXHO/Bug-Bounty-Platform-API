import { PrismaClient } from '@prisma/client';

// Singleton instance of PrismaClient
const prisma = new PrismaClient();

export default prisma;
