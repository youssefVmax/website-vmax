export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'manager' | 'salesman' | 'customer-service';
  team?: string;
  email?: string;
  phone?: string;
}

// Updated user database with proper IDs matching CSV data
export const USERS: User[] = [
  // Manager/Admin (same person)
  { 
    id: 'manager-001', 
    username: 'manager', 
    password: 'admin123', 
    name: 'System Manager', 
    role: 'manager', 
    email: 'manager@vmax.com',
    team: 'MANAGEMENT'
  },
  
  // Sales Team - IDs match CSV SalesAgentID
  { id: 'Agent-001', username: 'Agent-001', password: '2752004', name: 'ahmed atef', role: 'salesman', team: 'CS TEAM' },
  { id: 'Agent-002', username: 'Agent-002', password: '159753', name: 'ali team', role: 'salesman', team: 'ALI ASHRAF' },
  { id: 'Agent-003', username: 'Agent-003', password: '13579', name: 'sherif ashraf', role: 'salesman', team: 'SAIF MOHAMED' },
  { id: 'Agent-004', username: 'Agent-004', password: '2520', name: 'basmala', role: 'salesman', team: 'CS TEAM' },
  { id: 'Agent-005', username: 'Agent-005', password: '2316', name: 'marwan khaled', role: 'salesman', team: 'ALI ASHRAF' },
  { id: 'Agent-006', username: 'Agent-006', password: '777', name: 'mohamed hossam', role: 'salesman', team: 'ALI ASHRAF' },
  { id: 'Agent-007', username: 'Agent-007', password: '392000', name: 'ahmed heikal', role: 'salesman', team: 'SAIF MOHAMED' },
  { id: 'Agent-008', username: 'Agent-008', password: '35422964', name: 'mohsen sayed', role: 'salesman', team: 'ALI ASHRAF' },
  { id: 'Agent-009', username: 'Agent-009', password: '9528', name: 'rodaina', role: 'salesman', team: 'OTHER' },
  { id: 'Agent-010', username: 'Agent-010', password: 'mn15', name: 'omer ramadan', role: 'salesman', team: 'ALI ASHRAF' },
  { id: 'Agent-011', username: 'Agent-011', password: '292005bh', name: 'ahmed helmy', role: 'salesman', team: 'ALI ASHRAF' },
  { id: 'Agent-012', username: 'Agent-012', password: 'Manara1234', name: 'mina nasr', role: 'salesman', team: 'SAIF MOHAMED' },
  { id: 'Agent-013', username: 'Agent-013', password: '20062001', name: 'saif team', role: 'salesman', team: 'SAIF MOHAMED' },
  { id: 'Agent-014', username: 'Agent-014', password: 'ko021', name: 'khaled tarek', role: 'salesman', team: 'ALI ASHRAF' },
  { id: 'Agent-015', username: 'Agent-015', password: '2134', name: 'mostafa shafey', role: 'salesman', team: 'SAIF MOHAMED' },
  { id: 'Agent-016', username: 'Agent-016', password: 'ro1234', name: 'kerolos montaser', role: 'salesman', team: 'SAIF MOHAMED' },
  
  // Customer Service Team
  { id: 'Agent-017', username: 'Agent-017', password: 'support123', name: 'heba ali', role: 'customer-service', team: 'CS TEAM' },
  { id: 'Agent-018', username: 'Agent-018', password: 'support123', name: 'beshoy hany', role: 'customer-service', team: 'SAIF MOHAMED' },
  { id: 'Agent-019', username: 'Agent-019', password: 'support123', name: 'hussin tamer', role: 'customer-service', team: 'ALI ASHRAF' },
  { id: 'Agent-020', username: 'Agent-020', password: 'support123', name: 'abdallah', role: 'customer-service', team: 'CS TEAM' },
  { id: 'Agent-021', username: 'Agent-021', password: 'support123', name: 'sayed sherif', role: 'customer-service', team: 'SAIF MOHAMED' },
  { id: 'Agent-022', username: 'Agent-022', password: 'support123', name: 'mohamed omar', role: 'customer-service', team: 'SAIF MOHAMED' },
  { id: 'Agent-023', username: 'Agent-023', password: 'support123', name: 'ali ashraf', role: 'customer-service', team: 'ALI ASHRAF' },
  { id: 'Agent-024', username: 'Agent-024', password: 'support123', name: 'saif mohamed', role: 'customer-service', team: 'SAIF MOHAMED' },
  { id: 'Agent-025', username: 'Agent-025', password: 'support123', name: 'alaa atef', role: 'customer-service', team: 'CS TEAM' },
];

export function authenticateUser(username: string, password: string): User | null {
  const user = USERS.find(u => u.username === username && u.password === password);
  return user || null;
}

export function getUserById(id: string): User | null {
  return USERS.find(u => u.id === id) || null;
}

export function getUsersByRole(role: User['role']): User[] {
  return USERS.filter(u => u.role === role);
}

export function getUsersByTeam(team: string): User[] {
  return USERS.filter(u => u.team === team);
}