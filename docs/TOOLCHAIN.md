# 🔧 Git Portfolio Manager - Comprehensive Toolchain Guide

**Purpose**: Complete toolchain mastery for the Git Portfolio Manager project - technical configurations, tools, frameworks, and standards.

**Updated**: 2025-07-04  
**Version**: 1.0

---

## 📋 Table of Contents

1. [Runtime Environment](#-runtime-environment)
2. [Package Management](#-package-management)
3. [Node.js Configuration](#-nodejs-configuration)
4. [Testing Framework](#-testing-framework)
5. [Code Quality Tools](#-code-quality-tools)
6. [CLI Framework](#-cli-framework)
7. [Web Server & Dashboard](#-web-server--dashboard)
8. [External Integrations](#-external-integrations)
9. [Development Tools](#-development-tools)
10. [Troubleshooting](#-troubleshooting)

---

## 🚀 Runtime Environment

### Node.js Requirements
```bash
# Required Node.js version
node --version  # Must be >= 14.0.0

# Recommended version for development
node --version  # 18.x LTS or 20.x LTS

# Verify npm version
npm --version   # Must be >= 6.0.0
```

### Environment Variables
```bash
# GitHub Integration (Optional)
export GITHUB_TOKEN=your_github_token_here
export GITHUB_OWNER=your_github_username
export GITHUB_PROJECT_NUMBER=1

# Development Configuration
export NODE_ENV=development
export PORT=8080
export LOG_LEVEL=debug
```

---

## 📦 Package Management

### NPM Configuration
```bash
# Verify npm configuration
npm config list

# Set registry (if needed)
npm config set registry https://registry.npmjs.org/

# Authentication for publishing
npm login
npm whoami
```

### Dependency Management
```bash
# Install all dependencies
npm install

# Add production dependency
npm install package-name

# Add development dependency
npm install --save-dev package-name

# Update dependencies
npm update
npm audit fix
```

### Key Dependencies
```json
{
  "dependencies": {
    "commander": "^11.1.0",     // CLI framework
    "chalk": "^4.1.2",          // Terminal styling
    "ora": "^5.4.1",            // Loading spinners
    "inquirer": "^8.2.6",       // Interactive prompts
    "fs-extra": "^11.1.1",      // Enhanced file operations
    "glob": "^10.3.10",         // File pattern matching
    "open": "^8.4.2",           // Open URLs/files
    "express": "^4.18.2",       // Web server
    "cors": "^2.8.5",           // CORS middleware
    "helmet": "^7.1.0",         // Security middleware
    "compression": "^1.7.4",    // Response compression
    "js-yaml": "^4.1.0",        // YAML parsing
    "joi": "^17.11.0",          // Schema validation
    "@octokit/rest": "^20.0.2", // GitHub API client
    "@octokit/auth-token": "^4.0.0" // GitHub authentication
  }
}
```

---

## ⚙️ Node.js Configuration

### CommonJS Module System
```javascript
// Use require() for imports
const express = require('express');
const fs = require('fs-extra');
const path = require('node:path');

// Use module.exports for exports
module.exports = {
  PortfolioMonitor,
  config: defaultConfig
};

// Class exports
class PortfolioMonitor {
  // Implementation
}
module.exports = PortfolioMonitor;
```

### Error Handling Patterns
```javascript
// Async/await with try-catch
async function scanProjects() {
  try {
    const projects = await this.discoverProjects();
    return projects;
  } catch (error) {
    console.error('Project scan failed:', error.message);
    throw error;
  }
}

// Promise handling
function startDashboard() {
  return new Promise((resolve, reject) => {
    this.server.listen(this.port, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve({ url: `http://localhost:${this.port}` });
      }
    });
  });
}
```

---

## 🧪 Testing Framework

### Vitest Configuration
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.js'],
      exclude: ['lib/**/static/**']
    }
  }
});
```

### Test Execution
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test patterns
npm test -- --grep "configuration"
npm test -- --grep "CLI"
```

### Test Structure
```javascript
// test/basic.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PortfolioMonitor } from '../lib/portfolio-monitor.js';

describe('PortfolioMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PortfolioMonitor({
      workingDir: '/tmp/test'
    });
  });

  afterEach(() => {
    // Cleanup
  });

  it('should initialize with default configuration', () => {
    expect(monitor.config).toBeDefined();
    expect(monitor.config.workingDir).toBe('/tmp/test');
  });
});
```

---

## 🔍 Code Quality Tools

### Biome Configuration
```json
// biome.json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "useNodejsImportProtocol": "error"
      },
      "complexity": {
        "noForEach": "error",
        "useOptionalChain": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingComma": "es5"
    }
  }
}
```

### Quality Commands
```bash
# Lint code
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Check formatting
biome format --check lib/ bin/

# Apply formatting
biome format --write lib/ bin/
```

---

## 🖥️ CLI Framework

### Commander.js Setup
```javascript
// bin/git-portfolio-manager.js
const { program } = require('commander');
const { version } = require('../package.json');

program
  .name('git-portfolio-manager')
  .description('Git portfolio management and monitoring dashboard')
  .version(version, '-v, --version', 'output the current version');

program
  .command('start')
  .description('Start portfolio monitoring dashboard')
  .option('-p, --port <number>', 'Dashboard port', parseInt, 8080)
  .option('-c, --config <file>', 'Configuration file path')
  .action(async (options) => {
    // Implementation
  });
```

### CLI Testing
```bash
# Test global installation
npm install -g ./

# Test commands
git-portfolio-manager --version
git-portfolio-manager --help
git-portfolio-manager init --format yaml
git-portfolio-manager start --dev

# Clean up
npm uninstall -g git-portfolio-manager
```

---

## 🌐 Web Server & Dashboard

### Express.js Configuration
```javascript
// lib/dashboard/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

class DashboardServer {
  constructor(options = {}) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.static(this.dashboardDir));
  }
}
```

### Dashboard Development
```bash
# Start dashboard in development mode
git-portfolio-manager start --dev --port 8081

# Access dashboard
open http://localhost:8081

# Monitor logs
tail -f logs/dashboard.log
```

---

## 🔗 External Integrations

### GitHub API Integration
```javascript
// lib/github/github-client.js
const { Octokit } = require('@octokit/rest');
const { createTokenAuth } = require('@octokit/auth-token');

class GitHubClient {
  constructor(token) {
    this.octokit = new Octokit({
      auth: token,
      userAgent: 'git-portfolio-manager/1.0.0'
    });
  }

  async getRepository(owner, repo) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo
      });
      return data;
    } catch (error) {
      console.error('GitHub API error:', error.message);
      throw error;
    }
  }
}
```

### Configuration Management
```javascript
// lib/config/config-loader.js
const yaml = require('js-yaml');
const Joi = require('joi');

const configSchema = Joi.object({
  server: Joi.object({
    port: Joi.number().integer().min(1024).max(65535).default(8080),
    host: Joi.string().default('localhost'),
    autoOpen: Joi.boolean().default(true)
  }).default(),
  directories: Joi.object({
    scanCurrent: Joi.boolean().default(true),
    scanDepth: Joi.number().integer().min(0).max(10).default(1),
    include: Joi.array().items(Joi.string()).default([]),
    exclude: Joi.array().items(Joi.string()).default([])
  }).default()
});
```

---

## 🛠️ Development Tools

### Package Scripts
```json
{
  "scripts": {
    "start": "node bin/git-portfolio-manager.js",
    "dev": "node bin/git-portfolio-manager.js --dev",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "biome check lib/ bin/ test/",
    "lint:fix": "biome check lib/ bin/ test/ --write",
    "build": "echo 'No build step required'",
    "release": "standard-version",
    "release:major": "standard-version --release-as major",
    "release:minor": "standard-version --release-as minor",
    "release:patch": "standard-version --release-as patch",
    "prepublishOnly": "npm run test && npm run lint"
  }
}
```

### Git Hooks (Optional)
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.js": [
      "biome check --write",
      "git add"
    ]
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check for port usage
lsof -ti:8080
netstat -tulpn | grep 8080

# Use auto-port detection
git-portfolio-manager start  # Will find available port
```

#### Permission Errors
```bash
# Check directory permissions
ls -la /path/to/projects

# Fix permissions (if needed)
chmod 755 /path/to/projects
```

#### GitHub API Issues
```bash
# Verify token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Check rate limits
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit
```

### Debug Mode
```bash
# Enable debug logging
export NODE_ENV=development
export LOG_LEVEL=debug

# Run with debugging
git-portfolio-manager start --dev

# Check logs
tail -f logs/debug.log
```

### Performance Issues
```bash
# Monitor memory usage
node --inspect bin/git-portfolio-manager.js start

# Profile performance
node --prof bin/git-portfolio-manager.js start
node --prof-process isolate-*.log
```

### Development Workflow Issues
```bash
# Clean installation
rm -rf node_modules package-lock.json
npm install

# Verify package integrity
npm ls
npm audit

# Test fresh installation
npm pack
npm install -g ./git-portfolio-manager-*.tgz
```

---

## 🎯 Best Practices

### Code Organization
- **Single Responsibility**: Each module has one clear purpose
- **Dependency Injection**: Pass dependencies as constructor parameters
- **Error Handling**: Comprehensive try-catch with meaningful messages
- **Logging**: Structured logging with appropriate levels

### Performance Optimization
- **Lazy Loading**: Load modules only when needed
- **Caching**: Cache expensive operations (Git commands, API calls)
- **Throttling**: Limit concurrent operations to avoid overwhelming system
- **Memory Management**: Clean up resources and event listeners

### Security Considerations
- **Input Validation**: Validate all user inputs and file paths
- **Path Traversal**: Prevent directory traversal attacks
- **Token Storage**: Secure handling of GitHub tokens
- **Dependency Security**: Regular security audits with `npm audit`

### Maintainability
- **Documentation**: Comprehensive JSDoc for public APIs
- **Testing**: High test coverage with both unit and integration tests
- **Versioning**: Semantic versioning with clear changelog
- **Backward Compatibility**: Maintain API compatibility across minor versions