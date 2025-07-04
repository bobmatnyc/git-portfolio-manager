/**
 * GitHub API Client
 *
 * Handles GitHub API integration for issue tracking
 */

const { Octokit } = require("@octokit/rest");
const { createTokenAuth } = require("@octokit/auth-token");

class GitHubClient {
  constructor(config = {}) {
    this.config = {
      token: config.token,
      baseUrl: config.baseUrl || "https://api.github.com",
      userAgent: config.userAgent || "portfolio-monitor",
      timeout: config.timeout || 10000,
      rateLimit: config.rateLimit || { requests: 60, retryAfter: 60000 },
      issuesOptions: config.issuesOptions || {
        state: "open",
        sort: "updated",
        direction: "desc",
        perPage: 30,
      },
    };

    this.octokit = null;
    this.rateLimitRemaining = null;
    this.rateLimitResetTime = null;
    this.initialized = false;
  }

  /**
   * Initialize the GitHub client
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    const octokitConfig = {
      baseUrl: this.config.baseUrl,
      userAgent: this.config.userAgent,
      request: {
        timeout: this.config.timeout,
      },
    };

    // Add authentication if token is provided
    if (this.config.token) {
      octokitConfig.auth = this.config.token;
    }

    this.octokit = new Octokit(octokitConfig);
    this.initialized = true;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated() {
    return !!this.config.token;
  }

  /**
   * Get rate limit status
   */
  async getRateLimit() {
    await this.initialize();

    try {
      const response = await this.octokit.rest.rateLimit.get();
      return response.data;
    } catch (error) {
      console.warn("Failed to get rate limit:", error.message);
      return null;
    }
  }

  /**
   * Parse GitHub repository from remote URL
   */
  parseRepositoryFromUrl(remoteUrl) {
    if (!remoteUrl) {
      return null;
    }

    // Handle various GitHub URL formats
    const patterns = [
      // SSH format: git@github.com:owner/repo.git
      /git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
      // HTTPS format: https://github.com/owner/repo.git
      /https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
      // HTTP format: http://github.com/owner/repo.git
      /http:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
    ];

    for (const pattern of patterns) {
      const match = remoteUrl.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
        };
      }
    }

    return null;
  }

  /**
   * Check if repository exists and is accessible
   */
  async checkRepository(owner, repo) {
    await this.initialize();

    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return {
        exists: true,
        accessible: true,
        private: response.data.private,
        hasIssues: response.data.has_issues,
        openIssues: response.data.open_issues_count,
        repository: response.data,
      };
    } catch (error) {
      if (error.status === 404) {
        return {
          exists: false,
          accessible: false,
          error: "Repository not found or not accessible",
        };
      }
      if (error.status === 403) {
        return {
          exists: true,
          accessible: false,
          error: "Repository access forbidden - check authentication",
        };
      }
      return {
        exists: false,
        accessible: false,
        error: `API error: ${error.message}`,
      };
    }
  }

  /**
   * Fetch issues for a repository
   */
  async getIssues(owner, repo, options = {}) {
    await this.initialize();

    const params = {
      owner,
      repo,
      ...this.config.issuesOptions,
      ...options,
    };

    try {
      const response = await this.octokit.rest.issues.listForRepo(params);

      // Update rate limit info
      this.updateRateLimitInfo(response.headers);

      return {
        success: true,
        issues: response.data.map((issue) => this.formatIssue(issue)),
        pagination: this.extractPaginationInfo(response.headers),
        rateLimit: {
          remaining: this.rateLimitRemaining,
          resetTime: this.rateLimitResetTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.status,
        issues: [],
      };
    }
  }

  /**
   * Get all issues with pagination
   */
  async getAllIssues(owner, repo, options = {}) {
    await this.initialize();

    const allIssues = [];
    let page = 1;
    const perPage = options.perPage || this.config.issuesOptions.perPage;

    while (true) {
      const result = await this.getIssues(owner, repo, { ...options, page, per_page: perPage });

      if (!result.success) {
        return result;
      }

      allIssues.push(...result.issues);

      // Check if there are more pages
      if (result.issues.length < perPage) {
        break;
      }

      page++;

      // Safety limit to prevent infinite loops
      if (page > 100) {
        console.warn(`Stopped fetching issues at page ${page} for ${owner}/${repo}`);
        break;
      }
    }

    return {
      success: true,
      issues: allIssues,
      totalCount: allIssues.length,
      rateLimit: {
        remaining: this.rateLimitRemaining,
        resetTime: this.rateLimitResetTime,
      },
    };
  }

  /**
   * Format issue data for consistent structure
   */
  formatIssue(issue) {
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      labels: issue.labels.map((label) => ({
        name: label.name,
        color: label.color,
        description: label.description,
      })),
      assignee: issue.assignee
        ? {
            login: issue.assignee.login,
            avatar_url: issue.assignee.avatar_url,
          }
        : null,
      assignees: issue.assignees.map((assignee) => ({
        login: assignee.login,
        avatar_url: assignee.avatar_url,
      })),
      milestone: issue.milestone
        ? {
            title: issue.milestone.title,
            description: issue.milestone.description,
            state: issue.milestone.state,
            due_on: issue.milestone.due_on,
          }
        : null,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      closed_at: issue.closed_at,
      html_url: issue.html_url,
      user: {
        login: issue.user.login,
        avatar_url: issue.user.avatar_url,
      },
      comments: issue.comments,
      isPullRequest: !!issue.pull_request,
    };
  }

  /**
   * Update rate limit information from response headers
   */
  updateRateLimitInfo(headers) {
    this.rateLimitRemaining = Number.parseInt(headers["x-ratelimit-remaining"]) || null;
    this.rateLimitResetTime = Number.parseInt(headers["x-ratelimit-reset"]) * 1000 || null;
  }

  /**
   * Extract pagination info from response headers
   */
  extractPaginationInfo(headers) {
    const linkHeader = headers.link;
    if (!linkHeader) {
      return {};
    }

    const links = {};
    const parts = linkHeader.split(",");

    for (const part of parts) {
      const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match) {
        links[match[2]] = match[1];
      }
    }

    return links;
  }

  /**
   * Check if rate limit is exhausted
   */
  isRateLimited() {
    if (this.rateLimitRemaining === null) {
      return false;
    }

    return this.rateLimitRemaining <= 0;
  }

  /**
   * Get time until rate limit resets
   */
  getRateLimitResetTime() {
    if (!this.rateLimitResetTime) {
      return null;
    }

    return Math.max(0, this.rateLimitResetTime - Date.now());
  }

  /**
   * Wait for rate limit to reset
   */
  async waitForRateLimit() {
    const resetTime = this.getRateLimitResetTime();
    if (resetTime > 0) {
      console.log(`Rate limit exceeded. Waiting ${Math.ceil(resetTime / 1000)} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, resetTime + 1000));
    }
  }

  /**
   * Create a new issue in repository
   */
  async createIssue(owner, repo, issueData) {
    await this.initialize();

    const params = {
      owner,
      repo,
      title: issueData.title,
      body: issueData.body || '',
      labels: issueData.labels || [],
      assignees: issueData.assignees || [],
      milestone: issueData.milestone || null
    };

    try {
      const response = await this.octokit.rest.issues.create(params);
      this.updateRateLimitInfo(response.headers);
      
      return {
        success: true,
        issue: this.formatIssue(response.data),
        rateLimit: {
          remaining: this.rateLimitRemaining,
          resetTime: this.rateLimitResetTime,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.status
      };
    }
  }

  /**
   * Update an existing issue
   */
  async updateIssue(owner, repo, issueNumber, updates) {
    await this.initialize();

    const params = {
      owner,
      repo,
      issue_number: issueNumber,
      ...updates
    };

    try {
      const response = await this.octokit.rest.issues.update(params);
      this.updateRateLimitInfo(response.headers);
      
      return {
        success: true,
        issue: this.formatIssue(response.data),
        rateLimit: {
          remaining: this.rateLimitRemaining,
          resetTime: this.rateLimitResetTime,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.status
      };
    }
  }

  /**
   * Get authentication status and user info
   */
  async getAuthenticatedUser() {
    if (!this.isAuthenticated()) {
      return {
        authenticated: false,
        error: "No authentication token provided",
      };
    }

    await this.initialize();

    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      return {
        authenticated: true,
        user: {
          login: response.data.login,
          name: response.data.name,
          email: response.data.email,
          avatar_url: response.data.avatar_url,
          type: response.data.type,
        },
      };
    } catch (error) {
      return {
        authenticated: false,
        error: error.message,
      };
    }
  }
}

module.exports = GitHubClient;
