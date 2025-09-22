import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { salesService, userService, notificationService } from '../lib/firebase-services';

// Types for migration data
interface Sale {
  date: string;
  customer_name: string;
  amount: number;
  sales_agent: string;
  closing_agent: string;
  team: string;
  type_service: string;
  sales_agent_norm: string;
  closing_agent_norm: string;
  SalesAgentID: string;
  ClosingAgentID: string;
  DealID: string;
  email: string;
  phone: string;
  country: string;
  duration_months: number;
  type_program: string;
  invoice: string;
}

interface User {
  name: string;
  email: string;
  role: string;
  team: string;
  SalesAgentID?: string;
  ClosingAgentID?: string;
  isActive: boolean;
}

interface Notification {
  title: string;
  message: string;
  type: string;
  userRole?: string;
  isRead: boolean;
}

// Migration script to move CSV data to MySQL
export async function migrateDataToFirebase() {
  console.log('Starting MySQL migration...');

  try {
    // Migrate sales data from CSV
    await migrateSalesData();
    
    // Create sample users
    await createSampleUsers();
    
    // Create sample notifications
    await createSampleNotifications();
    
    console.log('Firebase migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function migrateSalesData() {
  console.log('Migrating sales data...');
  
  const csvPath = path.join(process.cwd(), 'public', 'data', 'aug-ids-new.csv');
  
  try {
    const fileContent = await fs.readFile(csvPath, 'utf-8');
    const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
    
    const salesData = (parsed.data as any[]).map((row) => {
      const sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'> = {
        date: row.signup_date || row.date || new Date().toISOString().split('T')[0],
        customer_name: row.customer_name || row.customer || '',
        amount: parseFloat(row.amount_paid || row.amount || '0') || 0,
        sales_agent: row.sales_agent || '',
        closing_agent: row.closing_agent || '',
        team: row.sales_team || row.team || '',
        type_service: row.service_tier || row.type_service || '',
        sales_agent_norm: (row.sales_agent_norm || row.sales_agent || '').toLowerCase(),
        closing_agent_norm: (row.closing_agent_norm || row.closing_agent || '').toLowerCase(),
        SalesAgentID: row.SalesAgentID || '',
        ClosingAgentID: row.ClosingAgentID || '',
        DealID: row.DealID || `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: row.email || '',
        phone: row.phone_number || row.phone || '',
        country: row.country || '',
        duration_months: parseInt(row.duration_months || '12') || 12,
        type_program: row.product_type || row.type_program || '',
        invoice: row.invoice_link || row.invoice || ''
      };
      return sale;
    }).filter(sale => sale.customer_name && sale.amount > 0);

    console.log(`Found ${salesData.length} sales records to migrate`);

    // Batch upload to Firebase
    const batchSize = 50;
    for (let i = 0; i < salesData.length; i += batchSize) {
      const batch = salesData.slice(i, i + batchSize);
      await Promise.all(batch.map(sale => salesService.addSale(sale)));
      console.log(`Migrated ${Math.min(i + batchSize, salesData.length)}/${salesData.length} sales records`);
    }

    console.log('Sales data migration completed');
  } catch (error) {
    console.error('Error migrating sales data:', error);
    throw error;
  }
}

async function createSampleUsers() {
  console.log('Creating sample users...');
  
  const sampleUsers: Omit<User, 'id' | 'created_at' | 'updated_at'>[] = [
    {
      name: 'Manager User',
      email: 'manager@vmax.com',
      role: 'manager',
      team: 'Management',
      SalesAgentID: 'MGR001',
      isActive: true
    },
    {
      name: 'John Salesman',
      email: 'john@vmax.com',
      role: 'salesman',
      team: 'CS TEAM',
      SalesAgentID: 'SA001',
      isActive: true
    },
    {
      name: 'Jane Support',
      email: 'jane@vmax.com',
      role: 'customer-service',
      team: 'Support',
      ClosingAgentID: 'CS001',
      isActive: true
    }
  ];

  for (const user of sampleUsers) {
    try {
      const existingUser = await userService.getUserByEmail(user.email);
      if (!existingUser) {
        await userService.addUser(user);
        console.log(`Created user: ${user.name}`);
      } else {
        console.log(`User already exists: ${user.name}`);
      }
    } catch (error) {
      console.error(`Error creating user ${user.name}:`, error);
    }
  }
}

async function createSampleNotifications() {
  console.log('Creating sample notifications...');
  
  const sampleNotifications: Omit<Notification, 'id' | 'created_at'>[] = [
    {
      title: 'Welcome to Firebase!',
      message: 'Your data has been successfully migrated to Firebase. Enjoy real-time updates and better performance.',
      type: 'success',
      isRead: false
    },
    {
      title: 'System Update',
      message: 'The system has been updated to use Firebase for all data operations.',
      type: 'info',
      userRole: 'manager',
      isRead: false
    },
    {
      title: 'New Features Available',
      message: 'Check out the new real-time dashboard features powered by Firebase.',
      type: 'info',
      isRead: false
    }
  ];

  for (const notification of sampleNotifications) {
    try {
      await notificationService.addNotification(notification);
      console.log(`Created notification: ${notification.title}`);
    } catch (error) {
      console.error(`Error creating notification ${notification.title}:`, error);
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDataToFirebase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
