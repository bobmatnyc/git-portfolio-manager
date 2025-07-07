/**
 * Configuration Loader
 *
 * Loads and validates configuration from YAML files, JS files, or environment variables
 * Enhanced with comprehensive error handling and graceful degradation
 */

const fs = require("fs-extra");
const path = require("node:path");
const yaml = require("js-yaml");
const Joi = require("joi");
const { ErrorHandler, ConfigurationError, FileSystemError } = require("../utils/error-handler");
const { createProjectLogger } = require("../utils/logger");

// Configuration schema for validation
const configSchema = Joi.object({
  // Server settings
  server: Joi.object({
    port: Joi.number().integer().min(1).max(65535).default(8080),
    host: Joi.string().default("localhost"),
    autoOpen: Joi.boolean().default(true),
  }).default(),

  // Directory tracking
  directories: Joi.object({
    // Current directory and subdirectories
    scanCurrent: Joi.boolean().default(true),
    scanDepth: Joi.number().integer().min(0).max(10).default(1),

    // Additional directories to track (absolute paths)
    include: Joi.array().items(Joi.string()).default([]),

    // Directories to exclude (patterns)
    exclude: Joi.array()
      .items(Joi.string())
      .default([
        "node_modules",
        "dist",
        ".git",
        "temp",
        "backup",
        "archive",
        ".next",
        ".nuxt",
        "build",
        "out",
        "coverage",
        ".coverage",
      ]),
  }).default(),

  // Monitoring settings
  monitoring: Joi.object({
    updateInterval: Joi.number().integer().min(5000).default(30000), // 30 seconds
    enableGitAnalysis: Joi.boolean().default(true),
    enableTrackDown: Joi.boolean().default(true),
    enableGitHubIssues: Joi.boolean().default(false),
    enableHealthChecks: Joi.boolean().default(true),
    staleThreshold: Joi.number().integer().min(1).default(14), // days
    maxConcurrentScans: Joi.number().integer().min(1).max(20).default(5),
  }).default(),

  // Dashboard customization
  dashboard: Joi.object({
    theme: Joi.string().valid("light", "dark", "auto").default("light"),
    title: Joi.string().default("Portfolio Monitor"),
    autoRefresh: Joi.boolean().default(true),
    showCharts: Joi.boolean().default(true),
    showTables: Joi.boolean().default(true),
    compactMode: Joi.boolean().default(false),
  }).default(),

  // Business intelligence
  business: Joi.object({
    priorityMapping: Joi.object({
      revenue: Joi.string().valid("HIGH", "MEDIUM", "LOW").default("HIGH"),
      strategic: Joi.string().valid("HIGH", "MEDIUM", "LOW").default("MEDIUM"),
      infrastructure: Joi.string().valid("HIGH", "MEDIUM", "LOW").default("LOW"),
    }).default(),

    alertThresholds: Joi.object({
      staleDays: Joi.number().integer().min(1).default(14),
      criticalIssues: Joi.number().integer().min(1).default(3),
      uncommittedFiles: Joi.number().integer().min(1).default(10),
    }).default(),
  }).default(),

  // Git settings
  git: Joi.object({
    defaultBranch: Joi.string().default("main"),
    remoteTimeout: Joi.number().integer().min(1000).default(10000),
    enableRemoteCheck: Joi.boolean().default(true),
    analyzeCommitHistory: Joi.boolean().default(true),
    maxCommitHistory: Joi.number().integer().min(10).default(100),
  }).default(),

  // Data storage
  data: Joi.object({
    directory: Joi.string().default("data"),
    retentionDays: Joi.number().integer().min(1).default(30),
    compressionEnabled: Joi.boolean().default(true),
  }).default(),

  // GitHub integration
  github: Joi.object({
    token: Joi.string().optional().description("GitHub personal access token"),
    baseUrl: Joi.string()
      .uri()
      .default("https://api.github.com")
      .description("GitHub API base URL"),
    userAgent: Joi.string().default("portfolio-monitor").description("User agent for API requests"),
    timeout: Joi.number()
      .integer()
      .min(1000)
      .default(10000)
      .description("API request timeout in ms"),
    rateLimit: Joi.object({
      requests: Joi.number().integer().min(1).default(60).description("Requests per hour"),
      retryAfter: Joi.number().integer().min(1000).default(60000).description("Retry delay in ms"),
    }).default(),
    issuesOptions: Joi.object({
      state: Joi.string().valid("open", "closed", "all").default("open"),
      labels: Joi.array().items(Joi.string()).default([]),
      assignee: Joi.string().optional(),
      creator: Joi.string().optional(),
      mentioned: Joi.string().optional(),
      milestone: Joi.string().optional(),
      since: Joi.date().optional(),
      sort: Joi.string().valid("created", "updated", "comments").default("updated"),
      direction: Joi.string().valid("asc", "desc").default("desc"),
      perPage: Joi.number().integer().min(1).max(100).default(30),
    }).default(),
  }).default(),

  // Logging
  logging: Joi.object({
    level: Joi.string().valid("error", "warn", "info", "debug").default("info"),
    file: Joi.string().optional(),
    console: Joi.boolean().default(true),
  }).default(),
});

class ConfigLoader {
  constructor(options = {}) {
    this.workingDir = options.workingDir || process.cwd();
    this.configCache = null;
    this.logger = createProjectLogger('ConfigLoader', options.logger);
    this.errorHandler = new ErrorHandler(this.logger);
    
    // Validate working directory
    try {
      this.errorHandler.validateInput(this.workingDir, {
        required: true,
        type: 'string',
        minLength: 1
      }, 'workingDir');
      
      if (!path.isAbsolute(this.workingDir)) {
        this.workingDir = path.resolve(this.workingDir);
      }
    } catch (error) {
      throw new ConfigurationError(
        `Invalid working directory: ${error.message}`,
        'workingDir',
        this.workingDir
      );
    }
  }

  /**
   * Load configuration from various sources
   */
  async loadConfig(configPath = null) {
    return this.errorHandler.safeExecute(async () => {
      if (this.configCache) {
        await this.logger.debug('Using cached configuration');
        return this.configCache;
      }

      await this.logger.info('Loading configuration', { 
        workingDir: this.workingDir,
        configPath 
      });

      let config = {};

      // 1. Load default configuration
      config = this.getDefaultConfig();
      await this.logger.debug('Default configuration loaded');

      // 2. Load from config file if specified or found
      const fileConfig = await this.loadConfigFile(configPath);
      if (fileConfig) {
        config = this.mergeConfigs(config, fileConfig);
        await this.logger.info('File configuration merged');
      } else {
        await this.logger.debug('No configuration file found, using defaults');
      }

      // 3. Override with environment variables
      const envConfig = this.loadEnvironmentConfig();
      if (Object.keys(envConfig).length > 0) {
        config = this.mergeConfigs(config, envConfig);
        await this.logger.info('Environment configuration merged', {
          envKeys: Object.keys(envConfig)
        });
      }

      // 4. Validate configuration
      const { error, value } = configSchema.validate(config, {
        allowUnknown: false,
        stripUnknown: true,
      });

      if (error) {
        throw new ConfigurationError(
          `Configuration validation error: ${error.message}`,
          'validation',
          error.details
        );
      }

      // 5. Post-process configuration
      this.configCache = await this.postProcessConfig(value);
      
      await this.logger.info('Configuration loaded successfully', {
        serverPort: this.configCache.server.port,
        dataDir: this.configCache.data.directory,
        includeDirs: this.configCache.directories.include?.length || 0
      });

      return this.configCache;
    }, {
      operation: 'load_configuration',
      logContext: { workingDir: this.workingDir, configPath },
      maxRetries: 1,
      fallback: async () => {
        await this.logger.warn('Using minimal fallback configuration due to errors');
        return this.getMinimalConfig();
      }
    });
  }

  /**
   * Load configuration from file (YAML or JS)
   */
  async loadConfigFile(configPath) {
    const possiblePaths = configPath
      ? [configPath]
      : [
          path.join(this.workingDir, "portfolio-monitor.yml"),
          path.join(this.workingDir, "portfolio-monitor.yaml"),
          path.join(this.workingDir, "portfolio-monitor.config.js"),
          path.join(this.workingDir, ".portfolio-monitor.yml"),
          path.join(this.workingDir, ".portfolio-monitor.yaml"),
        ];

    for (const filePath of possiblePaths) {
      try {
        if (await this.errorHandler.safeFileOperation(
          () => fs.pathExists(filePath),
          filePath,
          'check_exists'
        )) {
          await this.logger.debug('Found configuration file', { filePath });
          return await this.parseConfigFile(filePath);
        }
      } catch (error) {
        await this.logger.warn('Error checking configuration file', {
          filePath,
          error: error.message
        });
        continue;
      }
    }

    await this.logger.debug('No configuration file found in possible paths', {
      searchedPaths: possiblePaths
    });
    return null;
  }

  /**
   * Parse individual config file
   */
  async parseConfigFile(filePath) {
    return this.errorHandler.safeFileOperation(async () => {
      const ext = path.extname(filePath).toLowerCase();
      
      await this.logger.debug('Reading configuration file', { filePath, extension: ext });
      
      // Validate file extension
      const supportedExtensions = ['.yml', '.yaml', '.js'];
      if (!supportedExtensions.includes(ext)) {
        throw new ConfigurationError(
          `Unsupported config file format: ${ext}. Supported formats: ${supportedExtensions.join(', ')}`,
          'file_extension',
          ext
        );
      }

      const content = await fs.readFile(filePath, "utf8");
      
      if (!content || content.trim().length === 0) {
        throw new ConfigurationError(
          `Configuration file is empty: ${filePath}`,
          'empty_file',
          filePath
        );
      }

      try {
        let parsedConfig;
        
        if (ext === ".yml" || ext === ".yaml") {
          parsedConfig = yaml.load(content, {
            filename: filePath,
            onWarning: (warning) => {
              this.logger.warn('YAML parsing warning', {
                filePath,
                warning: warning.message
              });
            }
          });
        } else if (ext === ".js") {
          // Clear require cache to allow hot reloading
          const resolvedPath = require.resolve(filePath);
          delete require.cache[resolvedPath];
          parsedConfig = require(filePath);
        }

        if (!parsedConfig || typeof parsedConfig !== 'object') {
          throw new ConfigurationError(
            `Invalid configuration structure in ${filePath}. Expected an object.`,
            'invalid_structure',
            typeof parsedConfig
          );
        }

        await this.logger.info('Configuration file parsed successfully', {
          filePath,
          topLevelKeys: Object.keys(parsedConfig)
        });

        return parsedConfig;
      } catch (parseError) {
        if (parseError instanceof ConfigurationError) {
          throw parseError;
        }
        
        throw new ConfigurationError(
          `Failed to parse config file ${filePath}: ${parseError.message}`,
          'parse_error',
          { filePath, parseError: parseError.message }
        );
      }
    }, filePath, 'parse');
  }

  /**
   * Load configuration from environment variables
   */
  loadEnvironmentConfig() {
    const config = {};

    // Server settings
    if (process.env.PORTFOLIO_MONITOR_PORT) {
      config.server = { port: Number.parseInt(process.env.PORTFOLIO_MONITOR_PORT) };
    }
    if (process.env.PORTFOLIO_MONITOR_HOST) {
      config.server = { ...config.server, host: process.env.PORTFOLIO_MONITOR_HOST };
    }

    // Include additional directories
    if (process.env.PORTFOLIO_MONITOR_INCLUDE_DIRS) {
      const dirs = process.env.PORTFOLIO_MONITOR_INCLUDE_DIRS.split(",").map((d) => d.trim());
      config.directories = { include: dirs };
    }

    // Exclude directories
    if (process.env.PORTFOLIO_MONITOR_EXCLUDE_DIRS) {
      const dirs = process.env.PORTFOLIO_MONITOR_EXCLUDE_DIRS.split(",").map((d) => d.trim());
      config.directories = { ...config.directories, exclude: dirs };
    }

    // Monitoring interval
    if (process.env.PORTFOLIO_MONITOR_INTERVAL) {
      config.monitoring = {
        updateInterval: Number.parseInt(process.env.PORTFOLIO_MONITOR_INTERVAL),
      };
    }

    // Logging level
    if (process.env.PORTFOLIO_MONITOR_LOG_LEVEL) {
      config.logging = { level: process.env.PORTFOLIO_MONITOR_LOG_LEVEL };
    }

    // GitHub settings
    if (process.env.GITHUB_TOKEN) {
      config.github = { token: process.env.GITHUB_TOKEN };
    }
    if (process.env.PORTFOLIO_MONITOR_GITHUB_ENABLE) {
      config.monitoring = {
        ...config.monitoring,
        enableGitHubIssues: process.env.PORTFOLIO_MONITOR_GITHUB_ENABLE === "true",
      };
    }

    return config;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      server: {
        port: 8080,
        host: "localhost",
        autoOpen: true,
      },
      directories: {
        scanCurrent: true,
        scanDepth: 1,
        include: [],
        exclude: ["node_modules", "dist", ".git", "temp", "backup"],
      },
      monitoring: {
        updateInterval: 30000,
        enableGitAnalysis: true,
        enableTrackDown: true,
        enableGitHubIssues: false,
        enableHealthChecks: true,
        staleThreshold: 14,
        maxConcurrentScans: 5,
      },
      dashboard: {
        theme: "light",
        title: "Portfolio Monitor",
        autoRefresh: true,
        showCharts: true,
        showTables: true,
      },
    };
  }

  /**
   * Deep merge configuration objects
   */
  mergeConfigs(base, override) {
    const result = { ...base };

    for (const key in override) {
      if (override[key] && typeof override[key] === "object" && !Array.isArray(override[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }

    return result;
  }

  /**
   * Post-process configuration (resolve paths, etc.)
   */
  async postProcessConfig(config) {
    return this.errorHandler.safeExecute(async () => {
      await this.logger.debug('Post-processing configuration');

      // Resolve relative paths to absolute paths
      if (config.directories?.include && Array.isArray(config.directories.include)) {
        const resolvedPaths = [];
        
        for (const dir of config.directories.include) {
          try {
            const resolvedPath = path.isAbsolute(dir) ? dir : path.resolve(this.workingDir, dir);
            
            // Validate that directory exists or can be created
            try {
              await fs.ensureDir(path.dirname(resolvedPath));
              resolvedPaths.push(resolvedPath);
              await this.logger.debug('Resolved include directory', { 
                original: dir, 
                resolved: resolvedPath 
              });
            } catch (dirError) {
              await this.logger.warn('Cannot ensure include directory, skipping', {
                directory: resolvedPath,
                error: dirError.message
              });
            }
          } catch (pathError) {
            await this.logger.warn('Invalid include directory path, skipping', {
              directory: dir,
              error: pathError.message
            });
          }
        }
        
        config.directories.include = resolvedPaths;
      }

      // Resolve data directory
      if (config.data?.directory) {
        try {
          if (!path.isAbsolute(config.data.directory)) {
            config.data.directory = path.resolve(this.workingDir, config.data.directory);
          }
          
          // Ensure data directory can be created
          await fs.ensureDir(config.data.directory);
          await this.logger.debug('Data directory resolved and ensured', {
            dataDirectory: config.data.directory
          });
        } catch (error) {
          await this.logger.error('Failed to ensure data directory', {
            directory: config.data.directory,
            error: error.message
          });
          
          // Fallback to default data directory
          config.data.directory = path.resolve(this.workingDir, 'data');
          await fs.ensureDir(config.data.directory);
          
          await this.logger.warn('Using fallback data directory', {
            fallbackDirectory: config.data.directory
          });
        }
      }

      // Validate server configuration
      if (config.server?.port) {
        this.errorHandler.validateInput(config.server.port, {
          type: 'number',
          min: 1,
          max: 65535
        }, 'server.port');
      }

      await this.logger.info('Configuration post-processing completed');
      return config;
    }, {
      operation: 'postprocess_configuration',
      logContext: { workingDir: this.workingDir }
    });
  }

  /**
   * Create example configuration file
   */
  async createExampleConfig(outputPath = null) {
    const examplePath = outputPath || path.join(this.workingDir, "portfolio-monitor.yml");

    const exampleConfig = `# Portfolio Monitor Configuration
# Complete configuration reference for portfolio monitoring

# Server settings
server:
  port: 8080              # Dashboard port (auto-detected if in use)
  host: localhost         # Dashboard host
  autoOpen: true         # Auto-open browser when starting

# Directory tracking configuration
directories:
  # Scan current directory and subdirectories
  scanCurrent: true
  scanDepth: 1           # How deep to scan (0 = current only, 1 = one level down)
  
  # Additional directories to track (absolute paths)
  include:
    - /Users/dev/other-projects
    - /workspace/legacy-apps
    # - C:\\Projects\\Windows  # Windows example
  
  # Directories to exclude (patterns)
  exclude:
    - node_modules
    - dist
    - .git
    - temp
    - backup
    - .next
    - build
    - coverage

# Monitoring settings  
monitoring:
  updateInterval: 30000      # Update interval in milliseconds (30 seconds)
  enableGitAnalysis: true    # Analyze Git repositories
  enableTrackDown: true      # Look for TrackDown files
  enableGitHubIssues: false  # Use GitHub Issues instead of TrackDown
  enableHealthChecks: true   # Perform health assessments
  staleThreshold: 14         # Days before branch is considered stale
  maxConcurrentScans: 5      # Maximum parallel project scans

# Dashboard customization
dashboard:
  theme: light            # light, dark, or auto
  title: "Portfolio Monitor"
  autoRefresh: true       # Auto-refresh dashboard data
  showCharts: true        # Display activity charts
  showTables: true        # Display data tables
  compactMode: false      # Use compact layout

# Business intelligence
business:
  priorityMapping:
    revenue: HIGH         # Revenue-generating projects
    strategic: MEDIUM     # Strategic/investment projects  
    infrastructure: LOW   # Infrastructure/support projects
  
  alertThresholds:
    staleDays: 14         # Alert when branches are stale
    criticalIssues: 3     # Alert when critical issues exceed this
    uncommittedFiles: 10  # Alert when uncommitted files exceed this

# Git analysis settings
git:
  defaultBranch: main     # Default branch name (main/master)
  remoteTimeout: 10000    # Remote operation timeout (ms)
  enableRemoteCheck: true # Check remote branch status
  analyzeCommitHistory: true
  maxCommitHistory: 100   # Maximum commits to analyze

# Data storage
data:
  directory: data         # Data storage directory
  retentionDays: 30       # Keep data for X days
  compressionEnabled: true

# GitHub Issues Integration
github:
  # GitHub personal access token (required for private repos)
  # token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  
  # GitHub API settings
  baseUrl: https://api.github.com  # GitHub API base URL
  userAgent: portfolio-monitor     # User agent for requests
  timeout: 10000                   # Request timeout in milliseconds
  
  # Rate limiting
  rateLimit:
    requests: 60          # Requests per hour (GitHub default: 60 for unauthenticated)
    retryAfter: 60000     # Retry delay in milliseconds
  
  # Issue fetching options
  issuesOptions:
    state: open           # open, closed, or all
    labels: []            # Filter by labels (e.g., ['bug', 'feature'])
    # assignee: username  # Filter by assignee
    # creator: username   # Filter by creator
    # milestone: name     # Filter by milestone
    sort: updated         # created, updated, or comments
    direction: desc       # asc or desc
    perPage: 30          # Issues per page (1-100)

# Logging
logging:
  level: info             # error, warn, info, debug
  console: true           # Log to console
  # file: portfolio-monitor.log  # Optional log file
`;

    await fs.writeFile(examplePath, exampleConfig);
    return examplePath;
  }

  /**
   * Get minimal fallback configuration for critical errors
   */
  getMinimalConfig() {
    return {
      server: {
        port: 8080,
        host: "localhost",
        autoOpen: false,
      },
      directories: {
        scanCurrent: true,
        scanDepth: 1,
        include: [],
        exclude: ["node_modules", "dist", ".git"],
      },
      monitoring: {
        updateInterval: 60000, // Longer interval for fallback
        enableGitAnalysis: true,
        enableTrackDown: true,
        enableGitHubIssues: false,
        enableHealthChecks: false,
        staleThreshold: 14,
        maxConcurrentScans: 2, // Reduced for safety
      },
      dashboard: {
        theme: "light",
        title: "Portfolio Monitor (Minimal Mode)",
        autoRefresh: false,
        showCharts: false,
        showTables: true,
      },
      data: {
        directory: path.resolve(this.workingDir, 'data'),
        retentionDays: 7, // Shorter retention for minimal mode
        compressionEnabled: false,
      },
      logging: {
        level: "info",
        console: true,
      },
    };
  }

  /**
   * Clear configuration cache
   */
  clearCache() {
    this.configCache = null;
    this.logger.debug('Configuration cache cleared');
  }

  /**
   * Get configuration status and health
   */
  getConfigStatus() {
    return {
      hasCache: !!this.configCache,
      workingDir: this.workingDir,
      configSource: this.configCache ? 'loaded' : 'not_loaded',
      lastError: this.errorHandler?.lastErrors?.get('load_configuration') || null
    };
  }
}

module.exports = ConfigLoader;
