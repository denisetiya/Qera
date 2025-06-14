import { HttpRequest, HttpResponse, WebSocket } from "uWebSockets.js";
import { ZodType } from "zod";

// Core request context types
export interface QeraContext {
  req: HttpRequest;
  res: HttpResponse;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body: any;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  session?: Record<string, any>;
  user?: any;
  state: Record<string, any>;
  
  // Status code accessor
  readonly statusCode: number;
  
  // Response methods
  status(code: number): QeraContext;
  header(key: string, value: string): QeraContext;
  json(data: any): void;
  send(body: string | Buffer | ArrayBuffer): void;
  redirect(url: string, status?: number): void;
  cookie(name: string, value: string, options?: CookieOptions): QeraContext;
  clearCookie(name: string, options?: CookieOptions): QeraContext;
  
  // Utility methods
  validate<T>(schema: ZodType<T>): T;
  encrypt(data: string): string;
  decrypt(data: string): string;
  signJwt(payload: any, options?: JwtOptions): string;
  verifyJwt(token: string): any;
}

export interface CookieOptions {
  expires?: Date;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export interface JwtOptions {
  expiresIn?: string | number;
  audience?: string | string[];
  issuer?: string;
  subject?: string;
}

// Route handler type
export type RouteHandler = (context: QeraContext) => void | Promise<void>;

// Middleware type
export type Middleware = (context: QeraContext, next: () => Promise<void>) => void | Promise<void>;

// WebSocket interface
export interface QeraWebSocketContext {
  ws: WebSocket<any>;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  send(message: string | ArrayBuffer | Buffer): boolean;
  close(code?: number, message?: string): void;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  publish(topic: string, message: string | ArrayBuffer | Buffer): void;
  authenticate(handler: (token: string) => boolean | Promise<boolean>): Promise<boolean>;
}

export type WebSocketHandler = {
  open?: (ctx: QeraWebSocketContext) => void | Promise<void>;
  message?: (ctx: QeraWebSocketContext, message: ArrayBuffer, isBinary: boolean) => void | Promise<void>;
  close?: (ctx: QeraWebSocketContext, code: number, message: ArrayBuffer) => void | Promise<void>;
  ping?: (ctx: QeraWebSocketContext, message: ArrayBuffer) => void | Promise<void>;
  pong?: (ctx: QeraWebSocketContext, message: ArrayBuffer) => void | Promise<void>;
  drain?: (ctx: QeraWebSocketContext) => void | Promise<void>;
};

// Configuration types
export interface QeraConfig {
  port?: number;
  host?: string;
  ssl?: {
    key_file_name: string;
    cert_file_name: string;
  };
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format?: 'pretty' | 'json';
    output?: 'console' | string; // console or file path
  };
  cors?: {
    origin?: string | string[] | boolean;
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  };
  compression?: boolean;
  bodyLimit?: string | number; // e.g., "1mb" or bytes
  session?: {
    secret: string;
    name?: string;
    cookie?: CookieOptions;
    store?: 'memory' | 'redis' | 'file' | object; // custom store implementation
    ttl?: number; // seconds
  };
  jwt?: {
    secret: string;
    algorithms?: string[];
    expiresIn?: string | number;
  };
  staticFiles?: {
    root: string;
    prefix?: string;
    cacheControl?: string;
  };
  rateLimit?: {
    max: number;
    windowMs: number;
    message?: string;
    statusCode?: number;
    headers?: boolean;
    keyGenerator?: (ctx: QeraContext) => string;
  };
  encryption?: {
    secret: string;
    algorithm?: string;
  };
}
