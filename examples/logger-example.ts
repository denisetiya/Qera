import { Logger } from '../src';

// Example 1: Using Logger with default settings
Logger.info('This is an info message');
Logger.warn('This is a warning message');
Logger.error('This is an error message', { errorCode: 500 });
Logger.debug('This debug message will not show by default since default level is info');

// Example 2: Configuring Logger
Logger.configure({
  level: 'debug',
  format: 'pretty',
  // You can also log to a file
  // output: './logs/app.log'
});

// Now debug messages will show
Logger.debug('This debug message will now show after configuring');

// Example 3: Using with metadata
Logger.info('User login successful', { userId: 123, username: 'john_doe' });

// Example 4: Error logging
try {
  throw new Error('Something went wrong');
} catch (error) {
  Logger.error('An error occurred', {
    error: error.message,
    stack: error.stack
  });
}

// Clean up resources when done (important if using file output)
Logger.close();
