/**
 * TrackDown Project Manager
 * 
 * Business Purpose: JIRA-like project management interface for TrackDown tickets
 * Features:
 * - Multi-project ticket management
 * - Kanban board interface
 * - Advanced filtering and search
 * - Sprint management
 * - GitHub integration
 * - Analytics and reporting
 */

const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

class TrackDownManager {
  constructor(options = {}) {
    this.config = options.config || {};
    this.projectsBasePath = options.projectsBasePath || process.cwd();
    this.githubClient = options.githubClient || null;
    this.syncService = options.syncService || null;
    
    // Project cache
    this.projectsCache = new Map();
    this.ticketsCache = new Map();
    this.lastCacheUpdate = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    console.log('📋 TrackDown Project Manager initialized');
  }

  /**
   * Initialize the TrackDown manager
   */
  async initialize() {
    try {
      await this.discoverProjects();
      await this.loadAllTickets();
      console.log('✅ TrackDown Project Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize TrackDown Manager:', error);
      throw error;
    }
  }

  /**
   * Discover all TrackDown projects
   */
  async discoverProjects() {
    console.log('🔍 Discovering TrackDown projects...');
    
    try {
      // Find all trackdown directories
      const trackdownDirs = await glob('**/trackdown', {
        cwd: this.projectsBasePath,
        ignore: ['**/node_modules/**', '**/.git/**'],
        onlyDirectories: true,
        absolute: true
      });

      this.projectsCache.clear();
      
      for (const trackdownDir of trackdownDirs) {
        const projectPath = path.dirname(trackdownDir);
        const projectName = path.basename(projectPath);
        const backlogPath = path.join(trackdownDir, 'BACKLOG.md');
        
        if (await fs.pathExists(backlogPath)) {
          const project = await this.loadProjectMetadata(projectPath, trackdownDir);
          this.projectsCache.set(projectName, project);
        }
      }

      console.log(`📋 Discovered ${this.projectsCache.size} TrackDown projects`);
      this.lastCacheUpdate = Date.now();
      
      return Array.from(this.projectsCache.values());
    } catch (error) {
      console.error('❌ Failed to discover projects:', error);
      throw error;
    }
  }

  /**
   * Load project metadata
   */
  async loadProjectMetadata(projectPath, trackdownDir) {
    const projectName = path.basename(projectPath);
    const backlogPath = path.join(trackdownDir, 'BACKLOG.md');
    
    // Load basic project info
    const project = {
      name: projectName,
      path: projectPath,
      trackdownPath: trackdownDir,
      backlogPath: backlogPath,
      description: '',
      repository: null,
      lastModified: null,
      ticketCount: 0,
      statusCounts: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 0,
        CANCELED: 0
      }
    };

    try {
      // Get file stats
      const stats = await fs.stat(backlogPath);
      project.lastModified = stats.mtime;

      // Try to extract description from README
      const readmePaths = [
        path.join(projectPath, 'README.md'),
        path.join(projectPath, 'readme.md'),
        path.join(projectPath, 'README.txt')
      ];

      for (const readmePath of readmePaths) {
        if (await fs.pathExists(readmePath)) {
          const content = await fs.readFile(readmePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          project.description = lines.slice(0, 3).join(' ').substring(0, 200);
          break;
        }
      }

      // Try to detect repository info
      const gitConfigPath = path.join(projectPath, '.git', 'config');
      if (await fs.pathExists(gitConfigPath)) {
        const gitConfig = await fs.readFile(gitConfigPath, 'utf8');
        const remoteMatch = gitConfig.match(/url = (.+)/);
        if (remoteMatch) {
          project.repository = remoteMatch[1];
        }
      }

      return project;
    } catch (error) {
      console.warn(`Warning: Failed to load metadata for ${projectName}:`, error.message);
      return project;
    }
  }

  /**
   * Load all tickets from all projects
   */
  async loadAllTickets() {
    console.log('📝 Loading all TrackDown tickets...');
    
    this.ticketsCache.clear();
    let totalTickets = 0;

    for (const [projectName, project] of this.projectsCache) {
      try {
        const tickets = await this.loadProjectTickets(projectName);
        this.ticketsCache.set(projectName, tickets);
        
        // Update project stats
        project.ticketCount = tickets.length;
        project.statusCounts = this.calculateStatusCounts(tickets);
        
        totalTickets += tickets.length;
      } catch (error) {
        console.warn(`Warning: Failed to load tickets for ${projectName}:`, error.message);
        this.ticketsCache.set(projectName, []);
      }
    }

    console.log(`📊 Loaded ${totalTickets} tickets from ${this.projectsCache.size} projects`);
  }

  /**
   * Load tickets for a specific project
   */
  async loadProjectTickets(projectName) {
    const project = this.projectsCache.get(projectName);
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }

    try {
      if (!await fs.pathExists(project.backlogPath)) {
        return [];
      }

      const content = await fs.readFile(project.backlogPath, 'utf8');
      const tickets = this.parseBacklogContent(content, projectName);
      
      return tickets;
    } catch (error) {
      console.error(`Failed to load tickets for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Parse backlog content into tickets
   */
  parseBacklogContent(content, projectName) {
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

      // Parse ticket headers (## ID: Title or ### ID: Title)
      const ticketMatch = line.match(/^#{2,3}\s*([\w-]+[-\d]+):\s*(.+)$/);
      if (ticketMatch) {
        // Save previous ticket
        if (currentTicket) {
          currentTicket.description = currentTicket.description.trim();
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
          assignee: null,
          project: projectName,
          createdAt: null,
          updatedAt: null,
          githubUrl: null,
          githubNumber: null,
          type: 'trackdown',
          storyPoints: null,
          epic: null,
          sprint: null
        };
        continue;
      }

      if (!currentTicket) continue;

      // Parse metadata fields
      const statusMatch = line.match(/^\*\*Status\*\*:\s*(.+)$/);
      if (statusMatch) {
        currentTicket.status = statusMatch[1].trim();
        continue;
      }

      const priorityMatch = line.match(/^\*\*Priority\*\*:\s*(.+)$/);
      if (priorityMatch) {
        currentTicket.priority = priorityMatch[1].trim();
        continue;
      }

      const assigneeMatch = line.match(/^\*\*Assignee\*\*:\s*(.+)$/);
      if (assigneeMatch) {
        currentTicket.assignee = assigneeMatch[1].trim();
        continue;
      }

      const labelsMatch = line.match(/^\*\*Labels\*\*:\s*(.+)$/);
      if (labelsMatch) {
        currentTicket.labels = labelsMatch[1].split(',').map(l => l.trim()).filter(Boolean);
        continue;
      }

      const githubMatch = line.match(/^\*\*GitHub\*\*:\s*\[#(\d+)\]\((.+)\)$/);
      if (githubMatch) {
        currentTicket.githubNumber = parseInt(githubMatch[1]);
        currentTicket.githubUrl = githubMatch[2];
        continue;
      }

      const storyPointsMatch = line.match(/^\*\*Story Points\*\*:\s*(\d+)$/);
      if (storyPointsMatch) {
        currentTicket.storyPoints = parseInt(storyPointsMatch[1]);
        continue;
      }

      const epicMatch = line.match(/^\*\*Epic\*\*:\s*(.+)$/);
      if (epicMatch) {
        currentTicket.epic = epicMatch[1].trim();
        continue;
      }

      const sprintMatch = line.match(/^\*\*Sprint\*\*:\s*(.+)$/);
      if (sprintMatch) {
        currentTicket.sprint = sprintMatch[1].trim();
        continue;
      }

      // Collect description lines
      if (line.trim() && !line.startsWith('**') && !line.startsWith('---')) {
        currentTicket.description += line + '\n';
      }
    }

    // Add final ticket
    if (currentTicket) {
      currentTicket.description = currentTicket.description.trim();
      tickets.push(currentTicket);
    }

    return tickets;
  }

  /**
   * Calculate status counts for tickets
   */
  calculateStatusCounts(tickets) {
    const counts = {
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
      CANCELED: 0
    };

    tickets.forEach(ticket => {
      if (counts.hasOwnProperty(ticket.status)) {
        counts[ticket.status]++;
      }
    });

    return counts;
  }

  /**
   * Get all projects with summary data
   */
  async getProjects() {
    if (this.needsCacheRefresh()) {
      await this.discoverProjects();
      await this.loadAllTickets();
    }

    return Array.from(this.projectsCache.values());
  }

  /**
   * Get all tickets with filtering options
   */
  async getTickets(filters = {}) {
    if (this.needsCacheRefresh()) {
      await this.loadAllTickets();
    }

    let allTickets = [];
    
    // Collect tickets from specified projects or all projects
    if (filters.projects && filters.projects.length > 0) {
      for (const projectName of filters.projects) {
        const tickets = this.ticketsCache.get(projectName) || [];
        allTickets.push(...tickets);
      }
    } else {
      for (const tickets of this.ticketsCache.values()) {
        allTickets.push(...tickets);
      }
    }

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      allTickets = allTickets.filter(ticket => filters.status.includes(ticket.status));
    }

    if (filters.priority && filters.priority.length > 0) {
      allTickets = allTickets.filter(ticket => filters.priority.includes(ticket.priority));
    }

    if (filters.assignee) {
      allTickets = allTickets.filter(ticket => 
        ticket.assignee && ticket.assignee.toLowerCase().includes(filters.assignee.toLowerCase())
      );
    }

    if (filters.labels && filters.labels.length > 0) {
      allTickets = allTickets.filter(ticket =>
        filters.labels.some(label => ticket.labels.includes(label))
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      allTickets = allTickets.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm) ||
        ticket.description.toLowerCase().includes(searchTerm) ||
        ticket.id.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.epic) {
      allTickets = allTickets.filter(ticket => ticket.epic === filters.epic);
    }

    if (filters.sprint) {
      allTickets = allTickets.filter(ticket => ticket.sprint === filters.sprint);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'updatedAt';
    const sortOrder = filters.sortOrder || 'desc';
    
    allTickets.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      if (sortBy === 'priority') {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        valueA = priorityOrder[valueA] || 0;
        valueB = priorityOrder[valueB] || 0;
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return allTickets;
  }

  /**
   * Get ticket by ID and project
   */
  async getTicket(projectName, ticketId) {
    const tickets = this.ticketsCache.get(projectName) || [];
    return tickets.find(ticket => ticket.id === ticketId);
  }

  /**
   * Create a new ticket
   */
  async createTicket(projectName, ticketData) {
    const project = this.projectsCache.get(projectName);
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }

    // Generate ticket ID if not provided
    if (!ticketData.id) {
      const tickets = this.ticketsCache.get(projectName) || [];
      const maxNumber = tickets.reduce((max, ticket) => {
        const match = ticket.id.match(/\d+$/);
        return match ? Math.max(max, parseInt(match[0])) : max;
      }, 0);
      ticketData.id = `${projectName.toUpperCase()}-${String(maxNumber + 1).padStart(3, '0')}`;
    }

    const ticket = {
      id: ticketData.id,
      title: ticketData.title,
      description: ticketData.description || '',
      status: ticketData.status || 'TODO',
      priority: ticketData.priority || 'MEDIUM',
      labels: ticketData.labels || [],
      assignee: ticketData.assignee || null,
      project: projectName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'trackdown',
      storyPoints: ticketData.storyPoints || null,
      epic: ticketData.epic || null,
      sprint: ticketData.sprint || null
    };

    // Add to cache
    const tickets = this.ticketsCache.get(projectName) || [];
    tickets.push(ticket);
    this.ticketsCache.set(projectName, tickets);

    // Save to file
    await this.saveProjectTickets(projectName);

    console.log(`✅ Created ticket ${ticket.id} in project ${projectName}`);
    return ticket;
  }

  /**
   * Update a ticket
   */
  async updateTicket(projectName, ticketId, updates) {
    const tickets = this.ticketsCache.get(projectName) || [];
    const ticketIndex = tickets.findIndex(ticket => ticket.id === ticketId);
    
    if (ticketIndex === -1) {
      throw new Error(`Ticket ${ticketId} not found in project ${projectName}`);
    }

    // Update ticket
    const ticket = tickets[ticketIndex];
    Object.assign(ticket, updates, {
      updatedAt: new Date().toISOString()
    });

    // Save to file
    await this.saveProjectTickets(projectName);

    console.log(`✅ Updated ticket ${ticketId} in project ${projectName}`);
    return ticket;
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(projectName, ticketId) {
    const tickets = this.ticketsCache.get(projectName) || [];
    const ticketIndex = tickets.findIndex(ticket => ticket.id === ticketId);
    
    if (ticketIndex === -1) {
      throw new Error(`Ticket ${ticketId} not found in project ${projectName}`);
    }

    // Remove from cache
    tickets.splice(ticketIndex, 1);

    // Save to file
    await this.saveProjectTickets(projectName);

    console.log(`✅ Deleted ticket ${ticketId} from project ${projectName}`);
  }

  /**
   * Save project tickets to backlog file
   */
  async saveProjectTickets(projectName) {
    const project = this.projectsCache.get(projectName);
    const tickets = this.ticketsCache.get(projectName) || [];
    
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }

    const content = this.formatBacklogContent(tickets, projectName);
    await fs.writeFile(project.backlogPath, content);
    
    // Update project stats
    project.ticketCount = tickets.length;
    project.statusCounts = this.calculateStatusCounts(tickets);
  }

  /**
   * Format tickets into backlog content
   */
  formatBacklogContent(tickets, projectName) {
    let content = `# ${projectName} Project Backlog\n\n`;
    content += '> TrackDown Project Management\n\n';

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

        if (ticket.storyPoints) {
          content += `**Story Points**: ${ticket.storyPoints}\n`;
        }

        if (ticket.epic) {
          content += `**Epic**: ${ticket.epic}\n`;
        }

        if (ticket.sprint) {
          content += `**Sprint**: ${ticket.sprint}\n`;
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

    content += `\n*Last updated: ${new Date().toISOString()}*\n`;
    return content;
  }

  /**
   * Get analytics data
   */
  async getAnalytics(filters = {}) {
    const tickets = await this.getTickets(filters);
    const projects = await this.getProjects();

    const analytics = {
      totalTickets: tickets.length,
      totalProjects: projects.length,
      statusDistribution: this.calculateStatusCounts(tickets),
      priorityDistribution: {
        HIGH: tickets.filter(t => t.priority === 'HIGH').length,
        MEDIUM: tickets.filter(t => t.priority === 'MEDIUM').length,
        LOW: tickets.filter(t => t.priority === 'LOW').length
      },
      projectDistribution: {},
      assigneeDistribution: {},
      recentActivity: [],
      burndownData: []
    };

    // Project distribution
    projects.forEach(project => {
      analytics.projectDistribution[project.name] = project.ticketCount;
    });

    // Assignee distribution
    tickets.forEach(ticket => {
      if (ticket.assignee) {
        analytics.assigneeDistribution[ticket.assignee] = 
          (analytics.assigneeDistribution[ticket.assignee] || 0) + 1;
      }
    });

    // Recent activity (tickets updated in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    analytics.recentActivity = tickets
      .filter(ticket => ticket.updatedAt && new Date(ticket.updatedAt) > weekAgo)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 20);

    return analytics;
  }

  /**
   * Check if cache needs refresh
   */
  needsCacheRefresh() {
    return !this.lastCacheUpdate || 
           (Date.now() - this.lastCacheUpdate) > this.cacheTimeout;
  }

  /**
   * Force cache refresh
   */
  async refreshCache() {
    await this.discoverProjects();
    await this.loadAllTickets();
  }

  /**
   * Get available epics across all projects
   */
  async getEpics() {
    const tickets = await this.getTickets();
    const epics = new Set();
    
    tickets.forEach(ticket => {
      if (ticket.epic) {
        epics.add(ticket.epic);
      }
    });

    return Array.from(epics).sort();
  }

  /**
   * Get available sprints across all projects
   */
  async getSprints() {
    const tickets = await this.getTickets();
    const sprints = new Set();
    
    tickets.forEach(ticket => {
      if (ticket.sprint) {
        sprints.add(ticket.sprint);
      }
    });

    return Array.from(sprints).sort();
  }

  /**
   * Get available labels across all projects
   */
  async getLabels() {
    const tickets = await this.getTickets();
    const labels = new Set();
    
    tickets.forEach(ticket => {
      ticket.labels.forEach(label => labels.add(label));
    });

    return Array.from(labels).sort();
  }
}

module.exports = TrackDownManager;