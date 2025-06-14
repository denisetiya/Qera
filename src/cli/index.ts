#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { generateFlatModule } from './new_module_generator';

const VERSION = '0.1.0';
const TEMPLATES_DIR = path.join(__dirname, '../../templates');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

// Main entry point
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    printHelp();
    return;
  }

  switch (command) {
    case 'init':
      initProject(args[1] || 'js');
      break;
    case 'generate':
    case 'g':
      generate(args[1], args.slice(2));
      break;
    case 'serve':
      serve();
      break;
    case 'version':
    case '--version':
    case '-v':
      printVersion();
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      printHelp();
      break;
  }
}

// Print version information
function printVersion() {
  console.log(`Qera Framework v${VERSION}`);
}

// Print help information
function printHelp() {
  console.log(`${colors.bold}Qera Framework CLI${colors.reset} v${VERSION}\n`);
  console.log('Usage:');
  console.log(`  ${colors.green}qera init [js|ts]${colors.reset} - Initialize a new project`);
  console.log(`  ${colors.green}qera generate [component] [name]${colors.reset} - Generate a new component`);
  console.log(`  ${colors.green}qera serve${colors.reset} - Start development server with hot reload`);
  console.log(`  ${colors.green}qera help${colors.reset} - Show this help message`);
  console.log(`  ${colors.green}qera version${colors.reset} - Show version information\n`);
  
  console.log('Generate commands:');
  console.log(`  ${colors.blue}qera g controller [name]${colors.reset} - Generate a new controller`);
  console.log(`  ${colors.blue}qera g middleware [name]${colors.reset} - Generate a new middleware`);
  console.log(`  ${colors.blue}qera g validator [name]${colors.reset} - Generate a new validator`);
  console.log(`  ${colors.blue}qera g service [name]${colors.reset} - Generate a new service`);
  console.log(`  ${colors.blue}qera g route [name]${colors.reset} - Generate a new route file`);
  console.log(`  ${colors.blue}qera g module [name]${colors.reset} - Generate a complete module with controller, service, and router\n`);
}

// Initialize a new project
function initProject(type: string) {
  const cwd = process.cwd();
  
  if (type !== 'js' && type !== 'ts') {
    console.log(`${colors.red}Error: Project type must be 'js' or 'ts'${colors.reset}`);
    return;
  }

  console.log(`${colors.green}Initializing a new Qera ${type === 'ts' ? 'TypeScript' : 'JavaScript'} project...${colors.reset}\n`);
  
  // Create NestJS-like directory structure
  const dirs = [
    'src',
    'src/common',
    'src/common/decorators',
    'src/common/filters',
    'src/common/guards',
    'src/common/interceptors',
    'src/common/interfaces',
    'src/common/middleware',
    'src/common/pipes',
    'src/config',
    'src/modules',
    'src/utils',
    'test',
    'public',
    'dist'
  ];
  
  for (const dir of dirs) {
    const dirPath = path.join(cwd, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`${colors.blue}Created directory:${colors.reset} ${dir}`);
    }
  }
  
  // Create project files
  const packageJson = {
    name: path.basename(cwd),
    version: '0.1.0',
    description: 'Qera Framework application',
    main: type === 'ts' ? 'dist/index.js' : 'src/index.js',
    scripts: {
      start: type === 'ts' ? 'node dist/index.js' : 'node src/index.js',
      dev: type === 'ts' ? 'ts-node-dev --respawn src/index.ts' : 'nodemon src/index.js',
      build: type === 'ts' ? 'tsc' : 'echo "No build step for JavaScript project"',
      test: 'jest'
    },
    dependencies: {
      qera: '^0.1.0'
    },
    devDependencies: type === 'ts' ? {
      typescript: '^5.3.2',
      'ts-node': '^10.9.1',
      'ts-node-dev': '^2.0.0',
      '@types/node': '^20.10.0'
    } : {
      nodemon: '^3.0.1'
    }
  };
  
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  console.log(`${colors.blue}Created file:${colors.reset} package.json`);
  
  // Create .env file
  fs.writeFileSync(
    path.join(cwd, '.env'),
    'PORT=3000\nHOST=localhost\nNODE_ENV=development\n'
  );
  console.log(`${colors.blue}Created file:${colors.reset} .env`);
  
  // Create .gitignore
  fs.writeFileSync(
    path.join(cwd, '.gitignore'),
    'node_modules\ndist\n.env\n*.log\n'
  );
  console.log(`${colors.blue}Created file:${colors.reset} .gitignore`);
  
  // Create tsconfig.json if TypeScript
  if (type === 'ts') {
    fs.writeFileSync(
      path.join(cwd, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true
        },
        include: ['src/**/*'],
        exclude: ['node_modules']
      }, null, 2)
    );
    console.log(`${colors.blue}Created file:${colors.reset} tsconfig.json`);
  }
  
  // Create main file
  const mainFileContent = type === 'ts' 
    ? `import { Qera } from 'qera';
import * as dotenv from 'dotenv';
import { registerUserRoutes } from './modules/users/users.router';

// Load environment variables
dotenv.config();

// Create app instance
const app = new Qera({
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || 'localhost'
});

// Define base routes
app.get('/', (qera) => {
  qera.json({ message: 'Welcome to Qera Framework!' });
});

// Register module routes
registerUserRoutes(app);

// Start the server
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, process.env.HOST);
`
    : `const { Qera } = require('qera');
require('dotenv').config();
const registerUserRoutes = require('./modules/users/users.router');

// Create app instance
const app = new Qera({
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || 'localhost'
});

// Define routes
app.get('/', (qera) => {
  qera.json({ message: 'Welcome to Qera Framework!' });
});

// Register module routes
registerUserRoutes(app);

// Start the server
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, process.env.HOST);
`;
  
  fs.writeFileSync(
    path.join(cwd, 'src', `index.${type}`),
    mainFileContent
  );
  console.log(`${colors.blue}Created file:${colors.reset} src/index.${type}`);
  
  // Create users module files (flat structure)
  console.log(`${colors.green}Creating example users module...${colors.reset}`);
  
  const modulePath = path.join(cwd, 'src', 'modules', 'users');
  if (!fs.existsSync(modulePath)) {
    fs.mkdirSync(modulePath, { recursive: true });
  }
  
  // Create users controller
  const usersControllerContent = type === 'ts'
    ? `import { QeraContext } from 'qera';
import { usersService } from './users.service';

export class UsersController {
  public static async findAll(qera: QeraContext): Promise<void> {
    const users = await usersService.findAll();
    qera.json(users);
  }

  public static async findOne(qera: QeraContext): Promise<void> {
    const { id } = qera.params;
    const user = await usersService.findById(id);
    
    if (!user) {
      return qera.status(404).json({ message: 'User not found' });
    }
    
    qera.json(user);
  }

  public static async create(qera: QeraContext): Promise<void> {
    const userData = qera.body;
    const newUser = await usersService.create(userData);
    qera.status(201).json(newUser);
  }

  public static async update(qera: QeraContext): Promise<void> {
    const { id } = qera.params;
    const userData = qera.body;
    
    const updatedUser = await usersService.update(id, userData);
    
    if (!updatedUser) {
      return qera.status(404).json({ message: 'User not found' });
    }
    
    qera.json(updatedUser);
  }

  public static async delete(qera: QeraContext): Promise<void> {
    const { id } = qera.params;
    const deleted = await usersService.delete(id);
    
    if (!deleted) {
      return qera.status(404).json({ message: 'User not found' });
    }
    
    qera.status(204).end();
  }
}
`
    : `const { usersService } = require('./users.service');

class UsersController {
  static async findAll(qera) {
    const users = await usersService.findAll();
    qera.json(users);
  }

  static async findOne(qera) {
    const { id } = qera.params;
    const user = await usersService.findById(id);
    
    if (!user) {
      return qera.status(404).json({ message: 'User not found' });
    }
    
    qera.json(user);
  }

  static async create(qera) {
    const userData = qera.body;
    const newUser = await usersService.create(userData);
    qera.status(201).json(newUser);
  }

  static async update(qera) {
    const { id } = qera.params;
    const userData = qera.body;
    
    const updatedUser = await usersService.update(id, userData);
    
    if (!updatedUser) {
      return qera.status(404).json({ message: 'User not found' });
    }
    
    qera.json(updatedUser);
  }

  static async delete(qera) {
    const { id } = qera.params;
    const deleted = await usersService.delete(id);
    
    if (!deleted) {
      return qera.status(404).json({ message: 'User not found' });
    }
    
    qera.status(204).end();
  }
}

module.exports = {
  UsersController
};
`;
  
  fs.writeFileSync(
    path.join(modulePath, `users.controller.${type}`),
    usersControllerContent
  );
  console.log(`${colors.blue}Created file:${colors.reset} src/modules/users/users.controller.${type}`);
  
  // Create users service
  const usersServiceContent = type === 'ts'
    ? `import { User } from './user.entity';

export class UsersService {
  private users: User[] = [];
  private nextId: number = 1;

  public async findAll(): Promise<User[]> {
    return this.users;
  }

  public async findById(id: number | string): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  public async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const newUser = {
      id: this.nextId++,
      ...data,
      createdAt: new Date()
    };
    
    this.users.push(newUser);
    return newUser;
  }

  public async update(id: number | string, data: Partial<User>): Promise<User | undefined> {
    const index = this.users.findIndex(user => user.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    this.users[index] = {
      ...this.users[index],
      ...data
    };
    
    return this.users[index];
  }

  public async delete(id: number | string): Promise<boolean> {
    const index = this.users.findIndex(user => user.id === id);
    
    if (index === -1) {
      return false;
    }
    
    this.users.splice(index, 1);
    return true;
  }
}

// Singleton instance
export const usersService = new UsersService();
`
    : `const { User } = require('./user.entity');

class UsersService {
  constructor() {
    this.users = [];
    this.nextId = 1;
  }

  async findAll() {
    return this.users;
  }

  async findById(id) {
    return this.users.find(user => user.id === id);
  }

  async create(data) {
    const newUser = {
      id: this.nextId++,
      ...data,
      createdAt: new Date()
    };
    
    this.users.push(newUser);
    return newUser;
  }

  async update(id, data) {
    const index = this.users.findIndex(user => user.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    this.users[index] = {
      ...this.users[index],
      ...data
    };
    
    return this.users[index];
  }

  async delete(id) {
    const index = this.users.findIndex(user => user.id === id);
    
    if (index === -1) {
      return false;
    }
    
    this.users.splice(index, 1);
    return true;
  }
}

// Singleton instance
const usersService = new UsersService();

module.exports = {
  UsersService,
  usersService
};
`;
  
  fs.writeFileSync(
    path.join(modulePath, `users.service.${type}`),
    usersServiceContent
  );
  console.log(`${colors.blue}Created file:${colors.reset} src/modules/users/users.service.${type}`);
  
  // Create users DTO
  const usersDtoContent = type === 'ts'
    ? `import { z } from 'zod';

export const CreateUserDto = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6)
});

export const UpdateUserDto = CreateUserDto.partial();

export type CreateUserDto = z.infer<typeof CreateUserDto>;
export type UpdateUserDto = z.infer<typeof UpdateUserDto>;
`
    : `const { z } = require('zod');

const CreateUserDto = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6)
});

const UpdateUserDto = CreateUserDto.partial();

module.exports = {
  CreateUserDto,
  UpdateUserDto
};
`;
  
  fs.writeFileSync(
    path.join(modulePath, `users.dto.${type}`),
    usersDtoContent
  );
  console.log(`${colors.blue}Created file:${colors.reset} src/modules/users/users.dto.${type}`);
  
  // Create users router
  const usersRouterContent = type === 'ts'
    ? `import { Qera } from 'qera';
import { UsersController } from './users.controller';

export function registerUserRoutes(app: Qera): void {
  // Define base path for this route group
  const basePath = '/users';
  
  // List all users
  app.get(basePath, UsersController.findAll);
  
  // Get a single user by ID
  app.get(\`\${basePath}/:id\`, UsersController.findOne);
  
  // Create a new user
  app.post(basePath, UsersController.create);
  
  // Update an existing user
  app.put(\`\${basePath}/:id\`, UsersController.update);
  
  // Delete a user
  app.delete(\`\${basePath}/:id\`, UsersController.delete);
}
`
    : `const { UsersController } = require('./users.controller');

function registerUserRoutes(app) {
  // Define base path for this route group
  const basePath = '/users';
  
  // List all users
  app.get(basePath, UsersController.findAll);
  
  // Get a single user by ID
  app.get(\`\${basePath}/:id\`, UsersController.findOne);
  
  // Create a new user
  app.post(basePath, UsersController.create);
  
  // Update an existing user
  app.put(\`\${basePath}/:id\`, UsersController.update);
  
  // Delete a user
  app.delete(\`\${basePath}/:id\`, UsersController.delete);
}

module.exports = registerUserRoutes;
`;
  
  fs.writeFileSync(
    path.join(modulePath, `users.router.${type}`),
    usersRouterContent
  );
  console.log(`${colors.blue}Created file:${colors.reset} src/modules/users/users.router.${type}`);
  
  // Create users entity
  const usersEntityContent = type === 'ts'
    ? `export interface User {
  id: number | string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt?: Date;
}
`
    : `/**
 * @typedef {Object} User
 * @property {number|string} id
 * @property {string} name
 * @property {string} email
 * @property {string} password
 * @property {Date} createdAt
 * @property {Date} [updatedAt]
 */

module.exports = {
  User: {}  // This is a placeholder, in JS we use JSDoc for types
};
`;
  
  fs.writeFileSync(
    path.join(modulePath, `user.entity.${type}`),
    usersEntityContent
  );
  console.log(`${colors.blue}Created file:${colors.reset} src/modules/users/user.entity.${type}`);
  
  // Create users module index file
  const usersIndexContent = type === 'ts'
    ? `export * from './users.controller';
export * from './users.service';
export * from './users.router';
export * from './users.dto';
export * from './user.entity';
`
    : `const { UsersController } = require('./users.controller');
const { UsersService, usersService } = require('./users.service');
const registerUserRoutes = require('./users.router');

module.exports = {
  UsersController,
  UsersService,
  usersService,
  registerUserRoutes
};
`;
  
  fs.writeFileSync(
    path.join(cwd, 'src', 'modules', 'users', `index.${type}`),
    usersIndexContent
  );
  console.log(`${colors.blue}Created file:${colors.reset} src/modules/users/index.${type}`);
  
  // Create example controller
  const controllerContent = type === 'ts'
    ? `import { QeraContext } from 'qera';

export class ExampleController {
  public static getHello(ctx: QeraContext): void {
    ctx.json({ message: 'Hello, world!' });
  }

  public static postExample(ctx: QeraContext): void {
    const { body } = ctx;
    ctx.json({ message: 'Data received', data: body });
  }
}
`
    : `class ExampleController {
  static getHello(ctx) {
    ctx.json({ message: 'Hello, world!' });
  }

  static postExample(ctx) {
    const { body } = ctx;
    ctx.json({ message: 'Data received', data: body });
  }
}

module.exports = ExampleController;
`;
  
  fs.writeFileSync(
    path.join(cwd, 'src', 'controllers', `example.controller.${type}`),
    controllerContent
  );
  console.log(`${colors.blue}Created file:${colors.reset} src/controllers/example.controller.${type}`);
  
  // Create example route
  const routeContent = type === 'ts'
    ? `import { Qera } from 'qera';
import { ExampleController } from '../controllers/example.controller';

export function registerExampleRoutes(app: Qera): void {
  app.get('/hello', ExampleController.getHello);
  app.post('/example', ExampleController.postExample);
}
`
    : `const ExampleController = require('../controllers/example.controller');

function registerExampleRoutes(app) {
  app.get('/hello', ExampleController.getHello);
  app.post('/example', ExampleController.postExample);
}

module.exports = registerExampleRoutes;
`;
  
  fs.writeFileSync(
    path.join(cwd, 'src', 'routes', `example.route.${type}`),
    routeContent
  );
  console.log(`${colors.blue}Created file:${colors.reset} src/routes/example.route.${type}`);
  
  console.log(`\n${colors.green}Project initialized successfully!${colors.reset}`);
  console.log(`\nRun the following commands to get started:\n`);
  console.log(`  ${colors.bold}npm install${colors.reset}`);
  console.log(`  ${colors.bold}npm run dev${colors.reset}\n`);
}

// Generate component
function generate(component: string, args: string[]) {
  if (!component) {
    console.log(`${colors.red}Error: Missing component type${colors.reset}`);
    console.log('Usage: qera generate [component] [name]');
    return;
  }

  const name = args[0];
  if (!name) {
    console.log(`${colors.red}Error: Missing component name${colors.reset}`);
    console.log(`Usage: qera generate ${component} [name]`);
    return;
  }

  // Determine file extension (js or ts)
  const isTypeScript = fs.existsSync(path.join(process.cwd(), 'tsconfig.json'));
  const fileExtension = isTypeScript ? 'ts' : 'js';

  switch (component.toLowerCase()) {
    case 'controller':
      generateController(name, fileExtension);
      break;
    case 'middleware':
      generateMiddleware(name, fileExtension);
      break;
    case 'validator':
      generateValidator(name, fileExtension);
      break;
    case 'service':
      generateService(name, fileExtension);
      break;
    case 'route':
      generateRoute(name, fileExtension);
      break;
    case 'module':
      // Generate a full module with flat structure
      generateFlatModule(name, fileExtension, colors);
      break;
    default:
      console.log(`${colors.red}Error: Unknown component type '${component}'${colors.reset}`);
      console.log('Available components: controller, middleware, validator, service, route, module');
  }
}

// Generate controller
function generateController(name: string, extension: string) {
  const controllerName = formatComponentName(name, 'controller');
  const fileName = `${toKebabCase(controllerName)}.controller.${extension}`;
  
  // Use modules structure with flat files directly in the module folder
  const dirPath = path.join(process.cwd(), 'src', 'modules', toKebabCase(name));
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Generate content based on extension
  const content = extension === 'ts'
    ? `import { QeraContext } from 'qera';

export class ${controllerName} {
  public static async index(ctx: QeraContext): Promise<void> {
    ctx.json({ message: 'List of items' });
  }

  public static async show(ctx: QeraContext): Promise<void> {
    const { id } = ctx.params;
    ctx.json({ message: \`Item with id \${id}\` });
  }

  public static async create(ctx: QeraContext): Promise<void> {
    const { body } = ctx;
    ctx.status(201).json({ message: 'Item created', data: body });
  }

  public static async update(ctx: QeraContext): Promise<void> {
    const { id } = ctx.params;
    const { body } = ctx;
    ctx.json({ message: \`Item \${id} updated\`, data: body });
  }

  public static async delete(ctx: QeraContext): Promise<void> {
    const { id } = ctx.params;
    ctx.json({ message: \`Item \${id} deleted\` });
  }
}
`
    : `class ${controllerName} {
  static async index(ctx) {
    ctx.json({ message: 'List of items' });
  }

  static async show(ctx) {
    const { id } = ctx.params;
    ctx.json({ message: \`Item with id \${id}\` });
  }

  static async create(ctx) {
    const { body } = ctx;
    ctx.status(201).json({ message: 'Item created', data: body });
  }

  static async update(ctx) {
    const { id } = ctx.params;
    const { body } = ctx;
    ctx.json({ message: \`Item \${id} updated\`, data: body });
  }

  static async delete(ctx) {
    const { id } = ctx.params;
    ctx.json({ message: \`Item \${id} deleted\` });
  }
}

module.exports = ${controllerName};
`;
  
  fs.writeFileSync(path.join(dirPath, fileName), content);
  console.log(`${colors.green}Generated controller:${colors.reset} ${fileName}`);
}

// Generate middleware
function generateMiddleware(name: string, extension: string) {
  const middlewareName = formatComponentName(name, 'middleware');
  const fileName = `${toKebabCase(name)}.middleware.${extension}`;
  
  // Use common/middleware structure (NestJS-like)
  const dirPath = path.join(process.cwd(), 'src', 'common', 'middleware');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Generate content based on extension
  const content = extension === 'ts'
    ? `import { QeraContext, Middleware } from 'qera';

export function ${middlewareName}(options: any = {}): Middleware {
  return async (ctx: QeraContext, next: () => Promise<void>): Promise<void> => {
    // Middleware logic before request
    console.log(\`[\${middlewareName}] Processing request to \${ctx.req.getUrl()}\`);
    
    // Measure request time
    const startTime = Date.now();
    
    // Continue to next middleware or route handler
    await next();
    
    // Middleware logic after request
    const duration = Date.now() - startTime;
    console.log(\`[\${middlewareName}] Request completed in \${duration}ms\`);
  };
}
`
    : `function ${middlewareName}(options = {}) {
  return async (ctx, next) => {
    // Middleware logic before request
    console.log(\`[\${middlewareName}] Processing request to \${ctx.req.getUrl()}\`);
    
    // Measure request time
    const startTime = Date.now();
    
    // Continue to next middleware or route handler
    await next();
    
    // Middleware logic after request
    const duration = Date.now() - startTime;
    console.log(\`[\${middlewareName}] Request completed in \${duration}ms\`);
  };
}

module.exports = ${middlewareName};
`;
  
  fs.writeFileSync(path.join(dirPath, fileName), content);
  console.log(`${colors.green}Generated middleware:${colors.reset} ${fileName}`);
}

// Generate validator (becomes DTO in flat structure)
function generateValidator(name: string, extension: string) {
  const validatorName = formatComponentName(name, 'validator');
  const fileName = `${toKebabCase(name)}.dto.${extension}`;
  
  // Use modules structure with flat files directly in the module folder
  const dirPath = path.join(process.cwd(), 'src', 'modules', toKebabCase(name));
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Generate content based on extension
  const content = extension === 'ts'
    ? `import { z } from 'zod';
import { QeraContext, Middleware } from 'qera';

// Define schema using Zod
const ${validatorName}Schema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

// Create a type from the schema
export type ${toPascalCase(name)} = z.infer<typeof ${validatorName}Schema>;

// Middleware factory for validation
export function validate${toPascalCase(name)}(): Middleware {
  return async (ctx: QeraContext, next: () => Promise<void>) => {
    try {
      const validatedData = ${validatorName}Schema.parse(ctx.body);
      
      // Replace request body with validated data
      ctx.body = validatedData;
      
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        ctx.status(400).json({
          error: 'Validation failed',
          details: error.format()
        });
      } else {
        throw error;
      }
    }
  };
}

// Export the schema for reuse
export { ${validatorName}Schema };
`
    : `const { z } = require('zod');

// Define schema using Zod
const ${validatorName}Schema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

// Middleware factory for validation
function validate${toPascalCase(name)}() {
  return async (ctx, next) => {
    try {
      const validatedData = ${validatorName}Schema.parse(ctx.body);
      
      // Replace request body with validated data
      ctx.body = validatedData;
      
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        ctx.status(400).json({
          error: 'Validation failed',
          details: error.format()
        });
      } else {
        throw error;
      }
    }
  };
}

module.exports = {
  ${validatorName}Schema,
  validate${toPascalCase(name)}
};
`;
  
  fs.writeFileSync(path.join(dirPath, fileName), content);
  console.log(`${colors.green}Generated validator:${colors.reset} ${fileName}`);
}

// Generate service
function generateService(name: string, extension: string) {
  const serviceName = formatComponentName(name, 'service');
  const fileName = `${toKebabCase(name)}.service.${extension}`;
  
  // Use modules structure with flat files directly in the module folder
  const dirPath = path.join(process.cwd(), 'src', 'modules', toKebabCase(name));
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Generate content based on extension
  const content = extension === 'ts'
    ? `export interface ${toPascalCase(name)}Item {
  id: number | string;
  name: string;
  [key: string]: any;
}

export class ${serviceName} {
  private items: ${toPascalCase(name)}Item[] = [];
  private nextId: number = 1;

  public async findAll(): Promise<${toPascalCase(name)}Item[]> {
    return this.items;
  }

  public async findById(id: number | string): Promise<${toPascalCase(name)}Item | undefined> {
    return this.items.find(item => item.id === id);
  }

  public async create(data: Omit<${toPascalCase(name)}Item, 'id'>): Promise<${toPascalCase(name)}Item> {
    const newItem = {
      id: this.nextId++,
      ...data
    };
    
    this.items.push(newItem);
    return newItem;
  }

  public async update(id: number | string, data: Partial<${toPascalCase(name)}Item>): Promise<${toPascalCase(name)}Item | undefined> {
    const index = this.items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    this.items[index] = {
      ...this.items[index],
      ...data
    };
    
    return this.items[index];
  }

  public async delete(id: number | string): Promise<boolean> {
    const index = this.items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return false;
    }
    
    this.items.splice(index, 1);
    return true;
  }
}

// Singleton instance
export const ${camelCase(name)}Service = new ${serviceName}();
`
    : `class ${serviceName} {
  constructor() {
    this.items = [];
    this.nextId = 1;
  }

  async findAll() {
    return this.items;
  }

  async findById(id) {
    return this.items.find(item => item.id === id);
  }

  async create(data) {
    const newItem = {
      id: this.nextId++,
      ...data
    };
    
    this.items.push(newItem);
    return newItem;
  }

  async update(id, data) {
    const index = this.items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    this.items[index] = {
      ...this.items[index],
      ...data
    };
    
    return this.items[index];
  }

  async delete(id) {
    const index = this.items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return false;
    }
    
    this.items.splice(index, 1);
    return true;
  }
}

// Singleton instance
const ${camelCase(name)}Service = new ${serviceName}();

module.exports = {
  ${serviceName},
  ${camelCase(name)}Service
};
`;
  
  fs.writeFileSync(path.join(dirPath, fileName), content);
  console.log(`${colors.green}Generated service:${colors.reset} ${fileName}`);
}

// Generate route (becomes module in flat structure)
function generateRoute(name: string, extension: string) {
  const routeName = formatComponentName(name, 'route');
  const controllerName = formatComponentName(name, 'controller');
  const serviceName = formatComponentName(name, 'service');
  const fileName = `${toKebabCase(name)}.router.${extension}`;
  
  // Use modules structure with flat files
  const dirPath = path.join(process.cwd(), 'src', 'modules', toKebabCase(name));
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Generate content based on extension
  const content = extension === 'ts'
    ? `import { Qera } from 'qera';
import { ${controllerName} } from './${toKebabCase(name)}.controller';

// You can import validators and middlewares as needed
// import { validate${toPascalCase(name)} } from './${toKebabCase(name)}.dto';

export function register${toPascalCase(name)}Routes(app: Qera): void {
  // Define base path for this route group
  const basePath = '/${toKebabCase(name)}';
  
  // List all items
  app.get(basePath, ${controllerName}.index);
  
  // Get a single item by ID
  app.get(\`\${basePath}/:id\`, ${controllerName}.show);
  
  // Create a new item
  // You can add a validator middleware: validate${toPascalCase(name)}()
  app.post(basePath, ${controllerName}.create);
  
  // Update an existing item
  app.put(\`\${basePath}/:id\`, ${controllerName}.update);
  
  // Delete an item
  app.delete(\`\${basePath}/:id\`, ${controllerName}.delete);
}
`
    : `const { ${controllerName} } = require('./${toKebabCase(name)}.controller');

// You can import validators and middlewares as needed
// const { validate${toPascalCase(name)} } = require('./${toKebabCase(name)}.dto');

function register${toPascalCase(name)}Routes(app) {
  // Define base path for this route group
  const basePath = '/${toKebabCase(name)}';
  
  // List all items
  app.get(basePath, ${controllerName}.index);
  
  // Get a single item by ID
  app.get(\`\${basePath}/:id\`, ${controllerName}.show);
  
  // Create a new item
  // You can add a validator middleware: validate${toPascalCase(name)}()
  app.post(basePath, ${controllerName}.create);
  
  // Update an existing item
  app.put(\`\${basePath}/:id\`, ${controllerName}.update);
  
  // Delete an item
  app.delete(\`\${basePath}/:id\`, ${controllerName}.delete);
}

module.exports = register${toPascalCase(name)}Routes;
`;
  
  fs.writeFileSync(path.join(dirPath, fileName), content);
  console.log(`${colors.green}Generated route:${colors.reset} ${fileName}`);
}

// Start dev server with hot reload
function serve() {
  console.log(`${colors.green}Starting development server with hot reload...${colors.reset}`);
  
  try {
    // Try to require chokidar
    require.resolve('chokidar');
  } catch (e) {
    console.log(`${colors.yellow}Installing chokidar for hot reload functionality...${colors.reset}`);
    child_process.execSync('npm install --save-dev chokidar', { stdio: 'inherit' });
  }
  
  const chokidar = require('chokidar');
  let server: any = null;
  
  // Function to start or restart the server
  const startServer = () => {
    if (server) {
      server.kill();
      console.log(`${colors.yellow}Restarting server due to changes...${colors.reset}`);
    } else {
      console.log(`${colors.green}Starting server...${colors.reset}`);
    }
    
    // Check for entry file
    const possibleEntryFiles = [
      './src/index.js', 
      './src/index.ts', 
      './src/app.js', 
      './src/app.ts', 
      './index.js', 
      './index.ts'
    ];
    
    let entryFile = null;
    for (const file of possibleEntryFiles) {
      if (fs.existsSync(path.resolve(process.cwd(), file))) {
        entryFile = file;
        break;
      }
    }
    
    if (!entryFile) {
      console.log(`${colors.red}Error: Could not find entry file (index.js, index.ts, app.js, or app.ts)${colors.reset}`);
      return;
    }
    
    // Determine whether to use ts-node or node
    const useTs = entryFile.endsWith('.ts');
    const executable = useTs ? 'ts-node' : 'node';
    
    try {
      // Check if ts-node is installed when needed
      if (useTs) {
        require.resolve('ts-node');
      }
    } catch (e) {
      console.log(`${colors.yellow}Installing ts-node for TypeScript support...${colors.reset}`);
      child_process.execSync('npm install --save-dev ts-node', { stdio: 'inherit' });
    }
    
    // Start the server
    server = child_process.spawn(executable, [entryFile], { stdio: 'inherit' });
    
    // Handle server exit
    server.on('close', (code: number) => {
      if (code !== null && code !== 0 && !server.killed) {
        console.log(`${colors.red}Server process exited with code ${code}${colors.reset}`);
      }
    });
  };
  
  // Start the server initially
  startServer();
  
  // Watch for file changes
  const watcher = chokidar.watch(['./src/**/*.js', './src/**/*.ts'], {
    ignored: /(^|[\/\\])\../, // Ignore dot files
    persistent: true
  });
  
  // Debounce restart to prevent multiple rapid restarts
  let timeout: NodeJS.Timeout | null = null;
  watcher.on('change', (path: string) => {
    console.log(`${colors.blue}File changed: ${path}${colors.reset}`);
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      startServer();
      timeout = null;
    }, 500);
  });
  
  // Handle SIGINT (Ctrl+C) to gracefully exit
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Stopping server...${colors.reset}`);
    if (server) {
      server.kill();
    }
    process.exit(0);
  });
}

// The generateModule function has been replaced by generateFlatModule in new_module_generator.ts

// Helper function: Convert string to PascalCase
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

// Helper function: Convert string to camelCase
function camelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}

// Helper function: Convert string to kebab-case
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// Format component name
function formatComponentName(name: string, type: string): string {
  // Remove any existing suffix
  name = name.replace(/controller$|middleware$|validator$|service$|route$/i, '');
  
  // Format based on component type
  switch (type) {
    case 'controller':
      return toPascalCase(name) + 'Controller';
    case 'middleware':
      return camelCase(name) + 'Middleware';
    case 'validator':
      return camelCase(name) + 'Validator';
    case 'service':
      return toPascalCase(name) + 'Service';
    case 'route':
      return camelCase(name) + 'Route';
    default:
      return toPascalCase(name);
  }
}

// Run the CLI
main();
