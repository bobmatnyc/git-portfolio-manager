# 🔧 INSTRUCTIONS (GitHub-Centric Workflow)

Updated: 2025-07-04
Project: Git Portfolio Manager

---

## 📌 1. Agent Protocol & Execution Flow

**Who this is for**: AI agents and human developers collaborating on portfolio monitoring solutions.

### ✅ Protocol Summary

1. **Validate assumptions** – ask clarifying questions before proceeding.
2. **Implement with simplicity** – prefer minimal, working code.
3. **Test and lint rigorously** – `npm run lint && npm test`.
4. **Verify functionality before closing tickets** – run full test suite locally.
5. **Document intent** – not just behavior.
6. **Confirm before architectural shifts or abstractions.**

> You are expected to follow all rules by default. No shortcuts unless explicitly approved.

---

## 🧠 2. Core Principles

* **Build real, test real** – avoid mocks unless directed.
* **Simplicity > Cleverness** – prefer straight-line solutions.
* **Validate all assumptions** – ask before introducing new paradigms.
* **Follow single-repo principles** – clean module organization, shared utilities.
* **GitHub-first approach** – leverage GitHub API for project data and workflow.

---

## 📦 3. Package & Dependency Management

### NPM Workflow
```bash
# Install dependencies
npm install

# Add new dependencies
npm install package-name
npm install --save-dev package-name  # For dev dependencies

# Remove dependencies
npm uninstall package-name

# Audit dependencies
npm audit
npm audit fix
```

### Version Management
```bash
# Semantic versioning with standard-version
npm run release         # Automatic version bump based on commits
npm run release:major   # Major version bump (breaking changes)
npm run release:minor   # Minor version bump (new features)
npm run release:patch   # Patch version bump (bug fixes)
```

---

## 🔍 4. Code Quality & Testing

### Pre-commit Requirements
```bash
# MANDATORY before any commit
npm run lint           # Biome linting
npm test              # Full test suite

# CLI functionality verification
git-portfolio-manager --version
git-portfolio-manager --help
git-portfolio-manager init --format yaml
```

### Testing Standards
- **Write tests for new features** – especially CLI commands and configuration
- **Mock external APIs** – GitHub API, file system operations
- **Test error conditions** – invalid configs, missing permissions
- **Maintain test independence** – each test should run in isolation

### Code Style Guidelines
- **Use Biome** for linting and formatting (configured in biome.json)
- **CommonJS modules** – require/module.exports throughout
- **JSDoc for public APIs** – document parameters and return values
- **Error handling** – always wrap external calls in try/catch
- **Consistent naming** – camelCase for variables, PascalCase for classes

---

## 🔄 5. Development Workflow

### Feature Development Process
1. **Check TrackDown backlog** – ensure task is defined and prioritized
2. **Create feature branch** – `feature/US-XXX-description`
3. **Implement incrementally** – small, testable changes
4. **Test thoroughly** – unit tests, integration tests, manual CLI testing
5. **Update documentation** – README, CHANGELOG, JSDoc comments
6. **Submit for review** – link to TrackDown ticket

### Configuration Management
- **Support both YAML and JS config** – users should have choice
- **Validate configuration** – use Joi schema validation
- **Provide examples** – include sample configs in init command
- **Document all options** – README should cover all configuration possibilities

### GitHub Integration
- **Use Octokit** – official GitHub API client
- **Handle rate limits** – implement proper retry logic
- **Cache API responses** – avoid unnecessary API calls
- **Support GitHub Apps** – in addition to personal access tokens

---

## 🛡️ 6. Security & Best Practices

### Security Requirements
- **Never commit secrets** – use environment variables
- **Validate all inputs** – especially file paths and URLs
- **Sanitize file operations** – prevent directory traversal
- **Use HTTPS only** – for all external API calls

### Performance Considerations
- **Lazy loading** – only load modules when needed
- **Efficient Git operations** – use appropriate git commands
- **Dashboard optimization** – minimize resource usage
- **Configuration caching** – avoid re-parsing configs unnecessarily

---

## 📊 7. Portfolio Monitoring Specifics

### Project Discovery
- **Scan directory trees** – configurable depth and patterns
- **Detect Git repositories** – analyze commit history and status
- **Identify project types** – Node.js, Python, Go, etc.
- **Health assessment** – last commit, open issues, build status

### Dashboard Requirements
- **Real-time updates** – WebSocket or polling for live data
- **Responsive design** – works on desktop and mobile
- **Export capabilities** – CSV, JSON data export
- **Filtering and search** – find projects by criteria

### TrackDown Integration
- **Parse markdown files** – extract project status and tasks
- **Business intelligence** – project prioritization and reporting
- **Progress tracking** – visualize completion over time
- **Alert system** – notify of stale or critical projects

---

## 🚀 8. Deployment & Publishing

### Package Publishing
```bash
# Pre-publication checklist
npm run lint
npm test
npm pack                    # Test package creation
npm install -g ./git-portfolio-manager-*.tgz  # Test installation

# Publish to npm
npm publish
```

### Installation Testing
- **Global installation** – `npm install -g git-portfolio-manager`
- **Local installation** – `npm install git-portfolio-manager`
- **CLI functionality** – all commands work post-installation
- **Configuration generation** – init command creates valid configs

---

## 🔧 9. Troubleshooting & Support

### Common Issues
- **Port conflicts** – implement auto-port detection
- **Permission errors** – graceful handling of restricted directories
- **GitHub API limits** – proper rate limiting and retry logic
- **Configuration errors** – clear error messages and suggestions

### Debug Mode
```bash
# Development debugging
git-portfolio-manager start --dev
export NODE_ENV=development

# Log levels
export LOG_LEVEL=debug
```

### Support Channels
- **GitHub Issues** – bug reports and feature requests
- **TrackDown** – internal project management
- **Documentation** – comprehensive README and examples

---

## ✅ 10. Definition of Done

### Feature Complete Checklist
- [ ] **Functionality implemented** – meets acceptance criteria
- [ ] **Tests written and passing** – unit and integration tests
- [ ] **Documentation updated** – README, JSDoc, examples
- [ ] **Code quality verified** – linting passes, no warnings
- [ ] **CLI tested** – all commands work correctly
- [ ] **TrackDown updated** – ticket status reflects completion
- [ ] **No breaking changes** – unless planned and documented

### Release Checklist
- [ ] **Version bumped** – using semantic versioning
- [ ] **CHANGELOG updated** – document all changes
- [ ] **Package tested** – installation and functionality verified
- [ ] **GitHub release created** – with release notes
- [ ] **npm package published** – publicly available
- [ ] **Documentation deployed** – README reflects current version