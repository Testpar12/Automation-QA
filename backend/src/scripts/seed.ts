import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models';
import { config } from '../config';

async function seed() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const admin = new User({
      email: 'admin@example.com',
      password_hash: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      role: 'qa_lead',
    });

    await admin.save();
    
    console.log('✓ Admin user created successfully');
    console.log('  Email: admin@example.com');
    console.log('  Password: Admin123!');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
