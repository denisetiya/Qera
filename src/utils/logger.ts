import * as fs from 'fs';
import * as path from 'path';

interface LoggerConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  format?: 'pretty' | 'json';
  output?: 'console' | string;
}

export class Logger {
  private level: string;
  private format: string;
  private output: string;
  private logStream: fs.WriteStream | null = null;
  
  private levelPriority: Record<string, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(config: LoggerConfig = {}) {
    this.level = config.level || 'info';
    this.format = config.format || 'pretty';
    this.output = config.output || 'console';
    
    // Set up file stream if output is a file path
    if (this.output !== 'console') {
      const logDir = path.dirname(this.output);
      
      // Ensure the directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      this.logStream = fs.createWriteStream(this.output, { flags: 'a' });
    }
  }

  debug(message: string, meta: Record<string, any> = {}): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta: Record<string, any> = {}): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta: Record<string, any> = {}): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta: Record<string, any> = {}): void {
    this.log('error', message, meta);
  }

  private log(level: string, message: string, meta: Record<string, any> = {}): void {
    // Check if this log level should be emitted
    if (this.levelPriority[level] < this.levelPriority[this.level]) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    let output: string;
    
    if (this.format === 'json') {
      output = JSON.stringify({
        timestamp,
        level,
        message,
        ...meta
      });
    } else {
      // Pretty format
      const metaString = Object.keys(meta).length > 0
        ? ' ' + JSON.stringify(meta)
        : '';
      
      const levelColor = this.getLevelColor(level);
      const resetColor = '\x1b[0m';
      
      // Only use colors when outputting to console
      if (this.output === 'console') {
        output = `${timestamp} ${levelColor}${level.toUpperCase()}${resetColor}: ${message}${metaString}`;
      } else {
        output = `${timestamp} ${level.toUpperCase()}: ${message}${metaString}`;
      }
    }
    
    // Output to destination
    if (this.output === 'console') {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](output);
    } else if (this.logStream) {
      this.logStream.write(output + '\n');
    }
  }

  private getLevelColor(level: string): string {
    switch (level) {
      case 'debug': return '\x1b[34m'; // Blue
      case 'info': return '\x1b[32m';  // Green
      case 'warn': return '\x1b[33m';  // Yellow
      case 'error': return '\x1b[31m'; // Red
      default: return '\x1b[0m';       // Reset
    }
  }

  // Clean up resources when done
  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}
