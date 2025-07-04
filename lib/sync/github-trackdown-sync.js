/**
 * GitHub ↔ TrackDown Synchronization Service
 * 
 * Business Purpose: Bidirectional sync between GitHub Issues and TrackDown tickets
 * Features:
 * - Import GitHub issues as TrackDown tickets
 * - Export TrackDown tickets as GitHub issues  
 * - Bidirectional synchronization
 * - Conflict resolution
 * - Status mapping and sync
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class GitHubTrackDownSync {
  constructor(options = {}) {
    this.config = options.config || {};
    this.githubClient = options.githubClient || null;
    this.projectPath = options.projectPath || process.cwd();
    this.trackdownPath = path.join(this.projectPath, 'trackdown');
    this.backlogPath = path.join(this.trackdownPath, 'BACKLOG.md');
    
    // Status mappings
    this.statusMappings = {
      github: {
        'open': 'TODO',
        'closed': 'DONE',
        'in_progress': 'IN_PROGRESS'
      },
      trackdown: {
        'TODO': 'open',
        'IN_PROGRESS': 'open', 
        'DONE': 'closed',
        'CANCELED': 'closed'
      }
    };

    console.log('🔄 GitHub ↔ TrackDown Sync Service initialized');
  }

  /**
   * Sync GitHub issues to TrackDown
   */
  async syncGitHubToTrackDown(options = {}) {
    if (!this.githubClient) {
      throw new Error('GitHub client not configured');
    }

    console.log('📥 Syncing GitHub issues to TrackDown...');
    
    try {
      // Get GitHub issues
      const issues = await this.fetchGitHubIssues(options);
      console.log(`Found ${issues.length} GitHub issues`);

      // Parse existing TrackDown backlog
      const existingTickets = await this.parseTrackDownBacklog();
      
      // Create mapping of GitHub issues to TrackDown tickets
      const syncResults = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };

      for (const issue of issues) {
        try {
          const result = await this.importGitHubIssue(issue, existingTickets);
          syncResults[result]++;
        } catch (error) {
          console.error(`Error syncing issue #${issue.number}:`, error.message);
          syncResults.errors.push({
            issue: issue.number,
            error: error.message
          });
        }
      }

      // Save updated backlog
      await this.saveTrackDownBacklog(existingTickets);
      
      console.log('✅ GitHub → TrackDown sync completed:', syncResults);
      return syncResults;

    } catch (error) {
      console.error('❌ GitHub → TrackDown sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync TrackDown tickets to GitHub
   */
  async syncTrackDownToGitHub(options = {}) {
    if (!this.githubClient) {
      throw new Error('GitHub client not configured');
    }

    console.log('📤 Syncing TrackDown tickets to GitHub...');
    
    try {
      // Parse TrackDown backlog
      const tickets = await this.parseTrackDownBacklog();
      
      // Get existing GitHub issues
      const existingIssues = await this.fetchGitHubIssues({ state: 'all' });
      const issueMap = new Map(existingIssues.map(issue => [
        this.extractTrackDownId(issue.body || ''),
        issue
      ]));

      const syncResults = {
        exported: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };

      for (const ticket of tickets) {
        try {
          if (!ticket.id || ticket.type === 'github_import') {
            syncResults.skipped++;
            continue;
          }

          const existingIssue = issueMap.get(ticket.id);
          let result;
          
          if (existingIssue) {
            result = await this.updateGitHubIssue(existingIssue, ticket);
          } else {
            result = await this.exportTrackDownTicket(ticket);
          }
          
          syncResults[result]++;
        } catch (error) {
          console.error(`Error syncing ticket ${ticket.id}:`, error.message);
          syncResults.errors.push({
            ticket: ticket.id,
            error: error.message
          });
        }
      }

      console.log('✅ TrackDown → GitHub sync completed:', syncResults);
      return syncResults;

    } catch (error) {
      console.error('❌ TrackDown → GitHub sync failed:', error);
      throw error;
    }
  }

  /**
   * Bidirectional sync
   */
  async bidirectionalSync(options = {}) {
    console.log('🔄 Starting bidirectional GitHub ↔ TrackDown sync...');
    
    const results = {
      githubToTrackdown: null,
      trackdownToGithub: null,
      timestamp: new Date().toISOString()
    };

    try {
      // First sync GitHub → TrackDown
      results.githubToTrackdown = await this.syncGitHubToTrackDown(options);
      
      // Then sync TrackDown → GitHub 
      results.trackdownToGithub = await this.syncTrackDownToGitHub(options);
      
      console.log('✅ Bidirectional sync completed successfully');
      return results;

    } catch (error) {
      console.error('❌ Bidirectional sync failed:', error);
      results.error = error.message;
      throw error;
    }
  }

  /**
   * Fetch GitHub issues
   */
  async fetchGitHubIssues(options = {}) {
    try {
      // Get repository info from config
      const owner = this.config.github?.owner;
      const repo = this.config.github?.repo;
      
      if (!owner || !repo) {
        throw new Error('GitHub owner and repo must be configured');
      }

      const result = await this.githubClient.getAllIssues(owner, repo, options);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.issues.filter(issue => !issue.isPullRequest); // Exclude PRs
    } catch (error) {
      console.error('Failed to fetch GitHub issues:', error);
      throw error;
    }
  }

  /**
   * Import GitHub issue as TrackDown ticket
   */
  async importGitHubIssue(issue, existingTickets) {
    const trackdownId = `GH-${issue.number}`;
    const existingIndex = existingTickets.findIndex(t => t.id === trackdownId);
    
    const ticket = {
      id: trackdownId,
      title: issue.title,
      description: issue.body || '',
      status: this.statusMappings.github[issue.state] || 'TODO',
      priority: this.extractPriorityFromLabels(issue.labels),
      assignee: issue.assignee?.login || null,
      labels: issue.labels.map(l => l.name),
      githubUrl: issue.html_url,
      githubNumber: issue.number,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      type: 'github_import',
      syncedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      // Update existing ticket
      const existing = existingTickets[existingIndex];
      if (new Date(issue.updated_at) > new Date(existing.updatedAt || 0)) {
        existingTickets[existingIndex] = { ...existing, ...ticket };
        return 'updated';
      }
      return 'skipped';
    } else {
      // Add new ticket
      existingTickets.push(ticket);
      return 'imported';
    }
  }

  /**
   * Export TrackDown ticket as GitHub issue
   */
  async exportTrackDownTicket(ticket) {
    const owner = this.config.github?.owner;
    const repo = this.config.github?.repo;
    
    if (!owner || !repo) {
      throw new Error('GitHub owner and repo must be configured');
    }

    const issueData = {
      title: ticket.title,
      body: this.formatTicketForGitHub(ticket),
      labels: ticket.labels || [],
      assignees: ticket.assignee ? [ticket.assignee] : []
    };

    try {
      const result = await this.githubClient.createIssue(owner, repo, issueData);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log(`✅ Exported ticket ${ticket.id} as GitHub issue #${result.issue.number}`);
      return 'exported';
    } catch (error) {
      console.error(`Failed to export ticket ${ticket.id}:`, error);
      throw error;
    }
  }

  /**
   * Update GitHub issue from TrackDown ticket
   */
  async updateGitHubIssue(issue, ticket) {
    const owner = this.config.github?.owner;
    const repo = this.config.github?.repo;
    
    if (!owner || !repo) {
      throw new Error('GitHub owner and repo must be configured');
    }

    const updates = {
      title: ticket.title,
      body: this.formatTicketForGitHub(ticket),
      state: this.statusMappings.trackdown[ticket.status] || 'open',
      labels: ticket.labels || []
    };

    // Only update if there are actual changes
    const hasChanges = issue.title !== updates.title ||
                      issue.body !== updates.body ||
                      issue.state !== updates.state;

    if (!hasChanges) {
      return 'skipped';
    }

    try {
      const result = await this.githubClient.updateIssue(owner, repo, issue.number, updates);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log(`✅ Updated GitHub issue #${issue.number} from ticket ${ticket.id}`);
      return 'updated';
    } catch (error) {
      console.error(`Failed to update issue #${issue.number}:`, error);
      throw error;
    }
  }

  /**
   * Parse TrackDown backlog
   */
  async parseTrackDownBacklog() {
    if (!fs.existsSync(this.backlogPath)) {
      console.log('📝 Creating new TrackDown backlog file');
      await fs.ensureDir(this.trackdownPath);
      await fs.writeFile(this.backlogPath, this.getDefaultBacklogTemplate());
      return [];
    }

    try {
      const content = await fs.readFile(this.backlogPath, 'utf8');
      return this.parseBacklogContent(content);
    } catch (error) {
      console.error('Failed to parse TrackDown backlog:', error);
      return [];
    }
  }

  /**
   * Parse backlog content into tickets
   */
  parseBacklogContent(content) {
    const tickets = [];
    const lines = content.split('\n');
    let currentTicket = null;
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track code blocks
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Skip lines in code blocks
      if (inCodeBlock) {
        if (currentTicket) {
          currentTicket.description += line + '\n';
        }
        continue;
      }

      // Parse ticket headers
      const ticketMatch = line.match(/^##\s*(\w+-\d+):\s*(.+)$/);
      if (ticketMatch) {
        // Save previous ticket
        if (currentTicket) {
          tickets.push(currentTicket);
        }

        // Start new ticket
        currentTicket = {
          id: ticketMatch[1],
          title: ticketMatch[2].trim(),
          description: '',
          status: 'TODO',
          priority: 'MEDIUM',
          labels: [],
          type: 'trackdown'
        };
        continue;
      }

      // Parse status lines
      const statusMatch = line.match(/^\*\*Status\*\*:\s*(.+)$/);
      if (statusMatch && currentTicket) {
        currentTicket.status = statusMatch[1].trim();
        continue;
      }

      // Parse priority lines  
      const priorityMatch = line.match(/^\*\*Priority\*\*:\s*(.+)$/);
      if (priorityMatch && currentTicket) {
        currentTicket.priority = priorityMatch[1].trim();
        continue;
      }

      // Parse assignee lines
      const assigneeMatch = line.match(/^\*\*Assignee\*\*:\s*(.+)$/);
      if (assigneeMatch && currentTicket) {
        currentTicket.assignee = assigneeMatch[1].trim();
        continue;
      }

      // Parse labels lines
      const labelsMatch = line.match(/^\*\*Labels\*\*:\s*(.+)$/);
      if (labelsMatch && currentTicket) {
        currentTicket.labels = labelsMatch[1].split(',').map(l => l.trim()).filter(Boolean);
        continue;
      }

      // Collect description lines
      if (currentTicket && line.trim()) {
        currentTicket.description += line + '\n';
      }
    }

    // Add final ticket
    if (currentTicket) {
      tickets.push(currentTicket);
    }

    return tickets.map(ticket => ({
      ...ticket,
      description: ticket.description.trim()
    }));
  }

  /**
   * Save TrackDown backlog
   */
  async saveTrackDownBacklog(tickets) {
    const content = this.formatBacklogContent(tickets);
    await fs.writeFile(this.backlogPath, content);
    console.log(`💾 Saved ${tickets.length} tickets to TrackDown backlog`);
  }

  /**
   * Format backlog content
   */
  formatBacklogContent(tickets) {
    let content = '# Project Backlog\n\n';
    content += '> Synchronized with GitHub Issues\n\n';

    // Group tickets by status
    const statusGroups = {
      'TODO': tickets.filter(t => t.status === 'TODO'),
      'IN_PROGRESS': tickets.filter(t => t.status === 'IN_PROGRESS'),
      'DONE': tickets.filter(t => t.status === 'DONE'),
      'CANCELED': tickets.filter(t => t.status === 'CANCELED')
    };

    for (const [status, statusTickets] of Object.entries(statusGroups)) {
      if (statusTickets.length === 0) continue;

      content += `## ${status.replace('_', ' ')}\n\n`;
      
      for (const ticket of statusTickets) {
        content += `### ${ticket.id}: ${ticket.title}\n\n`;
        content += `**Status**: ${ticket.status}\n`;
        content += `**Priority**: ${ticket.priority}\n`;
        
        if (ticket.assignee) {
          content += `**Assignee**: ${ticket.assignee}\n`;
        }
        
        if (ticket.labels && ticket.labels.length > 0) {
          content += `**Labels**: ${ticket.labels.join(', ')}\n`;
        }

        if (ticket.githubUrl) {
          content += `**GitHub**: [#${ticket.githubNumber}](${ticket.githubUrl})\n`;
        }

        if (ticket.description) {
          content += '\n' + ticket.description + '\n';
        }

        content += '\n---\n\n';
      }
    }

    content += `\n*Last synchronized: ${new Date().toISOString()}*\n`;
    return content;
  }

  /**
   * Format ticket for GitHub issue body
   */
  formatTicketForGitHub(ticket) {
    let body = ticket.description || '';
    
    body += '\n\n---\n';
    body += `**TrackDown ID**: ${ticket.id}\n`;
    body += `**Status**: ${ticket.status}\n`;
    body += `**Priority**: ${ticket.priority}\n`;
    
    if (ticket.syncedAt) {
      body += `**Last Synced**: ${ticket.syncedAt}\n`;
    }

    return body;
  }

  /**
   * Extract TrackDown ID from GitHub issue body
   */
  extractTrackDownId(body) {
    const match = body.match(/\*\*TrackDown ID\*\*:\s*(\w+-\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract priority from GitHub labels
   */
  extractPriorityFromLabels(labels) {
    const priorityLabels = {
      'priority-high': 'HIGH',
      'priority-medium': 'MEDIUM', 
      'priority-low': 'LOW',
      'high': 'HIGH',
      'medium': 'MEDIUM',
      'low': 'LOW'
    };

    for (const label of labels) {
      const priority = priorityLabels[label.name.toLowerCase()];
      if (priority) return priority;
    }

    return 'MEDIUM';
  }

  /**
   * Get default backlog template
   */
  getDefaultBacklogTemplate() {
    return `# Project Backlog

> This file is synchronized with GitHub Issues

## TODO

*No pending tickets*

## IN PROGRESS

*No tickets in progress*

## DONE

*No completed tickets*

---

*Generated by GitHub ↔ TrackDown Sync Service*
`;
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const status = {
      hasGitHubToken: !!this.config.github?.token,
      hasTrackDownBacklog: fs.existsSync(this.backlogPath),
      lastSyncTime: null,
      ticketCounts: {
        trackdown: 0,
        github: 0
      }
    };

    try {
      if (status.hasTrackDownBacklog) {
        const tickets = await this.parseTrackDownBacklog();
        status.ticketCounts.trackdown = tickets.length;
        
        // Find last sync time
        const syncedTickets = tickets.filter(t => t.syncedAt);
        if (syncedTickets.length > 0) {
          status.lastSyncTime = Math.max(...syncedTickets.map(t => new Date(t.syncedAt)));
        }
      }

      if (status.hasGitHubToken && this.githubClient) {
        const issues = await this.fetchGitHubIssues({ state: 'all' });
        status.ticketCounts.github = issues.length;
      }
    } catch (error) {
      console.warn('Error getting sync status:', error.message);
    }

    return status;
  }
}

module.exports = GitHubTrackDownSync;