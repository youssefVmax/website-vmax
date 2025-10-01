import { z } from 'zod';
import { logger } from './logger';

// Zod-based validation middleware
export const validate = (schema: z.ZodSchema) => {
  return async (req: any, res: any, next: any) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation failed', { errors: error.errors });
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors
        });
      }
      next(error);
    }
  };
};

// Common Zod schemas
export const commonSchemas = {
  id: z.number().int().min(1, 'ID must be a positive integer'),
  
  email: z.string().email('Please provide a valid email').transform(email => email.toLowerCase()),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  username: z.string()
    .min(3, 'Username must be between 3 and 30 characters')
    .max(30, 'Username must be between 3 and 30 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, underscores and hyphens'),
  
  phone: z.string()
    .regex(/^[0-9+\-\s()]+$/, 'Please provide a valid phone number')
    .optional(),
  
  pagination: z.object({
    page: z.number().int().min(1, 'Page must be a positive integer').optional().default(1),
    limit: z.number().int().min(1, 'Limit must be between 1 and 100').max(100, 'Limit must be between 1 and 100').optional().default(10),
    sortBy: z.string().min(1, 'Sort field cannot be empty').optional(),
    sortOrder: z.enum(['asc', 'desc'], { message: 'Sort order must be either "asc" or "desc"' }).optional().default('asc')
  })
};

// User validation schemas
export const userValidation = {
  create: z.object({
    username: z.string()
      .min(3, 'Username must be between 3 and 30 characters')
      .max(30, 'Username must be between 3 and 30 characters'),
    email: z.string().email('Please provide a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    full_name: z.string()
      .min(2, 'Full name must be between 2 and 100 characters')
      .max(100, 'Full name must be between 2 and 100 characters'),
    role: z.enum(['admin', 'manager', 'team_leader', 'sales_agent'], { message: 'Invalid role' }),
    team_id: z.number().int().min(1, 'Team ID must be a positive integer').optional()
  }),
  
  update: z.object({
    id: commonSchemas.id,
    email: z.string().email('Please provide a valid email').optional(),
    full_name: z.string()
      .min(2, 'Full name must be between 2 and 100 characters')
      .max(100, 'Full name must be between 2 and 100 characters')
      .optional(),
    role: z.enum(['admin', 'manager', 'team_leader', 'sales_agent'], { message: 'Invalid role' }).optional(),
    team_id: z.number().int().min(1, 'Team ID must be a positive integer').optional(),
    is_active: z.boolean({ message: 'is_active must be a boolean' }).optional()
  })
};

// Deal validation schemas
export const dealValidation = {
  create: z.object({
    customer_name: z.string()
      .min(2, 'Customer name must be between 2 and 100 characters')
      .max(100, 'Customer name must be between 2 and 100 characters'),
    email: z.string().email('Please provide a valid email').optional(),
    amount: z.number().min(0, 'Amount must be a positive number'),
    status: z.enum(['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], { message: 'Invalid status' }),
    priority: z.enum(['low', 'medium', 'high'], { message: 'Priority must be low, medium, or high' }).optional(),
    sales_agent_id: z.number().int().min(1, 'Sales agent ID must be a positive integer')
  }),
  
  update: z.object({
    id: commonSchemas.id.optional(),
    customer_name: z.string()
      .min(2, 'Customer name must be between 2 and 100 characters')
      .max(100, 'Customer name must be between 2 and 100 characters')
      .optional(),
    email: z.string().email('Please provide a valid email').optional(),
    amount: z.number().min(0, 'Amount must be a positive number').optional(),
    status: z.enum(['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], { message: 'Invalid status' }).optional(),
    priority: z.enum(['low', 'medium', 'high'], { message: 'Priority must be low, medium, or high' }).optional()
  })
};

// Callback validation schemas
export const callbackValidation = {
  create: z.object({
    customer_name: z.string()
      .min(2, 'Customer name must be between 2 and 100 characters')
      .max(100, 'Customer name must be between 2 and 100 characters'),
    phone: z.string()
      .min(5, 'Phone number must be between 5 and 20 characters')
      .max(20, 'Phone number must be between 5 and 20 characters'),
    scheduled_time: z.string()
      .refine((value) => {
        const scheduledTime = new Date(value);
        const now = new Date();
        return scheduledTime > now;
      }, 'Scheduled time must be in the future'),
    priority: z.enum(['low', 'medium', 'high'], { message: 'Priority must be low, medium, or high' }).optional(),
    sales_agent_id: z.number().int().min(1, 'Sales agent ID must be a positive integer')
  }),
  
  update: z.object({
    id: commonSchemas.id.optional(),
    customer_name: z.string()
      .min(2, 'Customer name must be between 2 and 100 characters')
      .max(100, 'Customer name must be between 2 and 100 characters')
      .optional(),
    phone: z.string()
      .min(5, 'Phone number must be between 5 and 20 characters')
      .max(20, 'Phone number must be between 5 and 20 characters')
      .optional(),
    scheduled_time: z.string()
      .refine((value) => {
        const scheduledTime = new Date(value);
        const now = new Date();
        return scheduledTime > now;
      }, 'Scheduled time must be in the future')
      .optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled', 'no_answer'], { message: 'Invalid status' }).optional(),
    priority: z.enum(['low', 'medium', 'high'], { message: 'Priority must be low, medium, or high' }).optional()
  })
};

// Team validation schemas
export const teamValidation = {
  create: z.object({
    name: z.string()
      .min(2, 'Team name must be between 2 and 50 characters')
      .max(50, 'Team name must be between 2 and 50 characters'),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    manager_id: z.number().int().min(1, 'Manager ID must be a positive integer').optional()
  }),
  
  update: z.object({
    id: commonSchemas.id.optional(),
    name: z.string()
      .min(2, 'Team name must be between 2 and 50 characters')
      .max(50, 'Team name must be between 2 and 50 characters')
      .optional(),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    manager_id: z.number().int().min(1, 'Manager ID must be a positive integer').optional()
  })
};
