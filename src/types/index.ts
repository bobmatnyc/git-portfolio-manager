/**
 * Core Type Definitions for Git Portfolio Manager
 */

export type ProjectType = 'nodejs' | 'python' | 'rust' | 'go' | 'web' | 'java' | 'php' | 'ruby' | 'cpp' | 'make' | 'general';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type HealthStatus = 'healthy' | 'attention' | 'critical' | 'unknown';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type Theme = 'light' | 'dark' | 'auto';

// Project-related types
export interface GitCommit {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

export interface ProjectConfig {
  name: string;
  path: string;
  relativePath?: string;
  type: ProjectType;
  hasTrackDown: boolean;
  hasGitHubRemote: boolean;
  remoteUrl?: string | undefined;
  lastCommit?: GitCommit | undefined;
  branches: string[];
  packageManager?: string | undefined;
  selected: boolean;
}

// Configuration interfaces
export interface ServerConfig {
  port: number;
  host: string;
  autoOpen: boolean;
}

export interface DirectoriesConfig {
  scanCurrent: boolean;
  scanDepth: number;
  include: string[];
  exclude: string[];
}

export interface MonitoringConfig {
  updateInterval: number;
  enableGitAnalysis: boolean;
  enableTrackDown: boolean;
  enableGitHubIssues: boolean;
  enableHealthChecks: boolean;
  staleThreshold: number;
  maxConcurrentScans: number;
}

export interface DashboardConfig {
  theme: Theme;
  title: string;
  autoRefresh: boolean;
  showCharts: boolean;
  showTables: boolean;
  compactMode?: boolean;
}

export interface BusinessConfig {
  priorityMapping: {
    revenue: Priority;
    strategic: Priority;
    infrastructure: Priority;
  };
  alertThresholds: {
    staleDays: number;
    criticalIssues: number;
    uncommittedFiles: number;
  };
}

export interface GitConfig {
  defaultBranch: string;
  remoteTimeout: number;
  enableRemoteCheck: boolean;
  analyzeCommitHistory: boolean;
  maxCommitHistory: number;
}

export interface DataConfig {
  directory: string;
  retentionDays: number;
  compressionEnabled: boolean;
}

export interface GitHubConfig {
  token?: string;
  baseUrl: string;
  userAgent: string;
  timeout: number;
  rateLimit: {
    requests: number;
    retryAfter: number;
  };
  issuesOptions: {
    state: 'open' | 'closed' | 'all';
    labels: string[];
    assignee?: string;
    creator?: string;
    mentioned?: string;
    milestone?: string;
    since?: Date;
    sort: 'created' | 'updated' | 'comments';
    direction: 'asc' | 'desc';
    perPage: number;
  };
}

export interface LoggingConfig {
  level: LogLevel;
  file?: string;
  console: boolean;
}

// Main configuration interface
export interface PortfolioConfig {
  server: ServerConfig;
  directories: DirectoriesConfig;
  monitoring: MonitoringConfig;
  dashboard: DashboardConfig;
  business: BusinessConfig;
  git: GitConfig;
  data: DataConfig;
  github: GitHubConfig;
  logging: LoggingConfig;
}

// Discovery and interactive config interfaces
export interface DiscoveryOptions {
  workingDir?: string;
  maxDepth?: number;
  excludeDirs?: string[];
}

export interface InteractiveSetupResult {
  config: PortfolioConfig;
  selectedProjects: number;
  hasTrackDown: boolean;
  hasGitHub: boolean;
}

export interface IntegrationConfig {
  hasTrackDown: boolean;
  enableGitHub: boolean;
  githubToken?: string | undefined;
}

export interface BasicConfig {
  serverPort: number;
  autoOpen: boolean;
  updateInterval: number;
}

// Project monitoring interfaces
export interface ProjectMonitorOptions {
  project: string;
  path: string;
  priority: Priority;
  type: ProjectType;
  config: PortfolioConfig;
}

export interface MasterControllerOptions {
  workingDir: string;
  dataDir: string;
  config: PortfolioConfig;
}

export interface ProjectScanData {
  timestamp: string;
  project: string;
  path: string;
  priority: Priority;
  git?: GitAnalysisResult;
  trackdown?: TrackDownAnalysisResult;
  github?: GitHubAnalysisResult;
  fileSystem?: FileSystemAnalysisResult;
  health?: HealthAssessmentResult;
}

export interface GitAnalysisResult {
  currentBranch: string;
  branches: string[];
  commits: GitCommit[];
  remoteStatus: string;
  uncommittedFiles: number;
  hasUnpushedCommits: boolean;
}

export interface TrackDownAnalysisResult {
  hasTrackDown: boolean;
  files: string[];
  lastUpdated?: Date;
  projectCount?: number;
}

export interface GitHubAnalysisResult {
  repository?: string;
  issues: any[];
  pullRequests: any[];
  lastActivity?: Date;
}

export interface FileSystemAnalysisResult {
  totalFiles: number;
  projectType: ProjectType;
  hasTests: boolean;
  hasDocumentation: boolean;
  configFiles: string[];
}

export interface HealthAssessmentResult {
  status: HealthStatus;
  score: number;
  factors: {
    recentActivity: number;
    codeQuality: number;
    documentation: number;
    testing: number;
    maintenance: number;
  };
  issues: string[];
  recommendations: string[];
}

// Dashboard and server interfaces
export interface DashboardServerOptions {
  port: number;
  host: string;
  dashboardDir: string;
  dataDir: string;
  config: PortfolioConfig;
}

export interface ServerInfo {
  url: string;
  port: number;
  host: string;
}

// CLI and configuration interfaces
export interface CLIOptions {
  port?: number;
  host?: string;
  depth?: number;
  exclude?: string;
  interval?: number;
  config?: string;
  open?: boolean;
  dev?: boolean;
  dashboardOnly?: boolean;
}

export interface InitOptions {
  format: 'yaml' | 'js';
  output?: string;
  force: boolean;
  interactive: boolean;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ConfigValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

// Event types for monitoring system
export interface MonitoringEvent {
  type: 'health_update' | 'activity_report' | 'alert' | 'error';
  project: string;
  timestamp: string;
  data: any;
}

export interface AlertData {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: string;
  project: string;
}