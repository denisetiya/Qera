import createApp, { Qera } from './core/app';
import * as middlewares from './middlewares';
import { Logger } from './utils/logger';
import v, { QeraSchema, QeraValidationError, infer as InferType } from './utils/validator';

// Export types
export * from './types';

// Export middleware functions
export const {
  jwtAuth,
  session,
  compression,
  requestLogger,
  errorHandler,
  HttpError
} = middlewares;

// Export core components
export { Qera, Logger };

// Export validator
export { v, QeraSchema, QeraValidationError };
export type { InferType };

// Default export (factory function)
export default createApp;
