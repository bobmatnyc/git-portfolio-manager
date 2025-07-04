#!/usr/bin/env node
/**
 * Simple Discovery Script
 * Run project discovery and populate data directory for testing
 */

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function runDiscovery() {
  console.log('🔍 Starting project discovery...');
  
  const workingDir = process.cwd();
  const dataDir = path.join(workingDir, 'data');
  
  // Ensure data directory exists
  await fs.ensureDir(dataDir);
  
  // Simple project discovery - look for git repositories
  try {
    const { stdout } = await execAsync('find /Users/masa/Projects -type d -name ".git" -maxdepth 3 2>/dev/null | head -10');
    const gitRepos = stdout.trim().split('\n').filter(line => line.length > 0);
    
    console.log(`📋 Found ${gitRepos.length} git repositories`);
    
    for (const gitDir of gitRepos) {
      const projectDir = path.dirname(gitDir);
      const projectName = path.basename(projectDir);
      
      console.log(`📁 Processing ${projectName}...`);
      
      // Create project data directory
      const projectDataDir = path.join(dataDir, projectName);
      await fs.ensureDir(projectDataDir);
      
      // Get real Git information
      const gitInfo = await getGitInfo(projectDir);
      
      // Generate enhanced health data in expected format 
      const healthData = {
        name: projectName,
        path: projectDir,
        type: detectProjectType(projectDir),
        toolchain: detectToolchain(projectDir),
        status: gitInfo.hasUncommittedChanges ? 'attention' : 'healthy', // Server expects 'status' field
        priority: ['ai-power-rankings', 'matsuoka-com', 'scraper-engine'].includes(projectName) ? 'HIGH' : 'MEDIUM',
        lastActivity: gitInfo.lastCommitDate || new Date().toISOString(),
        timestamp: new Date().toISOString(),
        details: {
          status: gitInfo.hasUncommittedChanges ? 'attention' : 'healthy'
        },
        git: {
          currentBranch: gitInfo.currentBranch || 'main',
          commitsAhead: gitInfo.commitsAhead || 0,
          commitsBehind: gitInfo.commitsBehind || 0,
          branches: gitInfo.branchCount || 1,
          lastActivity: gitInfo.lastActivity || 'Unknown',
          uncommittedChanges: gitInfo.uncommittedChanges || 0
        },
        activity: {
          commits7d: gitInfo.commits7d || Math.floor(Math.random() * 20),
          linesAdded: Math.floor(Math.random() * 500) + 100,
          linesRemoved: Math.floor(Math.random() * 200) + 50
        }
      };
      
      // Generate activity data with real Git information
      const activityData = {
        name: projectName,
        path: projectDir,
        priority: healthData.priority,
        git: {
          hasGit: true,
          isGitRepo: true,
          currentBranch: gitInfo.currentBranch,
          commitsAhead: gitInfo.commitsAhead,
          commitsBehind: gitInfo.commitsBehind,
          branches: Array.from({length: gitInfo.branchCount}, (_, i) => `branch-${i}`), // Array format expected by server
          lastCommitDate: gitInfo.lastCommitDate,
          uncommittedChanges: gitInfo.uncommittedChanges,
          recentCommits: Array.from({length: gitInfo.commits7d}, (_, i) => ({id: `commit-${i}`, date: new Date()})),
          branch: gitInfo.currentBranch,
          hasRemote: true,
          remoteUrl: `https://github.com/user/${projectName}.git`,
          commitCount: gitInfo.commits7d + Math.floor(Math.random() * 100) + 20,
          lastCommit: {
            hash: 'abc123',
            message: 'Latest changes',
            author: 'Developer',
            date: gitInfo.lastCommitDate || new Date().toISOString()
          }
        },
        business: {
          revenueImpact: ['ai-power-rankings', 'matsuoka-com'].includes(projectName) ? 'DIRECT_REVENUE' : 'STRATEGIC_INVESTMENT'
        },
        filesystem: {
          recentlyModified: healthData.activity.linesAdded
        },
        metrics: {
          linesOfCode: Math.floor(Math.random() * 10000) + 1000,
          fileCount: Math.floor(Math.random() * 100) + 10,
          testCoverage: Math.floor(Math.random() * 100),
          dependencies: Math.floor(Math.random() * 50) + 5
        }
      };
      
      // Write files
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const healthFile = path.join(projectDataDir, `health-${timestamp}.json`);
      const activityFile = path.join(projectDataDir, `activity-${timestamp}.json`);
      
      await fs.writeJSON(healthFile, healthData);
      await fs.writeJSON(activityFile, activityData);
      
      console.log(`  ✅ Generated data for ${projectName}`);
    }
    
    console.log('🎉 Discovery complete!');
    
  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
  }
}

function detectProjectType(projectDir) {
  if (fs.existsSync(path.join(projectDir, 'package.json'))) return 'Node.js';
  if (fs.existsSync(path.join(projectDir, 'requirements.txt'))) return 'Python';
  if (fs.existsSync(path.join(projectDir, 'Cargo.toml'))) return 'Rust';
  if (fs.existsSync(path.join(projectDir, 'go.mod'))) return 'Go';
  return 'Unknown';
}

function detectToolchain(projectDir) {
  try {
    if (fs.existsSync(path.join(projectDir, 'package.json'))) {
      const pkg = fs.readJSONSync(path.join(projectDir, 'package.json'));
      if (pkg.dependencies?.next) return 'Next.js';
      if (pkg.dependencies?.react) return 'React';
      if (pkg.dependencies?.vue) return 'Vue.js';
      if (pkg.dependencies?.express) return 'Express';
      return 'Node.js';
    }
  } catch (error) {
    // ignore
  }
  return detectProjectType(projectDir);
}

async function getGitInfo(projectDir) {
  const info = {
    currentBranch: 'main',
    commitsAhead: 0,
    commitsBehind: 0,
    branchCount: 1,
    lastActivity: 'Unknown',
    uncommittedChanges: 0,
    hasUncommittedChanges: false,
    lastCommitDate: null,
    commits7d: 0
  };

  try {
    // Get current branch
    try {
      const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: projectDir });
      info.currentBranch = branch.trim();
    } catch (e) {
      // ignore
    }

    // Get branch count
    try {
      const { stdout: branches } = await execAsync('git branch -a | wc -l', { cwd: projectDir });
      info.branchCount = parseInt(branches.trim()) || 1;
    } catch (e) {
      // ignore
    }

    // Get uncommitted changes
    try {
      const { stdout: status } = await execAsync('git status --porcelain', { cwd: projectDir });
      info.uncommittedChanges = status.split('\n').filter(line => line.trim().length > 0).length;
      info.hasUncommittedChanges = info.uncommittedChanges > 0;
    } catch (e) {
      // ignore
    }

    // Get last commit info
    try {
      const { stdout: lastCommit } = await execAsync('git log -1 --format="%ci|%cr"', { cwd: projectDir });
      const [isoDate, relativeDate] = lastCommit.trim().split('|');
      info.lastCommitDate = new Date(isoDate).toISOString();
      info.lastActivity = relativeDate;
    } catch (e) {
      // ignore
    }

    // Get commits in last 7 days
    try {
      const { stdout: commits } = await execAsync('git rev-list --count --since="7 days ago" HEAD', { cwd: projectDir });
      info.commits7d = parseInt(commits.trim()) || 0;
    } catch (e) {
      // ignore
    }

    // Get ahead/behind info (if remote exists)
    try {
      const { stdout: remoteBranch } = await execAsync(`git rev-parse --abbrev-ref ${info.currentBranch}@{upstream}`, { cwd: projectDir });
      if (remoteBranch.trim()) {
        const { stdout: aheadBehind } = await execAsync(`git rev-list --left-right --count ${info.currentBranch}...${remoteBranch.trim()}`, { cwd: projectDir });
        const [ahead, behind] = aheadBehind.trim().split('\t').map(x => parseInt(x) || 0);
        info.commitsAhead = ahead;
        info.commitsBehind = behind;
      }
    } catch (e) {
      // ignore - no remote or other issue
    }

  } catch (error) {
    console.log(`  ⚠️ Git info error for ${path.basename(projectDir)}: ${error.message}`);
  }

  return info;
}

if (require.main === module) {
  runDiscovery().catch(console.error);
}

module.exports = { runDiscovery };