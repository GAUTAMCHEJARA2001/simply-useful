import swaggerJsdoc from 'swagger-jsdoc';
import env from './env';

/**
 * ELITE SWAGGER CONFIG (10/10)
 * Features:
 * - OpenAPI 3.0.0 Standard
 * - Bearer Auth Security Scheme
 * - Versioned Servers
 * - Auto-discovery for all Feature Routes
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Simply Useful Elite ERP API',
      version: '1.0.0',
      description: 'Enterprise-grade inventory, sales, and field tracking API documentation.',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Production Standard',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/features/**/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
