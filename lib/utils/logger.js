/**
 * Comprehensive Logging Utility
 * 
 * Provides structured logging with configurable levels, formatting,
 * and output destinations for enhanced error handling and debugging.
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class Logger {
  constructor(options = {}) {
    this.options = {
      level: options.level || process.env.LOG_LEVEL || 'info',
      enableConsole: options.enableConsole !== false,
      enableFile: options.enableFile || false,
      logFile: options.logFile || null,
      component: options.component || 'APP',
      maxLogFiles: options.maxLogFiles || 5,
      maxLogSize: options.maxLogSize || 10 * 1024 * 1024, // 10MB
      ...options
    };

    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };

    this.colors = {
      error: chalk.red,
      warn: chalk.yellow,
      info: chalk.blue,
      debug: chalk.gray,
      trace: chalk.dim
    };

    this.icons = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🔍',
      trace: '📍'
    };

    this.currentLevel = this.levels[this.options.level] || this.levels.info;

    // Initialize file logging if enabled
    if (this.options.enableFile && this.options.logFile) {
      this.initializeFileLogging();
    }
  }

  /**
   * Initialize file logging with rotation
   */
  async initializeFileLogging() {
    try {
      const logDir = path.dirname(this.options.logFile);
      await fs.ensureDir(logDir);

      // Check if log rotation is needed
      await this.rotateLogsIfNeeded();
    } catch (error) {
      console.error(`Failed to initialize file logging: ${error.message}`);
      this.options.enableFile = false;
    }
  }

  /**
   * Rotate logs if file size exceeds limit
   */
  async rotateLogsIfNeeded() {
    try {
      if (!await fs.pathExists(this.options.logFile)) {
        return;
      }

      const stats = await fs.stat(this.options.logFile);
      if (stats.size > this.options.maxLogSize) {
        await this.rotateLogs();
      }
    } catch (error) {
      // Silently handle rotation errors to avoid breaking logging
    }
  }

  /**
   * Rotate log files
   */
  async rotateLogs() {
    try {
      const logFile = this.options.logFile;
      const logDir = path.dirname(logFile);
      const logName = path.basename(logFile, path.extname(logFile));
      const logExt = path.extname(logFile);

      // Move existing numbered logs up
      for (let i = this.options.maxLogFiles - 1; i > 0; i--) {
        const oldFile = path.join(logDir, `${logName}.${i}${logExt}`);
        const newFile = path.join(logDir, `${logName}.${i + 1}${logExt}`);
        
        if (await fs.pathExists(oldFile)) {
          await fs.move(oldFile, newFile, { overwrite: true });
        }
      }

      // Move current log to .1
      const firstRotated = path.join(logDir, `${logName}.1${logExt}`);
      await fs.move(logFile, firstRotated, { overwrite: true });

      // Clean up old logs beyond max count
      const oldestLog = path.join(logDir, `${logName}.${this.options.maxLogFiles + 1}${logExt}`);
      if (await fs.pathExists(oldestLog)) {
        await fs.remove(oldestLog);
      }
    } catch (error) {
      // Silently handle rotation errors
    }
  }

  /**
   * Check if message should be logged at given level
   */
  shouldLog(level) {
    const messageLevel = this.levels[level] || this.levels.info;
    return messageLevel <= this.currentLevel;
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const component = meta.component || this.options.component;
    const contextStr = meta.context ? ` [${meta.context}]` : '';
    
    const baseMessage = `${timestamp} [${level.toUpperCase()}] [${component}]${contextStr} ${message}`;
    
    if (meta.error && meta.error instanceof Error) {
      return `${baseMessage}\nError: ${meta.error.message}\nStack: ${meta.error.stack}`;
    }
    
    if (meta.data && typeof meta.data === 'object') {
      return `${baseMessage}\nData: ${JSON.stringify(meta.data, null, 2)}`;
    }
    
    return baseMessage;
  }

  /**
   * Write to console with colors and formatting
   */
  writeToConsole(level, message, meta = {}) {
    if (!this.options.enableConsole) return;

    const icon = this.icons[level] || '';
    const colorFn = this.colors[level] || ((text) => text);
    const component = meta.component || this.options.component;
    const contextStr = meta.context ? chalk.dim(` [${meta.context}]`) : '';
    
    const timestamp = chalk.dim(new Date().toISOString());
    const levelStr = colorFn(`[${level.toUpperCase()}]`);
    const componentStr = chalk.cyan(`[${component}]`);
    
    console.log(`${timestamp} ${icon} ${levelStr} ${componentStr}${contextStr} ${message}`);
    
    if (meta.error && meta.error instanceof Error) {
      console.log(chalk.red(`  Error: ${meta.error.message}`));
      if (level === 'error' || level === 'debug') {
        console.log(chalk.dim(`  Stack: ${meta.error.stack}`));
      }
    }
    
    if (meta.data && typeof meta.data === 'object') {
      console.log(chalk.dim(`  Data: ${JSON.stringify(meta.data, null, 2)}`));
    }
  }

  /**
   * Write to file
   */
  async writeToFile(level, message, meta = {}) {
    if (!this.options.enableFile || !this.options.logFile) return;

    try {
      await this.rotateLogsIfNeeded();
      const formattedMessage = this.formatMessage(level, message, meta);
      await fs.appendFile(this.options.logFile, formattedMessage + '\n');
    } catch (error) {
      // Fallback to console if file writing fails
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  /**
   * Log at specific level
   */
  async log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    this.writeToConsole(level, message, meta);
    await this.writeToFile(level, message, meta);
  }

  /**
   * Error level logging
   */
  async error(message, meta = {}) {
    await this.log('error', message, meta);
  }

  /**
   * Warning level logging
   */
  async warn(message, meta = {}) {
    await this.log('warn', message, meta);
  }

  /**
   * Info level logging
   */
  async info(message, meta = {}) {
    await this.log('info', message, meta);
  }

  /**
   * Debug level logging
   */
  async debug(message, meta = {}) {
    await this.log('debug', message, meta);
  }

  /**
   * Trace level logging
   */
  async trace(message, meta = {}) {
    await this.log('trace', message, meta);
  }

  /**
   * Log an operation with timing
   */
  async logOperation(operationName, operation, level = 'info', meta = {}) {
    const startTime = Date.now();
    await this.log(level, `Starting ${operationName}`, { ...meta, operation: operationName });

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      await this.log(level, `Completed ${operationName} in ${duration}ms`, { 
        ...meta, 
        operation: operationName,
        duration,
        success: true
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.error(`Failed ${operationName} after ${duration}ms`, {
        ...meta,
        operation: operationName,
        duration,
        error,
        success: false
      });
      throw error;
    }
  }

  /**
   * Create child logger with additional context
   */
  child(context, options = {}) {
    return new Logger({
      ...this.options,
      ...options,
      component: `${this.options.component}:${context}`
    });
  }

  /**
   * Set log level dynamically
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.options.level = level;
      this.currentLevel = this.levels[level];
    }
  }

  /**
   * Get current log level
   */
  getLevel() {
    return this.options.level;
  }

  /**
   * Enable/disable console logging
   */
  setConsoleEnabled(enabled) {
    this.options.enableConsole = enabled;
  }

  /**
   * Enable/disable file logging
   */
  async setFileEnabled(enabled, logFile = null) {
    this.options.enableFile = enabled;
    if (enabled && logFile) {
      this.options.logFile = logFile;
      await this.initializeFileLogging();
    }
  }
}

/**
 * Create default logger instance
 */
function createLogger(options = {}) {
  return new Logger(options);
}

/**
 * Create logger with common project defaults
 */
function createProjectLogger(component, options = {}) {
  const projectDefaults = {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: true,
    enableFile: true,
    logFile: path.join(process.cwd(), 'logs', `${component.toLowerCase()}.log`),
    component: component.toUpperCase(),
    ...options
  };

  return new Logger(projectDefaults);
}

module.exports = {
  Logger,
  createLogger,
  createProjectLogger
};