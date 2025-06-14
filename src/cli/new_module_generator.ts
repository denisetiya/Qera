import * as fs from 'fs';
import * as path from 'path';

// Generate a full module with flat file structure
export function generateFlatModule(name: string, extension: string, colors: any) {
  console.log(`${colors.green}Generating module:${colors.reset} ${name}`);
  const modulePath = path.join(process.cwd(), 'src', 'modules', toKebabCase(name));
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(modulePath)) {
    fs.mkdirSync(modulePath, { recursive: true });
  }
  
  // Generate controller file
  const controllerName = formatComponentName(name, 'controller');
  const controllerFileName = `${toKebabCase(name)}.controller.${extension}`;
  
  const controllerContent = extension === 'ts'
    ? `import { QeraContext } from 'qera';
import { ${camelCase(name)}Service } from './${toKebabCase(name)}.service';

export class ${controllerName} {
  public static async index(qera: QeraContext): Promise<void> {
    const items = await ${camelCase(name)}Service.findAll();
    qera.json(items);
  }

  public static async show(qera: QeraContext): Promise<void> {
    const { id } = qera.params;
    const item = await ${camelCase(name)}Service.findById(id);
    
    if (!item) {
      return qera.status(404).json({ message: 'Item not found' });
    }
    
    qera.json(item);
  }

  public static async create(qera: QeraContext): Promise<void> {
    const data = qera.body;
    const newItem = await ${camelCase(name)}Service.create(data);
    qera.status(201).json(newItem);
  }

  public static async update(qera: QeraContext): Promise<void> {
    const { id } = qera.params;
    const data = qera.body;
    
    const updatedItem = await ${camelCase(name)}Service.update(id, data);
    
    if (!updatedItem) {
      return qera.status(404).json({ message: 'Item not found' });
    }
    
    qera.json(updatedItem);
  }

  public static async delete(qera: QeraContext): Promise<void> {
    const { id } = qera.params;
    const deleted = await ${camelCase(name)}Service.delete(id);
    
    if (!deleted) {
      return qera.status(404).json({ message: 'Item not found' });
    }
    
    qera.status(204).end();
  }
}
`
    : `const { ${camelCase(name)}Service } = require('./${toKebabCase(name)}.service');

class ${controllerName} {
  static async index(qera) {
    const items = await ${camelCase(name)}Service.findAll();
    qera.json(items);
  }

  static async show(qera) {
    const { id } = qera.params;
    const item = await ${camelCase(name)}Service.findById(id);
    
    if (!item) {
      return qera.status(404).json({ message: 'Item not found' });
    }
    
    qera.json(item);
  }

  static async create(qera) {
    const data = qera.body;
    const newItem = await ${camelCase(name)}Service.create(data);
    qera.status(201).json(newItem);
  }

  static async update(qera) {
    const { id } = qera.params;
    const data = qera.body;
    
    const updatedItem = await ${camelCase(name)}Service.update(id, data);
    
    if (!updatedItem) {
      return qera.status(404).json({ message: 'Item not found' });
    }
    
    qera.json(updatedItem);
  }

  static async delete(qera) {
    const { id } = qera.params;
    const deleted = await ${camelCase(name)}Service.delete(id);
    
    if (!deleted) {
      return qera.status(404).json({ message: 'Item not found' });
    }
    
    qera.status(204).end();
  }
}

module.exports = {
  ${controllerName}
};
`;
  
  fs.writeFileSync(path.join(modulePath, controllerFileName), controllerContent);
  console.log(`${colors.green}Generated controller:${colors.reset} ${controllerFileName}`);
  
  // Generate service file
  const serviceName = formatComponentName(name, 'service');
  const serviceFileName = `${toKebabCase(name)}.service.${extension}`;
  
  const serviceContent = extension === 'ts'
    ? `import { ${toPascalCase(name)} } from './${toKebabCase(name)}.entity';

export class ${serviceName} {
  private items: ${toPascalCase(name)}[] = [];
  private nextId: number = 1;

  public async findAll(): Promise<${toPascalCase(name)}[]> {
    return this.items;
  }

  public async findById(id: number | string): Promise<${toPascalCase(name)} | undefined> {
    return this.items.find(item => item.id === id);
  }

  public async create(data: Omit<${toPascalCase(name)}, 'id' | 'createdAt' | 'updatedAt'>): Promise<${toPascalCase(name)}> {
    const newItem = {
      id: this.nextId++,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    } as ${toPascalCase(name)};
    
    this.items.push(newItem);
    return newItem;
  }

  public async update(id: number | string, data: Partial<${toPascalCase(name)}>): Promise<${toPascalCase(name)} | undefined> {
    const index = this.items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    this.items[index] = {
      ...this.items[index],
      ...data,
      updatedAt: new Date()
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
    : `const { ${toPascalCase(name)} } = require('./${toKebabCase(name)}.entity');

class ${serviceName} {
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
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
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
      ...data,
      updatedAt: new Date()
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
  
  fs.writeFileSync(path.join(modulePath, serviceFileName), serviceContent);
  console.log(`${colors.green}Generated service:${colors.reset} ${serviceFileName}`);
  
  // Generate entity file
  const entityFileName = `${toKebabCase(name)}.entity.${extension}`;
  const entityContent = extension === 'ts'
    ? `export interface ${toPascalCase(name)} {
  id: number | string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}
`
    : `/**
 * @typedef {Object} ${toPascalCase(name)}
 * @property {number|string} id
 * @property {string} name
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

module.exports = {
  ${toPascalCase(name)}: {}  // This is a placeholder, in JS we use JSDoc for types
};
`;
  
  fs.writeFileSync(path.join(modulePath, entityFileName), entityContent);
  console.log(`${colors.green}Generated entity:${colors.reset} ${entityFileName}`);
  
  // Generate DTO file
  const dtoFileName = `${toKebabCase(name)}.dto.${extension}`;
  const dtoContent = extension === 'ts'
    ? `import { z } from 'zod';

// Create DTO schema for validation
export const Create${toPascalCase(name)}Dto = z.object({
  name: z.string().min(1).max(255),
  // Add other fields as needed
});

export const Update${toPascalCase(name)}Dto = Create${toPascalCase(name)}Dto.partial();

// Create types from schemas
export type Create${toPascalCase(name)}Dto = z.infer<typeof Create${toPascalCase(name)}Dto>;
export type Update${toPascalCase(name)}Dto = z.infer<typeof Update${toPascalCase(name)}Dto>;
`
    : `const { z } = require('zod');

// Create DTO schema for validation
const Create${toPascalCase(name)}Dto = z.object({
  name: z.string().min(1).max(255),
  // Add other fields as needed
});

const Update${toPascalCase(name)}Dto = Create${toPascalCase(name)}Dto.partial();

module.exports = {
  Create${toPascalCase(name)}Dto,
  Update${toPascalCase(name)}Dto
};
`;
  
  fs.writeFileSync(path.join(modulePath, dtoFileName), dtoContent);
  console.log(`${colors.green}Generated DTO:${colors.reset} ${dtoFileName}`);
  
  // Generate router file
  const routerFileName = `${toKebabCase(name)}.router.${extension}`;
  
  const routerContent = extension === 'ts'
    ? `import { Qera } from 'qera';
import { ${controllerName} } from './${toKebabCase(name)}.controller';
// import { Create${toPascalCase(name)}Dto, Update${toPascalCase(name)}Dto } from './${toKebabCase(name)}.dto';

export function register${toPascalCase(name)}Routes(app: Qera): void {
  // Define base path for this route group
  const basePath = '/${toKebabCase(name)}';
  
  // List all items
  app.get(basePath, ${controllerName}.index);
  
  // Get a single item by ID
  app.get(\`\${basePath}/:id\`, ${controllerName}.show);
  
  // Create a new item
  app.post(basePath, ${controllerName}.create);
  
  // Update an existing item
  app.put(\`\${basePath}/:id\`, ${controllerName}.update);
  
  // Delete an item
  app.delete(\`\${basePath}/:id\`, ${controllerName}.delete);
}
`
    : `const { ${controllerName} } = require('./${toKebabCase(name)}.controller');
// const { Create${toPascalCase(name)}Dto, Update${toPascalCase(name)}Dto } = require('./${toKebabCase(name)}.dto');

function register${toPascalCase(name)}Routes(app) {
  // Define base path for this route group
  const basePath = '/${toKebabCase(name)}';
  
  // List all items
  app.get(basePath, ${controllerName}.index);
  
  // Get a single item by ID
  app.get(\`\${basePath}/:id\`, ${controllerName}.show);
  
  // Create a new item
  app.post(basePath, ${controllerName}.create);
  
  // Update an existing item
  app.put(\`\${basePath}/:id\`, ${controllerName}.update);
  
  // Delete an item
  app.delete(\`\${basePath}/:id\`, ${controllerName}.delete);
}

module.exports = register${toPascalCase(name)}Routes;
`;
  
  fs.writeFileSync(path.join(modulePath, routerFileName), routerContent);
  console.log(`${colors.green}Generated router:${colors.reset} ${routerFileName}`);
  
  // Generate index file
  const indexFileName = `index.${extension}`;
  const indexContent = extension === 'ts'
    ? `export * from './${toKebabCase(name)}.controller';
export * from './${toKebabCase(name)}.service';
export * from './${toKebabCase(name)}.router';
export * from './${toKebabCase(name)}.dto';
export * from './${toKebabCase(name)}.entity';
`
    : `const { ${controllerName} } = require('./${toKebabCase(name)}.controller');
const { ${serviceName}, ${camelCase(name)}Service } = require('./${toKebabCase(name)}.service');
const register${toPascalCase(name)}Routes = require('./${toKebabCase(name)}.router');

module.exports = {
  ${controllerName},
  ${serviceName},
  ${camelCase(name)}Service,
  register${toPascalCase(name)}Routes
};
`;
  
  fs.writeFileSync(path.join(modulePath, indexFileName), indexContent);
  console.log(`${colors.green}Generated index:${colors.reset} ${indexFileName}`);
}

// Helper functions
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function camelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

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
