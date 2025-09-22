import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { logger } from './logger';
import { API_CONFIG } from './config';

export type UserRole = 'admin' | 'manager' | 'team_leader' | 'sales_agent';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  team_id?: number;
  team_name?: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  userId: number;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

// JWT token generation
export function generateToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
  };

  return jwt.sign(payload, process.env.JWT_SECRET || API_CONFIG.JWT_SECRET);
}

// Verify JWT token
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || API_CONFIG.JWT_SECRET) as JwtPayload;
  } catch (error) {
    logger.error('Token verification failed:', { error });
    return null;
  }
}

// Authentication middleware
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = verifyToken(token);
    if (!payload) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    // Get user from database
    const [user] = await db.query<User[]>(
      'SELECT u.*, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id WHERE u.id = ?',
      [payload.userId]
    );

    if (!user || !user.length) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user[0].is_active) {
      res.status(403).json({ error: 'User account is deactivated' });
      return;
    }

    // Update last login
    await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user[0].id]);
    
    // Attach user to request
    req.user = user[0];
    req.token = token;
    next();
  } catch (error) {
    logger.error('Authentication error:', { error });
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

// Role-based access control middleware
export function authorize(roles: UserRole | UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// User authentication
// Authenticate user with username/email and password
export async function authenticateUser(identifier: string, password: string): Promise<{ user: User; token: string } | null> {
  try {
    // Find user by username or email
    const [users] = await db.query<User[]>(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
      [identifier, identifier]
    );

    const user = users[0];
    if (!user) {
      return null;
    }

    // Verify password (in a real app, use bcrypt.compare)
    // For now, we'll assume the password is stored in plain text (NOT RECOMMENDED FOR PRODUCTION)
    if (user.password_hash !== password) { // In production, use bcrypt.compare
      return null;
    }

    // Generate JWT token
    const token = generateToken(user);
    
    // Update last login
    await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    return { user, token };
  } catch (error) {
    logger.error('Authentication error:', { error });
    throw new Error('Authentication failed');
  }
}

// Manager credentials - hardcoded as requested
const MANAGER_CREDENTIALS = {
  username: 'manager',
  password: 'manage@Vmax'
};

// Manager user object
export const MANAGER_USER: User = {
  id: 1,
  username: 'manager',
  email: 'manager@vmax.com',
  full_name: 'System Manager',
  role: 'manager',
  team_id: 1,
  team_name: 'MANAGEMENT',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

// Manager-only authentication
export function authenticateManager(username: string, password: string): User | null {
  if (username === MANAGER_CREDENTIALS.username && password === MANAGER_CREDENTIALS.password) {
    return MANAGER_USER;
  }
  return null;
}

// Authenticate any user (manager or from MySQL database)
export async function authenticateUserWithManager(username: string, password: string): Promise<User | null> {
  console.log('Authenticating user:', username);
  
  // First check if it's the manager
  const manager = authenticateManager(username, password);
  if (manager) {
    console.log('Manager authenticated successfully');
    return manager;
  }
  
  // For other users, check MySQL database
  try {
    console.log('Checking MySQL database for user:', username);
    const { user } = await authenticateUser(username, password);
    const { authenticateUser: mysqlAuth } = await import('./mysql-auth-service');
    const user = await mysqlAuth(username, password);
    if (user) {
      console.log('MySQL user authenticated successfully:', user.name);
    } else {
      console.log('MySQL authentication failed for user:', username);
    }
    return user;
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
}

// MySQL-integrated helper functions
export async function getUserById(id: string): Promise<User | null> {
  if (id === MANAGER_USER.id) return MANAGER_USER;
  
  try {
    const { getUserById: mysqlGetUserById } = await import('./mysql-auth-service');
    return await mysqlGetUserById(id);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

export async function getUsersByRole(role: User['role']): Promise<User[]> {
  if (role === 'manager') return [MANAGER_USER];
  
  try {
    const { getUsersByRole: mysqlGetUsersByRole } = await import('./mysql-auth-service');
    return await mysqlGetUsersByRole(role);
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }
}

export async function getUsersByTeam(team: string): Promise<User[]> {
  if (team === 'MANAGEMENT') return [MANAGER_USER];
  
  try {
    const { getUsersByTeam: mysqlGetUsersByTeam } = await import('./mysql-auth-service');
    return await mysqlGetUsersByTeam(team);
  } catch (error) {
    console.error('Error fetching users by team:', error);
    return [];
  }
}