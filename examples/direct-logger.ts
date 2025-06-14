import { Logger } from '../src';

// Example of using Logger directly without creating an instance
Logger.info('Application starting...');

// Log different levels
Logger.debug('Debug information');
Logger.info('Information message');
Logger.warn('Warning message');
Logger.error('Error occurred', { code: 500 });

// Configure the logger
Logger.configure({
  level: 'debug', // Show all log levels including debug
  format: 'pretty'
});

Logger.debug('This debug message will now appear');

// Log with metadata
Logger.info('User action', { 
  userId: 123,
  action: 'login',
  timestamp: new Date()
});

// Helper function demonstrating logger usage inside functions
function processItem(item: any) {
  Logger.info(`Processing item: ${item.id}`);
  
  try {
    // Some processing logic...
    if (!item.isValid) {
      Logger.warn(`Invalid item detected: ${item.id}`, { item });
      return false;
    }
    
    return true;
  } catch (error) {
    Logger.error(`Failed to process item: ${item.id}`, { 
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

// Example usage
processItem({ id: 123, isValid: true });
processItem({ id: 456, isValid: false });

// When application is shutting down
Logger.info('Application shutting down');
Logger.close();
