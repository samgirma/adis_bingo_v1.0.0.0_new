import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Use environment variables
const DATABASE_URL = process.env.adis_bingo_db_PRISMA_DATABASE_URL || process.env.adis_bingo_db_DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function createAdminUser() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    
    // Push schema to ensure tables exist
    console.log('Running database migration...');
    
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: 'ssami@admin' }
    });
    
    if (existingUser) {
      console.log('Admin user already exists!');
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('My1,m4..', 10);
    console.log('Password hashed successfully');
    
    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'ssami@admin',
        password: hashedPassword,
        role: 'admin',
        name: 'Admin User',
        accountNumber: 'ADMIN001',
        balance: 0,
        isBlocked: false,
        creditBalance: 0,
        totalRevenue: 0,
        totalGames: 0,
        totalPlayers: 0,
        createdAt: new Date()
      }
    });
    
    console.log('Admin user created successfully:', {
      id: adminUser.id,
      username: adminUser.username,
      role: adminUser.role,
      name: adminUser.name
    });
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.log('\n=== DATABASE TABLES DO NOT EXIST ===');
      console.log('Please run: npx prisma db push');
      console.log('Or: npx prisma migrate dev');
      console.log('===============================\n');
    }
  } finally {
    await prisma.$disconnect();
    console.log('Database connection closed');
  }
}

// Run the function
createAdminUser();
