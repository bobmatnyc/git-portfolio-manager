# Portfolio Monitor 📊

[![npm version](https://badge.fury.io/js/portfolio-monitor.svg)](https://badge.fury.io/js/portfolio-monitor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/matsuoka/portfolio-monitor/workflows/Node.js%20CI/badge.svg)](https://github.com/matsuoka/portfolio-monitor/actions)

> **Project portfolio monitoring dashboard with Git analytics, TrackDown integration, and business intelligence for development teams.**

Automatically discover, monitor, and analyze all your software projects from a single dashboard. Get instant visibility into Git activity, project health, open branches, pending tasks, and business metrics across your entire development portfolio.

![Portfolio Monitor Dashboard](https://raw.githubusercontent.com/matsuoka/portfolio-monitor/main/docs/images/dashboard-screenshot.png)

## 🚀 Quick Start

```bash
# Install globally for CLI usage
npm install -g portfolio-monitor

# Or install locally in your project
npm install --save-dev portfolio-monitor

# Run in any directory with projects
npx portfolio-monitor

# Dashboard opens automatically at http://localhost:8080
```

## ✨ Features

### 📈 **Comprehensive Project Analytics**
- **Git Repository Analysis**: Track commits, branches, merges, and stale branches
- **TrackDown Integration**: Monitor backlog, tasks, and sprint progress
- **Health Assessment**: Automated project health scoring and alerts
- **Business Intelligence**: Revenue impact analysis and priority tracking

### 🎯 **Smart Project Discovery**
- **Automatic Scanning**: Discovers Git repositories in current and subdirectories
- **Custom Directory Support**: Monitor projects outside current directory tree
- **Flexible Configuration**: YAML and JS config files with validation
- **Pattern Matching**: Include/exclude directories with glob patterns

### 📊 **Real-time Dashboard**
- **Interactive Charts**: Commit activity, lines of code, branch statistics
- **Project Cards**: Click to view detailed Git branches and open tickets
- **Health Overview**: Visual project health with color-coded indicators
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### ⚡ **Developer Experience**
- **Zero Configuration**: Works out of the box with sensible defaults
- **Hot Reloading**: Live updates as projects change
- **CLI Interface**: Comprehensive command-line tools
- **Multiple Formats**: Support for YAML and JavaScript configuration

## 📋 Requirements

- **Node.js**: 14.0.0 or higher
- **npm**: 6.0.0 or higher
- **Git**: For repository analysis (optional but recommended)

## 🛠 Installation

### Global Installation (Recommended)
```bash
npm install -g portfolio-monitor
portfolio-monitor --help
```

### Local Installation
```bash
npm install --save-dev portfolio-monitor
npx portfolio-monitor
```

### Development Installation
```bash
git clone https://github.com/matsuoka/portfolio-monitor.git
cd portfolio-monitor
npm install
npm run dev
```

## 📖 Usage

### Basic Usage
```bash
# Start monitoring current directory
portfolio-monitor

# Specify custom port and host
portfolio-monitor --port 3000 --host 0.0.0.0

# Use configuration file
portfolio-monitor --config my-config.yml

# Generate example configuration
portfolio-monitor init
```

### CLI Commands

#### `portfolio-monitor` (default)
Start portfolio monitoring with dashboard

**Options:**
- `-p, --port <number>` - Dashboard port (auto-detected if in use)
- `-h, --host <string>` - Dashboard host (default: localhost)
- `-d, --depth <number>` - Scan depth for projects (default: 1)
- `-e, --exclude <dirs>` - Comma-separated directories to exclude
- `-i, --interval <ms>` - Update interval in milliseconds (default: 30000)
- `-c, --config <file>` - Configuration file path (YAML or JS)
- `--no-open` - Don't auto-open browser
- `--dev` - Development mode with verbose logging

**Examples:**
```bash
# Basic monitoring
portfolio-monitor

# Custom configuration
portfolio-monitor --port 8080 --depth 2 --exclude node_modules,dist,temp

# Using config file
portfolio-monitor --config portfolio-monitor.yml
```

#### `portfolio-monitor init`
Create configuration file

**Options:**
- `-f, --format <type>` - Configuration format: yaml or js (default: yaml)
- `-o, --output <file>` - Output file path
- `--force` - Overwrite existing configuration

**Examples:**
```bash
# Create YAML config
portfolio-monitor init

# Create JavaScript config
portfolio-monitor init --format js

# Custom output path
portfolio-monitor init --output custom-config.yml --force
```

#### `portfolio-monitor dashboard`
Start dashboard server only (no monitoring)

**Options:**
- `-p, --port <number>` - Dashboard port (default: 8080)
- `-h, --host <string>` - Dashboard host (default: localhost)
- `--no-open` - Don't auto-open browser

#### `portfolio-monitor info`
Show portfolio information

## ⚙️ Configuration

Portfolio Monitor supports both YAML and JavaScript configuration files with comprehensive options for customizing monitoring behavior.

### Configuration Files

Portfolio Monitor looks for configuration files in this order:
1. `--config` CLI argument
2. `portfolio-monitor.yml`
3. `portfolio-monitor.yaml`
4. `portfolio-monitor.config.js`
5. `.portfolio-monitor.yml`
6. `.portfolio-monitor.yaml`

### YAML Configuration Example

```yaml
# portfolio-monitor.yml
server:
  port: 8080
  host: localhost
  autoOpen: true

directories:
  scanCurrent: true
  scanDepth: 1
  include:
    - /Users/dev/legacy-projects
    - /workspace/microservices
    - C:\\Projects\\Windows  # Windows paths supported
  exclude:
    - node_modules
    - dist
    - .git
    - temp
    - backup

monitoring:
  updateInterval: 30000  # 30 seconds
  enableGitAnalysis: true
  enableTrackDown: true
  enableHealthChecks: true
  staleThreshold: 14     # days
  maxConcurrentScans: 5

dashboard:
  theme: light           # light, dark, or auto
  title: "My Portfolio"
  autoRefresh: true
  showCharts: true
  showTables: true
  compactMode: false

business:
  priorityMapping:
    revenue: HIGH
    strategic: MEDIUM
    infrastructure: LOW
  alertThresholds:
    staleDays: 14
    criticalIssues: 3
    uncommittedFiles: 10

git:
  defaultBranch: main
  remoteTimeout: 10000
  enableRemoteCheck: true
  analyzeCommitHistory: true
  maxCommitHistory: 100

data:
  directory: data
  retentionDays: 30
  compressionEnabled: true

logging:
  level: info           # error, warn, info, debug
  console: true
  # file: portfolio-monitor.log
```

### JavaScript Configuration Example

```javascript
// portfolio-monitor.config.js
module.exports = {
  server: {
    port: 8080,
    host: 'localhost',
    autoOpen: true
  },
  
  directories: {
    scanCurrent: true,
    scanDepth: 1,
    include: [
      '/Users/dev/legacy-projects',
      '/workspace/microservices'
    ],
    exclude: ['node_modules', 'dist', '.git', 'temp']
  },
  
  monitoring: {
    updateInterval: 30000,
    enableGitAnalysis: true,
    enableTrackDown: true,
    staleThreshold: 14
  },
  
  dashboard: {
    theme: 'light',
    title: 'Development Portfolio',
    autoRefresh: true
  }
};
```

### Environment Variables

Override configuration with environment variables:

```bash
export PORTFOLIO_MONITOR_PORT=3000
export PORTFOLIO_MONITOR_HOST=0.0.0.0
export PORTFOLIO_MONITOR_INCLUDE_DIRS="/path/to/projects,/other/path"
export PORTFOLIO_MONITOR_EXCLUDE_DIRS="node_modules,dist,temp"
export PORTFOLIO_MONITOR_INTERVAL=60000
export PORTFOLIO_MONITOR_LOG_LEVEL=debug
```

## 🏗 Architecture

### Directory Structure
```
portfolio-monitor/
├── bin/
│   └── portfolio-monitor.js     # CLI entry point
├── lib/
│   ├── config/
│   │   └── config-loader.js     # Configuration management
│   ├── monitor/
│   │   ├── master-controller.js # Main monitoring orchestrator
│   │   └── project-monitor.js   # Individual project analysis
│   ├── dashboard/
│   │   ├── server.js           # Web server
│   │   └── static/             # Dashboard assets
│   ├── portfolio-monitor.js    # Main class
│   └── index.js               # Package entry point
├── test/                      # Test suites
├── docs/                      # Documentation
└── trackdown/                 # Project management
```

### Data Flow
1. **Discovery**: Scan directories for Git repositories
2. **Analysis**: Extract Git data, TrackDown info, and health metrics
3. **Storage**: Store analysis results in JSON format
4. **Dashboard**: Serve real-time web interface
5. **Updates**: Periodic refresh of project data

## 🔌 API Usage

Use Portfolio Monitor programmatically in your Node.js applications:

```javascript
const { PortfolioMonitor } = require('portfolio-monitor');

// Create monitor instance
const monitor = new PortfolioMonitor({
  workingDir: '/path/to/projects',
  config: 'custom-config.yml'
});

// Initialize and scan projects
await monitor.initialize();
const projects = await monitor.scanProjects();

// Start dashboard server
const server = await monitor.startDashboard();
console.log(`Dashboard running at ${server.url}`);

// Get portfolio information
const info = await monitor.getInfo();
console.log(`Monitoring ${info.projectCount} projects`);
```

### Configuration API
```javascript
const { ConfigLoader } = require('portfolio-monitor');

// Load configuration
const configLoader = new ConfigLoader({ workingDir: process.cwd() });
const config = await configLoader.loadConfig('my-config.yml');

// Create example configuration
await configLoader.createExampleConfig('portfolio-monitor.yml');
```

## 🎯 Use Cases

### For Engineering Managers
- **Portfolio Health**: Monitor project health across teams
- **Resource Planning**: Identify stagnant or over-active projects  
- **Risk Assessment**: Spot projects with technical debt or delays
- **Team Productivity**: Track commit patterns and velocity

### For DevOps Teams
- **Deployment Readiness**: Check branch status and uncommitted changes
- **Environment Monitoring**: Track multiple environments and versions
- **Pipeline Health**: Monitor CI/CD status across projects
- **Infrastructure Projects**: Separate tracking for infrastructure vs. product code

### For Development Teams
- **Sprint Planning**: View TrackDown backlogs and progress
- **Code Review**: Identify projects needing attention
- **Branch Management**: Spot stale branches and merge conflicts
- **Technical Debt**: Track maintenance needs across projects

### For Consultants & Agencies
- **Client Projects**: Monitor multiple client codebases
- **Project Handoffs**: Generate portfolio health reports
- **Capacity Planning**: Understand project complexity and scope
- **Quality Assurance**: Ensure coding standards across projects

## 🛡 TrackDown Integration

Portfolio Monitor provides first-class support for the [TrackDown methodology](https://trackdown.org), a lightweight project management approach using version-controlled markdown files.

### Automatic Detection
- Scans for `trackdown/BACKLOG.md` files
- Parses tasks, user stories, and epics
- Extracts progress and status information
- Displays open tickets in dashboard

### TrackDown Features
- **Task Tracking**: Parse task lists with completion status
- **User Stories**: Extract and categorize user stories
- **Sprint Planning**: Monitor sprint progress and velocity
- **Business Context**: Link technical work to business goals

### Example TrackDown Structure
```
project/
├── trackdown/
│   ├── BACKLOG.md        # Main backlog file
│   ├── ROADMAP.md        # Project roadmap
│   └── CHANGELOG.md      # Version history
└── src/                  # Project source code
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Portfolio Monitor auto-detects available ports
Error: Port 8080 is already in use

# Solution: Specify different port or let auto-detection find one
portfolio-monitor --port 3000
```

#### Git Access Issues
```bash
# Ensure Git is installed and accessible
git --version

# Check Git repository status
cd project-directory
git status
```

#### Configuration Validation Errors
```bash
# Check configuration syntax
portfolio-monitor init --format yaml
# Edit generated file and fix validation errors
```

#### Memory Issues with Large Repositories
```yaml
# Reduce concurrent scans and history depth
monitoring:
  maxConcurrentScans: 2
git:
  maxCommitHistory: 50
```

### Debug Mode
```bash
# Enable verbose logging
portfolio-monitor --dev

# Check log files
tail -f portfolio-monitor.log
```

### Performance Optimization
```yaml
# Optimize for large portfolios
monitoring:
  updateInterval: 60000      # Slower updates
  maxConcurrentScans: 3      # Fewer parallel scans
directories:
  exclude:                   # Exclude large directories
    - node_modules
    - vendor
    - .next
    - dist
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
```bash
git clone https://github.com/matsuoka/portfolio-monitor.git
cd portfolio-monitor
npm install
npm run test
npm run dev
```

### Running Tests
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Code Quality
```bash
npm run lint          # ESLint
npm run lint:fix      # Auto-fix issues
```

### Releases
```bash
npm run release       # Create release
npm run release:minor # Minor version bump
npm run release:major # Major version bump
```

## 📄 License

[MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **TrackDown Methodology**: Inspired by lightweight project management
- **Git Analytics**: Built on battle-tested Git CLI tools
- **Dashboard Design**: Tailwind CSS and modern web standards
- **Node.js Ecosystem**: Leveraging the best of npm packages

## 📞 Support

- **Documentation**: [https://github.com/matsuoka/portfolio-monitor/wiki](https://github.com/matsuoka/portfolio-monitor/wiki)
- **Issues**: [https://github.com/matsuoka/portfolio-monitor/issues](https://github.com/matsuoka/portfolio-monitor/issues)
- **Discussions**: [https://github.com/matsuoka/portfolio-monitor/discussions](https://github.com/matsuoka/portfolio-monitor/discussions)
- **Email**: [support@portfolio-monitor.dev](mailto:support@portfolio-monitor.dev)

---

**Made with ❤️ for development teams worldwide**

*Portfolio Monitor - Transform your development portfolio visibility*