import swaggerJsdoc from 'swagger-jsdoc';
import * as swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';
import { readFileSync } from 'fs';
import { logger } from './logger';

// Load package.json for version and other metadata
const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));

// Define common response schemas
const commonSchemas = {
  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'An error occurred' },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'ERROR_CODE' },
          message: { type: 'string', example: 'Detailed error message' },
          details: { type: 'object' },
        },
      },
    },
  },
  ValidationError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Validation failed' },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            param: { type: 'string' },
            msg: { type: 'string' },
            location: { type: 'string' },
            value: { type: 'string' },
          },
        },
      },
    },
  },
  Pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 10 },
      total: { type: 'integer', example: 100 },
      totalPages: { type: 'integer', example: 10 },
    },
  },
};

// Common parameters that can be reused across endpoints
const commonParameters = {
  pagination: [
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      required: false,
      schema: {
        type: 'integer',
        default: 1,
        minimum: 1,
      },
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of items per page',
      required: false,
      schema: {
        type: 'integer',
        default: 10,
        minimum: 1,
        maximum: 100,
      },
    },
    {
      name: 'sort',
      in: 'query',
      description: 'Sort field and direction (e.g., "name:asc" or "createdAt:desc")',
      required: false,
      schema: {
        type: 'string',
      },
    },
  ],
  search: {
    name: 'q',
    in: 'query',
    description: 'Search query',
    required: false,
    schema: {
      type: 'string',
    },
  },
};

// Security scheme definitions
const securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Enter JWT token in the format: Bearer <token>',
  },
  apiKey: {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key',
    description: 'API key for external services',
  },
};

// Default responses that can be reused across endpoints
const defaultResponses = {
  200: {
    description: 'Successful operation',
  },
  400: {
    description: 'Bad request',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  },
  401: {
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  },
  403: {
    description: 'Forbidden',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  },
  404: {
    description: 'Not found',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  },
  422: {
    description: 'Validation error',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ValidationError',
        },
      },
    },
  },
  429: {
    description: 'Too many requests',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  },
  500: {
    description: 'Internal server error',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
      },
    },
  },
};

// Generate OpenAPI specification
const generateSpec = () => {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'VMAX API',
        version: packageJson.version || '1.0.0',
        description: 'API documentation for VMAX application',
        contact: {
          name: 'VMAX Support',
          url: 'https://vmaxcom.org/support',
          email: 'support@vmaxcom.org',
        },
        license: {
          name: 'Proprietary',
          url: 'https://vmaxcom.org/license',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000/api',
          description: 'Development server',
        },
        {
          url: 'https://vmaxcom.org/api',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes,
        schemas: {
          ...commonSchemas,
          // Add your domain-specific schemas here
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              role: { type: 'string', enum: ['admin', 'manager', 'user'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          // Add more domain models as needed
        },
        parameters: {
          ...commonParameters,
        },
        responses: {
          ...defaultResponses,
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: [
      // Path to API routes
      path.join(process.cwd(), 'app', 'api', '**', 'route.ts'),
      path.join(process.cwd(), 'app', 'api', '**', '*.ts'),
      // Path to API documentation in JSDoc format
      path.join(process.cwd(), 'lib', '**', '*.ts'),
    ],
  };

  try {
    const specs = swaggerJsdoc(options);
    return specs;
  } catch (error) {
    logger.error('Error generating Swagger specs:', error);
    throw error;
  }
};

// Serve Swagger UI
const serveSwaggerUI = (app: Express, path = '/api-docs') => {
  try {
    const specs = generateSpec();
    
    // Serve Swagger UI
    app.use(
      path,
      swaggerUi.serve,
      swaggerUi.setup(specs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'VMAX API Documentation',
        customfavIcon: '/favicon.ico',
      })
    );

    // JSON endpoint for the OpenAPI spec
    app.get(`${path}-json`, (req, res) => {
      res.json(specs);
    });

    logger.info(`Swagger docs available at http://localhost:${process.env.PORT || 3000}${path}`);
  } catch (error) {
    logger.error('Failed to serve Swagger UI:', error);
  }
};

export { generateSpec, serveSwaggerUI };

// Example usage in your main server file:
/*
import express from 'express';
import { serveSwaggerUI } from './lib/swagger';

const app = express();

// Your routes and middleware here

// Serve Swagger UI at /api-docs
serveSwaggerUI(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
});
*/

// Example of documenting an endpoint with JSDoc:
/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of users with pagination
 *     tags:
 *       - Users
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - $ref: '#/components/parameters/sort'
 *       - name: role
 *         in: query
 *         description: Filter users by role
 *         schema:
 *           type: string
 *           enum: [admin, manager, user]
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 meta:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/401'
 *       500:
 *         $ref: '#/components/responses/500'
 */
