const buildOpenApiSpec = (port) => ({
  openapi: '3.0.3',
  info: {
    title: 'Brocode Party Update API',
    version: '1.0.0',
    description:
      'Backend API for authentication, catalog, events, orders, billing, and maintenance jobs.',
  },
  servers: [{ url: `http://localhost:${port}` }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Catalog' },
    { name: 'Spots' },
    { name: 'Orders' },
    { name: 'Bills' },
    { name: 'Users' },
    { name: 'Jobs' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
      },
    },
  },
  paths: {
    '/api/health': { get: { tags: ['Health'], summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate user and return token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Authenticated' }, 401: { description: 'Invalid credentials' } },
      },
    },
    '/api/catalog': { get: { tags: ['Catalog'], summary: 'Get catalog', responses: { 200: { description: 'Catalog' } } } },
    '/api/catalog/{category}': {
      get: {
        tags: ['Catalog'],
        summary: 'Get catalog category',
        parameters: [{ name: 'category', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Category items' }, 404: { description: 'Unknown category' } },
      },
    },
    '/api/spots': { get: { tags: ['Spots'], summary: 'Get events/spots', responses: { 200: { description: 'Spots' } } } },
    '/api/orders': {
      get: {
        tags: ['Orders'],
        security: [{ BearerAuth: [] }],
        summary: 'List orders',
        parameters: [
          { name: 'spotId', in: 'query', schema: { type: 'string' } },
          { name: 'userId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Orders' }, 401: { description: 'Unauthorized' } },
      },
      post: {
        tags: ['Orders'],
        security: [{ BearerAuth: [] }],
        summary: 'Create order',
        responses: { 201: { description: 'Created' }, 400: { description: 'Validation error' } },
      },
    },
    '/api/orders/{orderId}': {
      get: {
        tags: ['Orders'],
        security: [{ BearerAuth: [] }],
        summary: 'Get order by id',
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Order' }, 404: { description: 'Not found' } },
      },
    },
    '/api/bills/{spotId}': {
      get: {
        tags: ['Bills'],
        security: [{ BearerAuth: [] }],
        summary: 'Get bill summary for a spot',
        parameters: [{ name: 'spotId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Bill' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/users/{userId}': {
      delete: {
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        summary: 'Delete a user and related records',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/jobs/reminders/run': {
      post: {
        tags: ['Jobs'],
        summary: 'Trigger reminder enqueue job now',
        responses: { 202: { description: 'Reminder enqueue accepted' } },
      },
    },
    '/api/jobs/cleanup/run': {
      post: {
        tags: ['Jobs'],
        summary: 'Trigger expired events cleanup job now',
        responses: { 202: { description: 'Cleanup enqueue accepted' } },
      },
    },
  },
});

const buildSwaggerHtml = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Brocode API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`;

export { buildOpenApiSpec, buildSwaggerHtml };
