import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, body, param, query } from 'express-validator';
import { logger } from './logger';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    logger.warn('Validation failed', { errors: errors.array() });
    return res.status(400).json({ 
      success: false,
      message: 'Validation failed',
      errors: errors.array() 
    });
  };
};

// Common validation rules
export const commonRules = {
  id: param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
    .toInt(),
    
  email: body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
    
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
    
  username: body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, underscores and hyphens'),
    
  phone: body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Please provide a valid phone number'),
    
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sortBy')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Sort field cannot be empty'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be either "asc" or "desc"')
  ]
};

// User validation rules
export const userValidation = {
  create: [
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('full_name')
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('role')
      .isIn(['admin', 'manager', 'team_leader', 'sales_agent'])
      .withMessage('Invalid role'),
    body('team_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Team ID must be a positive integer')
      .toInt()
  ],
  
  update: [
    commonRules.id,
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('full_name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'team_leader', 'sales_agent'])
      .withMessage('Invalid role'),
    body('team_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Team ID must be a positive integer')
      .toInt(),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean')
      .toBoolean()
  ]
};

// Deal validation rules
export const dealValidation = {
  create: [
    body('customer_name')
      .isLength({ min: 2, max: 100 })
      .withMessage('Customer name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    body('status')
      .isIn(['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    body('sales_agent_id')
      .isInt({ min: 1 })
      .withMessage('Sales agent ID must be a positive integer')
      .toInt()
  ],
  
  update: [
    commonRules.id,
    body('customer_name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Customer name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    body('status')
      .optional()
      .isIn(['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high')
  ]
};

// Callback validation rules
export const callbackValidation = {
  create: [
    body('customer_name')
      .isLength({ min: 2, max: 100 })
      .withMessage('Customer name must be between 2 and 100 characters'),
    body('phone')
      .isLength({ min: 5, max: 20 })
      .withMessage('Phone number must be between 5 and 20 characters'),
    body('scheduled_time')
      .isISO8601()
      .withMessage('Please provide a valid ISO 8601 date time')
      .custom((value) => {
        const scheduledTime = new Date(value);
        const now = new Date();
        if (scheduledTime <= now) {
          throw new Error('Scheduled time must be in the future');
        }
        return true;
      }),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    body('sales_agent_id')
      .isInt({ min: 1 })
      .withMessage('Sales agent ID must be a positive integer')
      .toInt()
  ],
  
  update: [
    commonRules.id,
    body('customer_name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Customer name must be between 2 and 100 characters'),
    body('phone')
      .optional()
      .isLength({ min: 5, max: 20 })
      .withMessage('Phone number must be between 5 and 20 characters'),
    body('scheduled_time')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid ISO 8601 date time')
      .custom((value) => {
        const scheduledTime = new Date(value);
        const now = new Date();
        if (scheduledTime <= now) {
          throw new Error('Scheduled time must be in the future');
        }
        return true;
      }),
    body('status')
      .optional()
      .isIn(['scheduled', 'completed', 'cancelled', 'no_answer'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high')
  ]
};

// Team validation rules
export const teamValidation = {
  create: [
    body('name')
      .isLength({ min: 2, max: 50 })
      .withMessage('Team name must be between 2 and 50 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('manager_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Manager ID must be a positive integer')
      .toInt()
  ],
  
  update: [
    commonRules.id,
    body('name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Team name must be between 2 and 50 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('manager_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Manager ID must be a positive integer')
      .toInt()
  ]
};
