# Claude Code Instructions - Git Portfolio Manager

**AI Assistant Instructions for Git Portfolio Manager Project**

## 🚨 CRITICAL: Claude PM Framework Integration

**Project Management Repository**: `~/Projects/Claude-PM/`
- **ALL TrackDown tickets**: `Claude-PM/trackdown/BACKLOG.md`
- **Framework configuration**: `Claude-PM/framework/CLAUDE.md`
- **Integration status**: This project is part of **M01 Foundation** milestone

### 🎫 MANDATORY TICKET SYSTEM
**EVERY** task requires a TrackDown ticket in the Claude-PM repository:
- **Format**: [M01-XXX] prefixes for this project
- **Location**: `~/Projects/Claude-PM/trackdown/BACKLOG.md`
- **Reference in commits**: `git commit -m "feat: implement X - closes M01-XXX"`

## CRITICAL: Review Required Documentation
**IMPORTANT**: Before starting any work, you MUST review these files:
1. `/docs/INSTRUCTIONS.md` - Core development instructions and agent protocol
2. `/docs/WORKFLOW.md` - Required workflow processes  
3. `/docs/PROJECT.md` - Project specifications and requirements
4. `/docs/TOOLCHAIN.md` - Comprehensive toolchain and technical configuration guide
5. `~/Projects/Claude-PM/framework/CLAUDE.md` - Master framework configuration

**Following these instructions is MANDATORY. Ask for clarification before considering ANY variance from the documented procedures.**

## 🔄 TrackDown Integration & Task Management

### YOLO Mode Requirements
- **ALWAYS work from a TrackDown task** when in YOLO mode
- **Branch naming MUST tie to TrackDown tasks**: `feature/US-001-description`
- **All development work** follows epic/subticket workflow with proper branching
- **Never work without a linked TrackDown ticket** for accountability

### Task-Driven Development Workflow
```bash
# 1. Start from TrackDown task
trackdown view US-001  # Review task details

# 2. Create properly named branch
git checkout -b feature/US-001-new-feature

# 3. Update task status
trackdown update US-001 --status "In Progress"

# 4. Implement with task linkage in commits
git commit -m "feat: implement core feature

Partial work on US-001. Added basic structure.
References: EP-001"

# 5. Complete and link back to task
trackdown update US-001 --status "Done" --notes "Implementation complete"
```

### Epic Management
- **Complex work MUST use epic/subticket structure**
- **Epic branches** serve as base for all related subticket branches
- **All documentation epics** follow the 6-subticket pattern:
  1. Audit and Analysis
  2. Toolchain Enhancement  
  3. Workflow Documentation
  4. Business Context
  5. Structure Optimization
  6. Integration Testing

---

## 🎯 Project Overview
This is a **Node.js CLI tool** for portfolio monitoring and management:
- **Package**: `git-portfolio-manager`
- **Purpose**: Automated project portfolio monitoring with Git analytics and dashboard
- **Architecture**: Single-repo NPM package (not a monorepo)
- **Package Manager**: `npm` (standard Node.js package management)
- **Runtime**: Node.js with CommonJS modules

## 🔧 Development Guidelines

### Essential Commands
```bash
# Before completing any task
npm run lint && npm test

# Development commands
npm start                    # Start portfolio monitor
npm run dev                  # Run in development mode
npm test                     # Run test suite
npm run test:watch          # Watch mode testing
npm run lint                # Biome linting
npm run lint:fix            # Auto-fix issues with Biome

# Package management
npm run release             # Create semantic version release
npm run release:major       # Major version bump
npm run release:minor       # Minor version bump
npm run release:patch       # Patch version bump
```

### Code Standards
- **Node.js 14+**: Minimum runtime requirement
- **Biome**: Unified linting & formatting (replaces ESLint+Prettier)
- **CommonJS**: Standard require/module.exports pattern
- **No strict typing enforcement** - JavaScript with JSDoc for documentation
- **JSDoc recommended** for public functions and complex logic
- **Follow existing patterns** - Don't introduce new paradigms without approval
- **NEVER deviate from documented instructions without explicit approval**

## 🌍 Environment Variables
All environment variables use the `GITHUB_` prefix for GitHub integration:

### GitHub Integration
```bash
GITHUB_TOKEN=your_github_token_here         # For GitHub API access
GITHUB_PROJECT_NUMBER=1                     # Optional project number
GITHUB_OWNER=your_github_username           # Repository owner
```

### Configuration
```bash
PORT=8080                                   # Dashboard server port
NODE_ENV=development                        # Environment mode
```

## 🚀 CLI Usage Patterns
```bash
# Main commands
git-portfolio-manager start                 # Start monitoring dashboard
git-portfolio-manager init                  # Initialize configuration
git-portfolio-manager dashboard            # Dashboard-only mode
git-portfolio-manager info                 # Show project information

# Options and flags
git-portfolio-manager start --port 8080    # Custom port
git-portfolio-manager start --dev          # Development mode
git-portfolio-manager start --config file  # Custom config file
git-portfolio-manager init --format yaml   # YAML config format
git-portfolio-manager init --format js     # JavaScript config format
```

## 📁 Key Project Structure
```
git-portfolio-manager/
├── bin/
│   └── git-portfolio-manager.js    # CLI entry point
├── lib/
│   ├── config/
│   │   └── config-loader.js         # Configuration management
│   ├── dashboard/
│   │   ├── server.js               # Dashboard server
│   │   └── static/                 # Dashboard assets
│   ├── github/
│   │   └── github-client.js        # GitHub API integration
│   ├── monitor/
│   │   ├── master-controller.js    # Main orchestrator
│   │   └── project-monitor.js      # Project monitoring logic
│   ├── index.js                    # Main entry point
│   └── portfolio-monitor.js        # Core monitoring class
├── docs/                           # Documentation
├── trackdown/                      # Project management
├── test/                          # Test files
└── package.json                   # Package configuration
```

## 🔧 Development Server Management

### Portfolio Monitoring Development
```bash
# Development workflow
npm run dev                         # Run with development logging
npm start                          # Standard monitoring mode
npm test                           # Run test suite

# Monitor configuration
git-portfolio-manager init         # Create config file
git-portfolio-manager start --config portfolio-monitor.yml
```

### Post-Task Verification Procedures
**CRITICAL**: After each development task, run these verification steps:

```bash
# 1. Code quality verification
npm run lint                       # Biome validation
npm test                          # Full test suite execution

# 2. Package functionality verification  
npm start -- --version           # Verify CLI works
git-portfolio-manager --help     # Verify help system
git-portfolio-manager init       # Test config generation
```

## 🛠️ Claude Code Integration Setup

### MCP Server Configuration
Create `.mcp.json` in project root for Claude Code integrations:

```json
{
  "mcpServers": {
    "github": {
      "command": "gh",
      "args": ["api"],
      "description": "GitHub CLI integration for issues and PRs"
    }
  }
}
```

### Environment Inheritance
Claude inherits your shell environment including:
- GitHub CLI access and authentication
- Git configuration and credentials
- Node.js, npm, and all project dependencies
- All GitHub API tokens from environment

## 🔍 Code-Truth Validation Requirements

### Documentation Alignment Principle
**CRITICAL**: Code is the source of truth. When documentation conflicts with implementation:
1. **Assume code is correct** unless explicitly told otherwise
2. **Update documentation** to match current code behavior
3. **Verify technical instructions** against actual package.json scripts
4. **Cross-reference configurations** with actual config files

### Validation Process
```bash
# Before documenting any technical procedure:
cat package.json | grep -A 10 "scripts"    # Verify npm scripts exist
ls -la *.config.js *.json                  # Verify config files
find lib/ -name "*.js" | head              # Verify file structure

# Validate environment setup against actual code:
grep -r "GITHUB_" lib/ --include="*.js"    # Check env var usage
grep -r "process.env" lib/ --include="*.js" # Check environment access
```

## ⚠️ Critical Rules
1. **Use CommonJS modules** - require/module.exports pattern throughout
2. **No build step required** - direct Node.js execution
3. **Use npm for dependencies** (never edit package.json manually)
4. **Process one file at a time** for multiple files
5. **Suggest changes, don't auto-fix** code without approval
6. **Use proper error handling** with try/catch blocks
7. **Lazy initialization** of clients only when called
8. **GitHub-first design** - leverage GitHub API for project data

## 🧪 Testing Strategy & Requirements

### Current Test Status
- **Basic test suite** with core functionality validation
- **Integration testing** for CLI commands and configuration
- **GitHub API mocking** for reliable testing

### Testing Commands
```bash
# Essential testing workflow
npm test                        # Run all tests
npm run test:watch             # Development watch mode

# Before any commit/merge
npm run lint && npm test
```

### Test Quality Standards
- **Mock external dependencies** (GitHub API, file system when appropriate)
- **Use descriptive test names** and organize logically
- **Test both success and error cases** for critical paths
- **Maintain test independence** - no test should depend on another
- **Clean up test artifacts** - use temp directories, clean in afterEach

## 📋 Task Management
- User prefers **Track Down over GitHub issues** for project management
- Update `WORKFLOW.md` to reflect Track Down preference
- Track **security vulnerabilities** through GitHub issues when needed
- All development work should link back to TrackDown tickets

## 🚀 Publishing Requirements
- **All tests must pass** before publishing
- **Test CLI functionality** after installation
- **Use `npm publish`** for publishing to registry
- **Update version and documentation** (CHANGELOG, README) before release