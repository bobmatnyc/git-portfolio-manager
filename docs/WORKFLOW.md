# 🔁 Git Portfolio Manager - Development Workflow

**Version**: 1.0
**Updated**: 2025-07-04
**Repository**: https://github.com/bobmatnyc/git-portfolio-manager.git

This document contains the complete workflow procedures for the Git Portfolio Manager project, a Node.js CLI tool for portfolio monitoring with Git analytics and business intelligence.

## 📋 Project Management with Track Down

This project uses **Track Down**, a markdown-based project tracking system that treats project management artifacts as code. All project tracking is maintained in versioned markdown files within the repository, enabling the same collaborative patterns used for source code to apply to project management.

### Track Down Benefits
- Version-controlled project history with full audit trail
- Offline-capable project management
- Tool-agnostic implementation using standard markdown
- Seamless integration with existing development workflows
- Zero external dependencies or hosted services required

### Track Down File Structure

```
git-portfolio-manager/
├── trackdown/
│   ├── BACKLOG.md              # Central tracking file
│   ├── ROADMAP.md              # High-level planning
│   ├── RETROSPECTIVES.md       # Sprint retrospectives
│   ├── METRICS.md              # Project metrics/reports
│   ├── templates/
│   │   ├── epic-template.md
│   │   ├── story-template.md
│   │   └── task-template.md
│   └── scripts/
│       ├── backlog-validator.js
│       ├── status-report.js
│       └── metrics-generator.js
```

## 🚀 Local Deployment & Testing

### Feature Branch Testing
When testing a feature branch locally before merging:

```bash
# 1. Build the current feature branch
npm run build

# 2. Install globally from current directory
npm install -g .

# 3. Start the dashboard server (from project root)
# Option A: Using CLI (may have initialization issues)
git-portfolio-manager start --port 3010 --no-open --dev

# Option B: Direct server start (recommended for testing)
node lib/dashboard/server.js --port 3010

# 4. Test dashboard and API endpoints
curl http://localhost:3010/                    # Main dashboard
curl http://localhost:3010/trackdown.html      # TrackDown UI
curl http://localhost:3010/api/trackdown/projects   # API test
```

### TrackDown UI Testing
The TrackDown UI provides a complete task management interface:

- **Main Dashboard**: http://localhost:3010/
- **TrackDown Manager**: http://localhost:3010/trackdown.html
- **API Endpoints**:
  - `GET /api/trackdown/projects` - List projects
  - `GET /api/trackdown/tickets` - List tickets (with filtering)
  - `GET /api/trackdown/analytics` - Analytics data
  - `POST /api/trackdown/sync` - Sync/refresh data
  - `POST /api/trackdown/tickets` - Create tickets
  - `PUT /api/trackdown/tickets/{project}/{id}` - Update tickets
  - `DELETE /api/trackdown/tickets/{project}/{id}` - Delete tickets

### Deployment Notes
- Server looks for static files in `lib/dashboard/static/`
- TrackDown manager discovers projects from current working directory
- Server auto-detects available ports if requested port is busy
- All TrackDown data is stored in `trackdown/BACKLOG.md` files

## 🔄 Development Workflow Steps

### 1. Task Selection & Planning

#### From Track Down Backlog
```bash
# Review current sprint backlog
cat trackdown/BACKLOG.md

# Identify highest priority ready tasks
grep -A 5 "Priority: High" trackdown/BACKLOG.md

# Select task and update status
# Edit BACKLOG.md to mark task as "In Progress"
```

#### Task Validation Checklist
- [ ] Task has clear acceptance criteria
- [ ] Technical approach is understood
- [ ] Dependencies are identified and available
- [ ] Estimated effort aligns with sprint capacity

### 2. Branch Creation & Setup

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/US-XXX-description

# Verify clean working directory
git status

# Link branch to task in commit
git commit --allow-empty -m "feat: start US-XXX task

Initialize branch for [US-XXX] task implementation.
Epic: [EP-XXX]"
```

### 3. Implementation Phase

#### Development Standards
- **Code in small, testable increments** - avoid large commits
- **Write tests alongside implementation** - test-driven development
- **Document public APIs with JSDoc** - clear parameter and return types
- **Follow existing code patterns** - consistency over innovation

#### Continuous Validation
```bash
# Before each commit
npm run lint              # Biome code quality checks
npm test                 # Full test suite
git-portfolio-manager --version  # CLI functionality

# Local integration testing
git-portfolio-manager init --format yaml
git-portfolio-manager start --dev --port 8081
```

### 4. Testing Requirements

#### Test Categories
1. **Unit Tests** - Individual function and class testing
2. **Integration Tests** - CLI command and configuration testing
3. **API Tests** - GitHub integration and external API mocking
4. **End-to-End Tests** - Complete workflow validation

#### Test Execution
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Test specific functionality
npm test -- --grep "configuration"
npm test -- --grep "GitHub integration"
```

### 5. Documentation Updates

#### Required Documentation Updates
- **README.md** - Installation, usage, and configuration examples
- **CHANGELOG.md** - Feature additions, bug fixes, and breaking changes
- **JSDoc Comments** - Function parameters, return values, and examples
- **Configuration Examples** - Sample YAML and JS configuration files

#### Documentation Validation
```bash
# Verify examples work
git-portfolio-manager init --format yaml
git-portfolio-manager init --format js

# Test configuration examples
git-portfolio-manager start --config examples/basic.yml
git-portfolio-manager start --config examples/advanced.js
```

### 6. Code Review & Quality Assurance

#### Pre-Review Checklist
- [ ] All tests passing locally
- [ ] Linting issues resolved
- [ ] Documentation updated
- [ ] Examples tested and working
- [ ] No breaking changes introduced (unless planned)

#### Self-Review Process
```bash
# Review your own changes
git diff main...feature/US-XXX-description

# Check for common issues
grep -r "console.log" lib/           # No debug statements
grep -r "TODO\|FIXME" lib/          # No unfinished code
grep -r "process.env" lib/           # Environment variable usage
```

### 7. Integration & Deployment

#### Final Integration Testing
```bash
# Build and test package
npm pack
npm install -g ./git-portfolio-manager-*.tgz

# Full CLI testing
git-portfolio-manager --help
git-portfolio-manager init
git-portfolio-manager start --config portfolio-monitor.yml

# Clean up test installation
npm uninstall -g git-portfolio-manager
```

#### Release Process
```bash
# Semantic version bump
npm run release              # Automatic based on commits
npm run release:minor        # Minor version for new features
npm run release:major        # Major version for breaking changes

# Publish to npm
npm publish

# Create GitHub release
gh release create v1.0.1 --generate-notes
```

## 🔍 Quality Gates & Validation

### Mandatory Quality Checks

#### Code Quality Gate
```bash
# Must pass before merge
npm run lint                 # Biome linting - zero errors
npm test                    # Test suite - 100% pass rate
```

#### Functionality Gate
```bash
# CLI functionality verification
git-portfolio-manager --version     # Version display
git-portfolio-manager --help        # Help system
git-portfolio-manager init         # Config generation
git-portfolio-manager start --dev  # Development mode
```

#### Documentation Gate
- [ ] README updated with new features
- [ ] CHANGELOG entry added
- [ ] JSDoc comments for public APIs
- [ ] Configuration examples tested

### Performance & Security Checks

#### Performance Validation
- Dashboard loads within 3 seconds
- Project scanning completes within reasonable time
- Memory usage remains stable during monitoring
- No memory leaks in long-running processes

#### Security Validation
- No secrets committed to repository
- Input validation for all user inputs
- Proper file path sanitization
- GitHub token handling and storage

## 🎯 Sprint Planning & Execution

### Sprint Cycle (2 weeks)

#### Sprint Planning
1. **Backlog Refinement** - Review and prioritize tasks
2. **Capacity Planning** - Estimate available development time
3. **Sprint Goal Definition** - Clear objective for sprint
4. **Task Assignment** - Distribute work across team members

#### Daily Development
- **Morning**: Review previous day's progress
- **Development**: Focused implementation time
- **Testing**: Continuous validation and quality checks
- **Evening**: Commit progress and update task status

#### Sprint Review
- **Demo**: Showcase completed features
- **Metrics Review**: Analyze sprint velocity and quality
- **Retrospective**: Identify improvements for next sprint
- **Planning**: Prepare backlog for upcoming sprint

### Release Planning

#### Release Criteria
- All planned features implemented and tested
- Documentation complete and accurate
- Performance and security validated
- NPM package ready for distribution

#### Release Process
1. **Feature Freeze** - No new features after this point
2. **Stabilization** - Bug fixes and polish only
3. **Release Candidate** - Create RC for final testing
4. **Production Release** - Publish to npm registry
5. **Post-Release** - Monitor for issues and feedback

## 🔄 Continuous Improvement

### Metrics Collection
- **Development Velocity** - Story points completed per sprint
- **Quality Metrics** - Test coverage, bug rate, and code quality scores
- **User Feedback** - GitHub issues, npm downloads, and community engagement
- **Performance Metrics** - Dashboard response times and resource usage

### Process Optimization
- **Weekly Retrospectives** - Identify process improvements
- **Tool Evaluation** - Assess new tools and technologies
- **Documentation Updates** - Keep workflow documentation current
- **Automation Opportunities** - Identify manual processes for automation

### Knowledge Sharing
- **Code Reviews** - Share knowledge and maintain quality
- **Documentation** - Comprehensive guides and examples
- **Community Engagement** - GitHub discussions and issue support
- **Best Practices** - Document and share effective patterns

## 🎯 Success Criteria

### Development Success
- **Velocity**: Consistent sprint velocity with predictable delivery
- **Quality**: High test coverage with low defect rate
- **User Satisfaction**: Positive feedback and growing adoption
- **Maintainability**: Clean, well-documented, and testable code

### Product Success
- **Adoption**: Growing NPM downloads and user base
- **Functionality**: Feature completeness for target use cases
- **Performance**: Fast, reliable operation under load
- **Support**: Responsive issue resolution and user support