/**
 * Comprehensive Error Handling Utility
 * 
 * Provides structured error handling, validation, and graceful degradation
 * for improved reliability and debugging capabilities.
 */

const { createLogger } = require('./logger');

class ApplicationError extends Error {
  constructor(message, code = 'GENERIC_ERROR', statusCode = 500, details = {}) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, ApplicationError);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

class ValidationError extends ApplicationError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', 400, { field, value });
    this.name = 'ValidationError';
  }
}

class FileSystemError extends ApplicationError {
  constructor(message, path = null, operation = null) {
    super(message, 'FILESYSTEM_ERROR', 500, { path, operation });
    this.name = 'FileSystemError';
  }
}

class GitError extends ApplicationError {
  constructor(message, command = null, cwd = null) {
    super(message, 'GIT_ERROR', 500, { command, cwd });
    this.name = 'GitError';
  }
}

class NetworkError extends ApplicationError {
  constructor(message, url = null, method = null) {
    super(message, 'NETWORK_ERROR', 500, { url, method });
    this.name = 'NetworkError';
  }
}

class ConfigurationError extends ApplicationError {
  constructor(message, configKey = null, configValue = null) {
    super(message, 'CONFIGURATION_ERROR', 500, { configKey, configValue });
    this.name = 'ConfigurationError';
  }
}

class ErrorHandler {
  constructor(logger = null) {
    this.logger = logger || createLogger({ component: 'ErrorHandler' });
    this.errorCounts = new Map();
    this.lastErrors = new Map();
    this.circuitBreakers = new Map();
  }

  /**
   * Wrap an async function with comprehensive error handling
   */
  async safeExecute(operation, context = {}) {
    const operationName = context.operation || 'unknown_operation';
    const maxRetries = context.maxRetries || 0;
    const retryDelay = context.retryDelay || 1000;
    const fallback = context.fallback || null;
    const circuitBreakerKey = context.circuitBreakerKey || operationName;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(circuitBreakerKey)) {
      const error = new ApplicationError(
        `Circuit breaker is open for operation: ${operationName}`,
        'CIRCUIT_BREAKER_OPEN',
        503,
        { operation: operationName, circuitBreakerKey }
      );
      
      if (fallback) {
        await this.logger.warn(`Circuit breaker open, using fallback for ${operationName}`, {
          context: context.logContext,
          operation: operationName
        });
        return await this.safeExecute(fallback, { ...context, operation: `${operationName}_fallback` });
      }
      
      throw error;
    }

    let lastError = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await operation();
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(circuitBreakerKey);
        
        if (attempt > 0) {
          await this.logger.info(`Operation succeeded after ${attempt} retries: ${operationName}`, {
            context: context.logContext,
            operation: operationName,
            attempt
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Record error for circuit breaker
        this.recordError(circuitBreakerKey);
        
        await this.logger.error(`Operation failed (attempt ${attempt}/${maxRetries + 1}): ${operationName}`, {
          context: context.logContext,
          operation: operationName,
          attempt,
          error,
          willRetry: attempt <= maxRetries
        });

        if (attempt <= maxRetries) {
          await this.delay(retryDelay * attempt); // Exponential backoff
        }
      }
    }

    // All retries exhausted
    const finalError = this.wrapError(lastError, operationName, context);
    
    // Try fallback if available
    if (fallback) {
      await this.logger.warn(`All retries exhausted for ${operationName}, using fallback`, {
        context: context.logContext,
        operation: operationName,
        finalError: finalError.message
      });
      
      try {
        return await this.safeExecute(fallback, { ...context, operation: `${operationName}_fallback` });
      } catch (fallbackError) {
        await this.logger.error(`Fallback also failed for ${operationName}`, {
          context: context.logContext,
          operation: operationName,
          originalError: finalError.message,
          fallbackError: fallbackError.message
        });
        throw finalError; // Return original error, not fallback error
      }
    }

    throw finalError;
  }

  /**
   * Wrap operation with file system error handling
   */
  async safeFileOperation(operation, filePath, operationType = 'unknown') {
    return this.safeExecute(
      operation,
      {
        operation: `file_${operationType}`,
        logContext: { filePath, operationType },
        circuitBreakerKey: `filesystem_${operationType}`,
        maxRetries: 2,
        retryDelay: 500
      }
    );
  }

  /**
   * Wrap operation with git command error handling
   */
  async safeGitOperation(operation, command, cwd = process.cwd()) {
    return this.safeExecute(
      operation,
      {
        operation: `git_${command.split(' ')[0]}`,
        logContext: { command, cwd },
        circuitBreakerKey: `git_${cwd}`,
        maxRetries: 1,
        retryDelay: 1000
      }
    );
  }

  /**
   * Wrap operation with network error handling
   */
  async safeNetworkOperation(operation, url, method = 'GET') {
    return this.safeExecute(
      operation,
      {
        operation: `network_${method.toLowerCase()}`,
        logContext: { url, method },
        circuitBreakerKey: `network_${new URL(url).hostname}`,
        maxRetries: 3,
        retryDelay: 2000
      }
    );
  }

  /**
   * Validate input with detailed error messages
   */
  validateInput(value, rules, fieldName = 'input') {
    const errors = [];

    if (rules.required && (value === null || value === undefined || value === '')) {
      errors.push(`${fieldName} is required`);
    }

    if (value !== null && value !== undefined && value !== '') {
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(`${fieldName} must be of type ${rules.type}, got ${actualType}`);
        }
      }

      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        errors.push(`${fieldName} must be at least ${rules.minLength} characters long`);
      }

      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push(`${fieldName} must be no more than ${rules.maxLength} characters long`);
      }

      if (rules.min && typeof value === 'number' && value < rules.min) {
        errors.push(`${fieldName} must be at least ${rules.min}`);
      }

      if (rules.max && typeof value === 'number' && value > rules.max) {
        errors.push(`${fieldName} must be no more than ${rules.max}`);
      }

      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push(`${fieldName} format is invalid`);
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
      }

      if (rules.custom && typeof rules.custom === 'function') {
        const customResult = rules.custom(value);
        if (customResult !== true) {
          errors.push(customResult || `${fieldName} failed custom validation`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(`Validation failed for ${fieldName}: ${errors.join(', ')}`, fieldName, value);
    }

    return true;
  }

  /**
   * Check if required dependencies are available
   */
  async checkDependencies(dependencies = []) {
    const missing = [];
    const available = [];

    for (const dep of dependencies) {
      try {
        if (dep.type === 'module') {
          require.resolve(dep.name);
          available.push(dep.name);
        } else if (dep.type === 'command') {
          const { execSync } = require('child_process');
          execSync(`command -v ${dep.name}`, { stdio: 'ignore' });
          available.push(dep.name);
        } else if (dep.type === 'file') {
          const fs = require('fs-extra');
          if (await fs.pathExists(dep.path)) {
            available.push(dep.name);
          } else {
            missing.push(dep);
          }
        }
      } catch (error) {
        missing.push(dep);
      }
    }

    await this.logger.debug('Dependency check completed', {
      available,
      missing: missing.map(d => d.name),
      total: dependencies.length
    });

    return {
      allAvailable: missing.length === 0,
      available,
      missing,
      partial: available.length > 0 && missing.length > 0
    };
  }

  /**
   * Create graceful degradation handler
   */
  createGracefulHandler(primaryOperation, fallbackOperation = null, options = {}) {
    const degradationStrategy = options.strategy || 'fallback'; // 'fallback', 'cache', 'mock'
    const cacheKey = options.cacheKey || null;
    const mockData = options.mockData || null;

    return async (...args) => {
      try {
        const result = await primaryOperation(...args);
        
        // Cache successful result if caching is enabled
        if (cacheKey && degradationStrategy === 'cache') {
          this.setCache(cacheKey, result);
        }
        
        return result;
      } catch (error) {
        await this.logger.warn('Primary operation failed, attempting graceful degradation', {
          error: error.message,
          strategy: degradationStrategy,
          hasFallback: !!fallbackOperation,
          cacheKey
        });

        switch (degradationStrategy) {
          case 'fallback':
            if (fallbackOperation) {
              return await fallbackOperation(...args);
            }
            break;

          case 'cache':
            if (cacheKey) {
              const cached = this.getCache(cacheKey);
              if (cached) {
                await this.logger.info('Using cached data for graceful degradation', { cacheKey });
                return cached;
              }
            }
            break;

          case 'mock':
            if (mockData) {
              await this.logger.info('Using mock data for graceful degradation');
              return typeof mockData === 'function' ? mockData(...args) : mockData;
            }
            break;
        }

        // No degradation strategy worked, re-throw error
        throw error;
      }
    };
  }

  /**
   * Wrap error with additional context
   */
  wrapError(error, operation, context = {}) {
    if (error instanceof ApplicationError) {
      return error;
    }

    const message = `Operation '${operation}' failed: ${error.message}`;
    
    if (error.code === 'ENOENT' || error.code === 'EACCES') {
      return new FileSystemError(message, context.filePath, operation);
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new NetworkError(message, context.url, context.method);
    }
    
    if (error.message && error.message.includes('git')) {
      return new GitError(message, context.command, context.cwd);
    }

    return new ApplicationError(message, 'WRAPPED_ERROR', 500, {
      originalError: error.message,
      originalCode: error.code,
      operation,
      ...context
    });
  }

  /**
   * Circuit breaker functionality
   */
  recordError(key) {
    const current = this.errorCounts.get(key) || { count: 0, lastReset: Date.now() };
    current.count++;
    this.errorCounts.set(key, current);
    this.lastErrors.set(key, Date.now());
  }

  isCircuitBreakerOpen(key, threshold = 5, timeWindow = 60000) {
    const errorData = this.errorCounts.get(key);
    if (!errorData) return false;

    // Reset count if time window has passed
    if (Date.now() - errorData.lastReset > timeWindow) {
      errorData.count = 0;
      errorData.lastReset = Date.now();
      this.errorCounts.set(key, errorData);
      return false;
    }

    return errorData.count >= threshold;
  }

  resetCircuitBreaker(key) {
    this.errorCounts.delete(key);
    this.lastErrors.delete(key);
  }

  /**
   * Simple cache for degradation strategies
   */
  setCache(key, value, ttl = 300000) { // 5 minutes default TTL
    if (!this.cache) this.cache = new Map();
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  getCache(key) {
    if (!this.cache) return null;
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create child error handler with additional context
   */
  child(context) {
    const childLogger = this.logger.child(context.component || 'child');
    const childHandler = new ErrorHandler(childLogger);
    childHandler.errorCounts = this.errorCounts;
    childHandler.lastErrors = this.lastErrors;
    childHandler.circuitBreakers = this.circuitBreakers;
    childHandler.cache = this.cache;
    return childHandler;
  }
}

module.exports = {
  ErrorHandler,
  ApplicationError,
  ValidationError,
  FileSystemError,
  GitError,
  NetworkError,
  ConfigurationError
};