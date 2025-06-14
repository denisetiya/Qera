import createApp, { Qera } from './core/app';
import * as middlewares from './middlewares';
import { Logger } from './utils/logger';

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

// Default export (factory function)
export default createApp;
