import { userService } from '../lib/firebase-user-service';
import { User } from '../lib/auth';

// Legacy users to migrate to Firebase
const LEGACY_USERS: Omit<User, 'id' | 'created_at' | 'created_by'>[] = [
  // Sales Team - IDs match CSV SalesAgentID
  { username: 'Agent-001', password: '2752004', name: 'ahmed atef', role: 'salesman', team: 'CS TEAM' },
  { username: 'Agent-002', password: '159753', name: 'ali team', role: 'salesman', team: 'ALI ASHRAF' },
  { username: 'Agent-003', password: '13579', name: 'sherif ashraf', role: 'salesman', team: 'SAIF MOHAMED' },
  { username: 'Agent-004', password: '2520', name: 'basmala', role: 'salesman', team: 'CS TEAM' },
  { username: 'Agent-005', password: '2316', name: 'marwan khaled', role: 'salesman', team: 'ALI ASHRAF' },
  { username: 'Agent-006', password: '777', name: 'mohamed hossam', role: 'salesman', team: 'ALI ASHRAF' },
  { username: 'Agent-007', password: '392000', name: 'ahmed heikal', role: 'salesman', team: 'SAIF MOHAMED' },
  { username: 'Agent-008', password: '35422964', name: 'mohsen sayed', role: 'salesman', team: 'ALI ASHRAF' },
  { username: 'Agent-009', password: '9528', name: 'rodaina', role: 'salesman', team: 'OTHER' },
  { username: 'Agent-010', password: 'mn15', name: 'omer ramadan', role: 'salesman', team: 'ALI ASHRAF' },
  { username: 'Agent-011', password: '292005bh', name: 'ahmed helmy', role: 'salesman', team: 'ALI ASHRAF' },
  { username: 'Agent-012', password: 'Manara1234', name: 'mina nasr', role: 'salesman', team: 'SAIF MOHAMED' },
  { username: 'Agent-013', password: '20062001', name: 'saif team', role: 'salesman', team: 'SAIF MOHAMED' },
  { username: 'Agent-014', password: 'ko021', name: 'khaled tarek', role: 'salesman', team: 'ALI ASHRAF' },
  { username: 'Agent-015', password: '2134', name: 'mostafa shafey', role: 'salesman', team: 'SAIF MOHAMED' },
  { username: 'Agent-016', password: 'ro1234', name: 'kerolos montaser', role: 'salesman', team: 'SAIF MOHAMED' },
  
  // Customer Service Team
  { username: 'Agent-017', password: 'support123', name: 'heba ali', role: 'customer-service', team: 'CS TEAM' },
  { username: 'Agent-018', password: 'support123', name: 'beshoy hany', role: 'customer-service', team: 'SAIF MOHAMED' },
  { username: 'Agent-019', password: 'support123', name: 'hussin tamer', role: 'customer-service', team: 'ALI ASHRAF' },
  { username: 'Agent-020', password: 'support123', name: 'abdallah', role: 'customer-service', team: 'CS TEAM' },
  { username: 'Agent-021', password: 'support123', name: 'sayed sherif', role: 'customer-service', team: 'SAIF MOHAMED' },
  { username: 'Agent-022', password: 'support123', name: 'mohamed omar', role: 'customer-service', team: 'SAIF MOHAMED' },
  { username: 'Agent-023', password: 'support123', name: 'ali ashraf', role: 'customer-service', team: 'ALI ASHRAF' },
  { username: 'Agent-024', password: 'support123', name: 'saif mohamed', role: 'customer-service', team: 'SAIF MOHAMED' },
  { username: 'Agent-025', password: 'support123', name: 'alaa atef', role: 'customer-service', team: 'CS TEAM' },
];

export async function migrateUsersToFirebase() {
  console.log('Starting user migration to Firebase...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of LEGACY_USERS) {
    try {
      // Check if user already exists
      const existingUser = await userService.getUserByUsername(user.username);
      if (existingUser) {
        console.log(`User ${user.username} already exists, skipping...`);
        continue;
      }
      
      // Create user in Firebase
      const userId = await userService.createUser(user);
      console.log(`✓ Created user: ${user.username} (${user.name}) with ID: ${userId}`);
      successCount++;
      
    } catch (error) {
      console.error(`✗ Failed to create user ${user.username}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\nMigration completed:`);
  console.log(`✓ Successfully migrated: ${successCount} users`);
  console.log(`✗ Failed to migrate: ${errorCount} users`);
  console.log(`📊 Total users processed: ${LEGACY_USERS.length}`);
  
  return { successCount, errorCount, total: LEGACY_USERS.length };
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateUsersToFirebase()
    .then((result) => {
      console.log('Migration finished:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
