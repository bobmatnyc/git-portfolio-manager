/**
 * Git History Report Generator
 * 
 * Business Purpose: Generate comprehensive git history reports with branch evolution
 * Features:
 * - Branch evolution analysis with Mermaid diagrams
 * - Commit history analysis
 * - LOC (Lines of Code) statistics 
 * - Contributor analysis
 * - Report caching in .git-portfolio-manager/reports
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class GitHistoryGenerator {
  constructor(options = {}) {
    this.projectPath = options.projectPath || process.cwd();
    this.cacheDir = options.cacheDir || path.join(this.projectPath, '.git-portfolio-manager', 'reports');
    this.maxCommits = options.maxCommits || 100;
    this.cacheTTL = options.cacheTTL || 24 * 60 * 60 * 1000; // 24 hours
    
    console.log('📊 Git History Generator initialized');
  }

  /**
   * Generate comprehensive git history report
   */
  async generateReport(projectName, options = {}) {
    console.log(`📋 Generating git history report for ${projectName}...`);
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(projectName, options);
      const cachedReport = await this.getCachedReport(cacheKey);
      
      if (cachedReport && !options.forceRefresh) {
        console.log('📄 Using cached report');
        return cachedReport;
      }

      // Generate new report
      const report = await this.generateNewReport(projectName, options);
      
      // Cache the report
      await this.cacheReport(cacheKey, report);
      
      console.log(`✅ Git history report generated for ${projectName}`);
      return report;
      
    } catch (error) {
      console.error(`❌ Failed to generate git history report for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Generate new comprehensive report
   */
  async generateNewReport(projectName, options = {}) {
    const projectPath = options.projectPath || path.join(this.projectPath, projectName);
    
    if (!await this.isGitRepository(projectPath)) {
      throw new Error(`${projectPath} is not a git repository`);
    }

    const report = {
      projectName,
      projectPath,
      generatedAt: new Date().toISOString(),
      summary: {},
      branchEvolution: {},
      commitHistory: [],
      contributors: [],
      locStatistics: {},
      mermaidDiagrams: {},
      fileChanges: {},
      timelineAnalysis: {}
    };

    // Change to project directory for git commands
    const originalCwd = process.cwd();
    process.chdir(projectPath);

    try {
      // Generate different sections of the report
      report.summary = await this.generateSummary();
      report.branchEvolution = await this.analyzeBranchEvolution();
      report.commitHistory = await this.getCommitHistory();
      report.contributors = await this.analyzeContributors();
      report.locStatistics = await this.analyzeLOCStatistics();
      report.mermaidDiagrams = await this.generateMermaidDiagrams(report);
      report.fileChanges = await this.analyzeFileChanges();
      report.timelineAnalysis = await this.generateTimelineAnalysis(report.commitHistory);
      
    } finally {
      process.chdir(originalCwd);
    }

    return report;
  }

  /**
   * Generate repository summary
   */
  async generateSummary() {
    try {
      const totalCommits = this.executeGitCommand('git rev-list --count HEAD').trim();
      const totalBranches = this.executeGitCommand('git branch -r | wc -l').trim();
      const firstCommit = this.executeGitCommand('git log --reverse --format="%ai" | head -1').trim();
      const lastCommit = this.executeGitCommand('git log -1 --format="%ai"').trim();
      const currentBranch = this.executeGitCommand('git branch --show-current').trim();
      const remoteUrl = this.executeGitCommand('git config --get remote.origin.url').trim();
      
      return {
        totalCommits: parseInt(totalCommits) || 0,
        totalBranches: parseInt(totalBranches) || 0,
        firstCommitDate: firstCommit,
        lastCommitDate: lastCommit,
        currentBranch,
        remoteUrl,
        repositoryAge: this.calculateRepositoryAge(firstCommit, lastCommit)
      };
    } catch (error) {
      console.warn('Warning: Could not generate complete summary:', error.message);
      return {};
    }
  }

  /**
   * Analyze branch evolution
   */
  async analyzeBranchEvolution() {
    try {
      // Get all branches (local and remote)
      const allBranches = this.executeGitCommand('git branch -a --format="%(refname:short)"')
        .split('\n')
        .filter(branch => branch.trim())
        .map(branch => branch.trim().replace('origin/', ''))
        .filter((branch, index, array) => array.indexOf(branch) === index) // Remove duplicates
        .filter(branch => !branch.includes('HEAD'));

      const branchDetails = {};
      
      for (const branch of allBranches.slice(0, 20)) { // Limit to 20 branches
        try {
          // Get branch creation date and author
          const branchInfo = this.executeGitCommand(`git log --reverse --format="%ai|%an|%s" ${branch} | head -1`).trim();
          const [createdAt, author, firstCommitMessage] = branchInfo.split('|');
          
          // Get branch stats
          const commitCount = this.executeGitCommand(`git rev-list --count ${branch}`).trim();
          const lastCommit = this.executeGitCommand(`git log -1 --format="%ai|%s" ${branch}`).trim();
          const [lastCommitDate, lastCommitMessage] = lastCommit.split('|');
          
          // Check if branch is merged
          let mergedInto = null;
          try {
            const mergeCheck = this.executeGitCommand(`git branch --merged main | grep "${branch}"`).trim();
            if (mergeCheck) {
              mergedInto = 'main';
            }
          } catch (e) {
            // Branch not merged or error checking
          }

          branchDetails[branch] = {
            name: branch,
            createdAt,
            author,
            firstCommitMessage,
            commitCount: parseInt(commitCount) || 0,
            lastCommitDate,
            lastCommitMessage,
            mergedInto,
            isActive: this.isBranchActive(lastCommitDate)
          };
        } catch (error) {
          console.warn(`Warning: Could not analyze branch ${branch}:`, error.message);
        }
      }

      return {
        branches: branchDetails,
        totalBranches: allBranches.length,
        activeBranches: Object.values(branchDetails).filter(b => b.isActive).length,
        mergedBranches: Object.values(branchDetails).filter(b => b.mergedInto).length
      };
    } catch (error) {
      console.warn('Warning: Could not analyze branch evolution:', error.message);
      return { branches: {}, totalBranches: 0, activeBranches: 0, mergedBranches: 0 };
    }
  }

  /**
   * Get detailed commit history
   */
  async getCommitHistory() {
    try {
      const commitFormat = '%H|%ai|%an|%ae|%s|%P'; // hash|date|author|email|subject|parents
      const commits = this.executeGitCommand(`git log --format="${commitFormat}" -${this.maxCommits}`)
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [hash, date, author, email, subject, parents] = line.split('|');
          return {
            hash: hash.trim(),
            date: date.trim(),
            author: author.trim(),
            email: email.trim(),
            subject: subject.trim(),
            parents: parents.trim().split(' ').filter(p => p),
            isMerge: parents.trim().split(' ').length > 1,
            filesChanged: this.getCommitFileChanges(hash.trim())
          };
        });

      return commits;
    } catch (error) {
      console.warn('Warning: Could not get commit history:', error.message);
      return [];
    }
  }

  /**
   * Get file changes for a specific commit
   */
  getCommitFileChanges(commitHash) {
    try {
      const stats = this.executeGitCommand(`git show --stat --format="" ${commitHash}`)
        .split('\n')
        .filter(line => line.trim() && !line.includes('file') && !line.includes('insertion') && !line.includes('deletion'))
        .slice(0, -1); // Remove summary line

      return stats.map(line => {
        const parts = line.split('|');
        if (parts.length >= 2) {
          const fileName = parts[0].trim();
          const changes = parts[1].trim();
          return { fileName, changes };
        }
        return null;
      }).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  /**
   * Analyze contributors
   */
  async analyzeContributors() {
    try {
      const contributorStats = this.executeGitCommand('git shortlog -sn --all')
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
          if (match) {
            const [, commits, name] = match;
            return {
              name: name.trim(),
              commits: parseInt(commits),
              percentage: 0 // Will be calculated below
            };
          }
          return null;
        })
        .filter(Boolean);

      // Calculate percentages
      const totalCommits = contributorStats.reduce((sum, contributor) => sum + contributor.commits, 0);
      contributorStats.forEach(contributor => {
        contributor.percentage = ((contributor.commits / totalCommits) * 100).toFixed(1);
      });

      // Get additional stats for top contributors
      for (const contributor of contributorStats.slice(0, 10)) {
        try {
          const firstCommit = this.executeGitCommand(`git log --author="${contributor.name}" --reverse --format="%ai" | head -1`).trim();
          const lastCommit = this.executeGitCommand(`git log --author="${contributor.name}" --format="%ai" | head -1`).trim();
          
          contributor.firstCommit = firstCommit;
          contributor.lastCommit = lastCommit;
          contributor.activePeriod = this.calculateActivePeriod(firstCommit, lastCommit);
        } catch (error) {
          // Skip if we can't get additional stats
        }
      }

      return contributorStats;
    } catch (error) {
      console.warn('Warning: Could not analyze contributors:', error.message);
      return [];
    }
  }

  /**
   * Analyze Lines of Code statistics
   */
  async analyzeLOCStatistics() {
    try {
      // Get current LOC
      const currentLOC = this.getCurrentLOC();
      
      // Get LOC changes over time (last 10 commits)
      const locHistory = [];
      const commits = this.executeGitCommand('git log --format="%H" -10')
        .split('\n')
        .filter(line => line.trim());

      for (const commit of commits.slice(0, 5)) { // Limit to 5 for performance
        try {
          const stats = this.executeGitCommand(`git show --stat --format="%ai" ${commit}`)
            .split('\n');
          
          const date = stats[0];
          const summary = stats[stats.length - 2] || '';
          
          const insertions = this.extractNumber(summary, /(\d+) insertion/);
          const deletions = this.extractNumber(summary, /(\d+) deletion/);
          
          locHistory.push({
            commit,
            date,
            insertions,
            deletions,
            netChange: insertions - deletions
          });
        } catch (error) {
          // Skip commits we can't analyze
        }
      }

      return {
        current: currentLOC,
        history: locHistory,
        totalInsertions: locHistory.reduce((sum, entry) => sum + entry.insertions, 0),
        totalDeletions: locHistory.reduce((sum, entry) => sum + entry.deletions, 0),
        netChange: locHistory.reduce((sum, entry) => sum + entry.netChange, 0)
      };
    } catch (error) {
      console.warn('Warning: Could not analyze LOC statistics:', error.message);
      return { current: {}, history: [], totalInsertions: 0, totalDeletions: 0, netChange: 0 };
    }
  }

  /**
   * Get current LOC by file type
   */
  getCurrentLOC() {
    try {
      // Use git ls-files to get tracked files and count lines
      const files = this.executeGitCommand('git ls-files')
        .split('\n')
        .filter(file => file.trim());

      const locByType = {};
      let totalLOC = 0;

      for (const file of files.slice(0, 100)) { // Limit to 100 files for performance
        try {
          const extension = path.extname(file).toLowerCase();
          const fileType = this.getFileType(extension);
          
          const lines = this.executeGitCommand(`wc -l "${file}"`).trim();
          const lineCount = parseInt(lines.split(' ')[0]) || 0;
          
          if (!locByType[fileType]) {
            locByType[fileType] = { files: 0, lines: 0 };
          }
          
          locByType[fileType].files++;
          locByType[fileType].lines += lineCount;
          totalLOC += lineCount;
        } catch (error) {
          // Skip files we can't read
        }
      }

      return {
        byType: locByType,
        total: totalLOC,
        fileCount: files.length
      };
    } catch (error) {
      return { byType: {}, total: 0, fileCount: 0 };
    }
  }

  /**
   * Generate Mermaid diagrams
   */
  async generateMermaidDiagrams(report) {
    const diagrams = {};

    // Branch evolution diagram
    diagrams.branchEvolution = this.generateBranchEvolutionDiagram(report.branchEvolution);
    
    // Commit timeline diagram
    diagrams.commitTimeline = this.generateCommitTimelineDiagram(report.commitHistory);
    
    // Contributor flow diagram
    diagrams.contributorFlow = this.generateContributorFlowDiagram(report.contributors);

    return diagrams;
  }

  /**
   * Generate branch evolution Mermaid diagram
   */
  generateBranchEvolutionDiagram(branchEvolution) {
    const branches = Object.values(branchEvolution.branches || {}).slice(0, 10); // Limit to 10 branches
    
    let diagram = 'gitgraph\n';
    diagram += '    commit id: "Initial"\n';
    
    // Add main branch commits
    const mainBranch = branches.find(b => b.name === 'main' || b.name === 'master');
    if (mainBranch) {
      diagram += `    commit id: "Main-${mainBranch.commitCount}"\n`;
    }

    // Add feature branches
    const featureBranches = branches.filter(b => 
      b.name !== 'main' && 
      b.name !== 'master' && 
      !b.name.startsWith('origin/') &&
      b.commitCount > 1
    ).slice(0, 5);

    for (const branch of featureBranches) {
      diagram += `    branch ${branch.name.replace(/[^a-zA-Z0-9]/g, '')}\n`;
      diagram += `    checkout ${branch.name.replace(/[^a-zA-Z0-9]/g, '')}\n`;
      diagram += `    commit id: "${branch.name}-1"\n`;
      
      if (branch.commitCount > 1) {
        diagram += `    commit id: "${branch.name}-${branch.commitCount}"\n`;
      }
      
      if (branch.mergedInto) {
        diagram += '    checkout main\n';
        diagram += `    merge ${branch.name.replace(/[^a-zA-Z0-9]/g, '')}\n`;
      }
    }

    return diagram;
  }

  /**
   * Generate commit timeline Mermaid diagram
   */
  generateCommitTimelineDiagram(commitHistory) {
    const recentCommits = commitHistory.slice(0, 10);
    
    let diagram = 'timeline\n';
    diagram += '    title Git Commit Timeline\n\n';
    
    // Group commits by date
    const commitsByDate = {};
    recentCommits.forEach(commit => {
      const date = commit.date.split(' ')[0];
      if (!commitsByDate[date]) {
        commitsByDate[date] = [];
      }
      commitsByDate[date].push(commit);
    });

    Object.entries(commitsByDate).forEach(([date, commits]) => {
      diagram += `    ${date}\n`;
      commits.forEach(commit => {
        const shortSubject = commit.subject.substring(0, 30) + (commit.subject.length > 30 ? '...' : '');
        diagram += `        : ${shortSubject}\n`;
        diagram += `        : by ${commit.author}\n`;
      });
    });

    return diagram;
  }

  /**
   * Generate contributor flow Mermaid diagram
   */
  generateContributorFlowDiagram(contributors) {
    const topContributors = contributors.slice(0, 5);
    
    let diagram = 'flowchart TD\n';
    diagram += '    A[Repository] --> B[Contributors]\n';
    
    topContributors.forEach((contributor, index) => {
      const id = `C${index + 1}`;
      diagram += `    B --> ${id}["${contributor.name}<br/>${contributor.commits} commits<br/>${contributor.percentage}%"]\n`;
    });

    return diagram;
  }

  /**
   * Analyze file changes
   */
  async analyzeFileChanges() {
    try {
      // Get most frequently changed files
      const fileChanges = this.executeGitCommand('git log --name-only --format="" | sort | uniq -c | sort -nr')
        .split('\n')
        .filter(line => line.trim())
        .slice(0, 20)
        .map(line => {
          const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
          if (match) {
            const [, count, fileName] = match;
            return {
              fileName: fileName.trim(),
              changeCount: parseInt(count),
              fileType: this.getFileType(path.extname(fileName))
            };
          }
          return null;
        })
        .filter(Boolean);

      return {
        mostChanged: fileChanges,
        changesByType: this.groupChangesByType(fileChanges)
      };
    } catch (error) {
      console.warn('Warning: Could not analyze file changes:', error.message);
      return { mostChanged: [], changesByType: {} };
    }
  }

  /**
   * Generate timeline analysis
   */
  async generateTimelineAnalysis(commitHistory) {
    const timeline = {
      commitsByMonth: {},
      commitsByDay: {},
      commitsByHour: {},
      peakActivity: null
    };

    commitHistory.forEach(commit => {
      const date = new Date(commit.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const day = date.getDay(); // 0 = Sunday
      const hour = date.getHours();

      timeline.commitsByMonth[month] = (timeline.commitsByMonth[month] || 0) + 1;
      timeline.commitsByDay[day] = (timeline.commitsByDay[day] || 0) + 1;
      timeline.commitsByHour[hour] = (timeline.commitsByHour[hour] || 0) + 1;
    });

    // Find peak activity
    const peakMonth = Object.entries(timeline.commitsByMonth).sort((a, b) => b[1] - a[1])[0];
    const peakDay = Object.entries(timeline.commitsByDay).sort((a, b) => b[1] - a[1])[0];
    const peakHour = Object.entries(timeline.commitsByHour).sort((a, b) => b[1] - a[1])[0];

    timeline.peakActivity = {
      month: peakMonth ? { period: peakMonth[0], commits: peakMonth[1] } : null,
      day: peakDay ? { day: this.getDayName(parseInt(peakDay[0])), commits: peakDay[1] } : null,
      hour: peakHour ? { hour: peakHour[0], commits: peakHour[1] } : null
    };

    return timeline;
  }

  /**
   * Helper methods
   */
  
  executeGitCommand(command) {
    return execSync(command, { encoding: 'utf8' });
  }

  async isGitRepository(projectPath) {
    try {
      const gitDir = path.join(projectPath, '.git');
      return await fs.pathExists(gitDir);
    } catch (error) {
      return false;
    }
  }

  calculateRepositoryAge(firstCommit, lastCommit) {
    if (!firstCommit || !lastCommit) return null;
    
    const first = new Date(firstCommit);
    const last = new Date(lastCommit);
    const diffMs = last - first;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return {
      days,
      months: Math.floor(days / 30),
      years: Math.floor(days / 365)
    };
  }

  isBranchActive(lastCommitDate) {
    if (!lastCommitDate) return false;
    
    const lastCommit = new Date(lastCommitDate);
    const now = new Date();
    const diffDays = (now - lastCommit) / (1000 * 60 * 60 * 24);
    
    return diffDays <= 30; // Active if commits in last 30 days
  }

  calculateActivePeriod(firstCommit, lastCommit) {
    if (!firstCommit || !lastCommit) return null;
    
    const first = new Date(firstCommit);
    const last = new Date(lastCommit);
    const diffMs = last - first;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return `${days} days`;
  }

  extractNumber(text, regex) {
    const match = text.match(regex);
    return match ? parseInt(match[1]) : 0;
  }

  getFileType(extension) {
    const typeMap = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.jsx': 'React',
      '.tsx': 'React TypeScript',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.c': 'C',
      '.cpp': 'C++',
      '.css': 'CSS',
      '.html': 'HTML',
      '.md': 'Markdown',
      '.json': 'JSON',
      '.yml': 'YAML',
      '.yaml': 'YAML',
      '.xml': 'XML',
      '.sh': 'Shell',
      '.sql': 'SQL'
    };
    
    return typeMap[extension] || 'Other';
  }

  groupChangesByType(fileChanges) {
    const grouped = {};
    fileChanges.forEach(change => {
      if (!grouped[change.fileType]) {
        grouped[change.fileType] = { files: 0, changes: 0 };
      }
      grouped[change.fileType].files++;
      grouped[change.fileType].changes += change.changeCount;
    });
    return grouped;
  }

  getDayName(dayNum) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum] || 'Unknown';
  }

  /**
   * Cache management
   */
  
  getCacheKey(projectName, options) {
    const optionsStr = JSON.stringify(options);
    return crypto.createHash('md5').update(`${projectName}-${optionsStr}`).digest('hex');
  }

  async getCachedReport(cacheKey) {
    try {
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      
      if (!await fs.pathExists(cacheFile)) {
        return null;
      }

      const stats = await fs.stat(cacheFile);
      const isExpired = (Date.now() - stats.mtime.getTime()) > this.cacheTTL;
      
      if (isExpired) {
        await fs.remove(cacheFile);
        return null;
      }

      const cached = await fs.readJson(cacheFile);
      return cached;
    } catch (error) {
      console.warn('Warning: Could not read cached report:', error.message);
      return null;
    }
  }

  async cacheReport(cacheKey, report) {
    try {
      await fs.ensureDir(this.cacheDir);
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeJson(cacheFile, report, { spaces: 2 });
    } catch (error) {
      console.warn('Warning: Could not cache report:', error.message);
    }
  }

  async clearCache() {
    try {
      if (await fs.pathExists(this.cacheDir)) {
        await fs.emptyDir(this.cacheDir);
        console.log('✅ Report cache cleared');
      }
    } catch (error) {
      console.warn('Warning: Could not clear cache:', error.message);
    }
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Git History Report - ${report.projectName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body class="bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Git History Report</h1>
            <div class="flex items-center space-x-4 text-sm text-gray-600">
                <span>📁 ${report.projectName}</span>
                <span>📅 Generated: ${new Date(report.generatedAt).toLocaleString()}</span>
                <span>📊 ${report.summary.totalCommits} commits</span>
                <span>🌿 ${report.summary.totalBranches} branches</span>
            </div>
        </header>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow p-6">
                <div class="text-2xl font-bold text-blue-600">${report.summary.totalCommits}</div>
                <div class="text-sm text-gray-600">Total Commits</div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                <div class="text-2xl font-bold text-green-600">${report.summary.totalBranches}</div>
                <div class="text-sm text-gray-600">Total Branches</div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                <div class="text-2xl font-bold text-purple-600">${report.contributors.length}</div>
                <div class="text-sm text-gray-600">Contributors</div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                <div class="text-2xl font-bold text-orange-600">${report.locStatistics.current.total}</div>
                <div class="text-sm text-gray-600">Lines of Code</div>
            </div>
        </div>

        <!-- Mermaid Diagrams -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold mb-4">Branch Evolution</h3>
                <div class="mermaid">
                    ${report.mermaidDiagrams.branchEvolution}
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold mb-4">Contributor Distribution</h3>
                <div class="mermaid">
                    ${report.mermaidDiagrams.contributorFlow}
                </div>
            </div>
        </div>

        <!-- Recent Commits -->
        <div class="bg-white rounded-lg shadow mb-8">
            <div class="px-6 py-4 border-b">
                <h3 class="text-lg font-semibold">Recent Commits</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commit</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${report.commitHistory.slice(0, 10).map(commit => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                    ${commit.hash.substring(0, 8)}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${commit.author}
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-900">
                                    ${commit.subject}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${new Date(commit.date).toLocaleDateString()}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        mermaid.initialize({ startOnLoad: true, theme: 'default' });
    </script>
</body>
</html>`;

    return html;
  }
}

module.exports = GitHistoryGenerator;