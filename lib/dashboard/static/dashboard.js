/**
 * Portfolio Monitoring Dashboard - JavaScript
 * 
 * Business Purpose: Interactive dashboard for portfolio project monitoring
 * Project Manager: Claude (AI Project Manager)
 * Epic: EP-002 Core Monitoring System
 * User Story: US-014 Basic Web Dashboard Implementation
 */

class PortfolioDashboard {
    constructor() {
        this.data = {
            projects: [],
            summary: {},
            gitStatus: {},
            lastUpdate: null
        };
        
        this.charts = {};
        this.refreshInterval = 30000; // 30 seconds
        this.isLoading = false;
        this.selectedProject = null; // Track currently selected project
        
        console.log('📊 Portfolio Dashboard initialized');
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            this.setupEventListeners();
            await this.loadData();
            this.renderDashboard();
            this.setupAutoRefresh();
            
            console.log('✅ Dashboard initialization complete');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.showError('Failed to initialize dashboard');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Project filter
        const filterSelect = document.getElementById('projectFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterProjects(e.target.value);
            });
        }

        // Refresh button (if exists)
        const refreshBtn = document.querySelector('[data-action="refresh"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadData(true);
            });
        }

        // Time period selectors for charts
        document.querySelectorAll('[data-period]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = e.target.dataset.period;
                this.updateChartPeriod(period);
            });
        });
    }

    /**
     * Load data from monitoring system
     */
    async loadData(forceRefresh = false) {
        if (this.isLoading && !forceRefresh) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            // Load executive summary
            const summary = await this.fetchExecutiveSummary();
            
            // Load project data
            const projects = await this.fetchProjectData();
            
            // Load git status data
            const gitStatus = await this.fetchGitStatusData();
            
            // Update internal data
            this.data = {
                summary,
                projects,
                gitStatus,
                lastUpdate: new Date()
            };

            console.log('📊 Data loaded successfully:', this.data);
            
        } catch (error) {
            console.error('❌ Failed to load data:', error);
            this.showError('Failed to load monitoring data');
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    /**
     * Fetch executive summary data
     */
    async fetchExecutiveSummary() {
        try {
            const response = await fetch('/api/summary');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Executive summary not available, using mock data');
        }
        
        // Return mock data for demonstration
        return {
            timestamp: new Date().toISOString(),
            totalProjects: 18,
            activeMonitors: 18,
            healthStatus: {
                healthy: 8,
                attention: 6,
                critical: 2,
                unknown: 2
            },
            activitySummary: {
                totalCommits: 142,
                activeBranches: 47,
                behindMain: 8,
                pendingPushes: 12,
                openPRs: 15
            }
        };
    }

    /**
     * Fetch individual project data
     */
    async fetchProjectData() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Project data not available, using mock data');
        }
        
        // Mock project data based on monitoring system output
        return [
            {
                name: 'ai-power-rankings',
                priority: 'HIGH',
                type: 'revenue',
                health: 'healthy',
                git: {
                    currentBranch: 'feature/rankings',
                    commitsAhead: 3,
                    commitsBehind: 0,
                    branches: 3,
                    lastActivity: '2 hours ago',
                    uncommittedChanges: 0
                },
                activity: {
                    commits7d: 15,
                    linesAdded: 847,
                    linesRemoved: 203
                }
            },
            {
                name: 'matsuoka-com',
                priority: 'HIGH',
                type: 'revenue',
                health: 'healthy',
                git: {
                    currentBranch: 'main',
                    commitsAhead: 0,
                    commitsBehind: 0,
                    branches: 2,
                    lastActivity: '4 hours ago',
                    uncommittedChanges: 0
                },
                activity: {
                    commits7d: 8,
                    linesAdded: 423,
                    linesRemoved: 156
                }
            },
            {
                name: 'scraper-engine',
                priority: 'HIGH',
                type: 'revenue',
                health: 'attention',
                git: {
                    currentBranch: 'main',
                    commitsAhead: 0,
                    commitsBehind: 5,
                    branches: 5,
                    lastActivity: '2 days ago',
                    uncommittedChanges: 0
                },
                activity: {
                    commits7d: 3,
                    linesAdded: 127,
                    linesRemoved: 89
                }
            },
            {
                name: 'eva-agent',
                priority: 'MEDIUM',
                type: 'strategic',
                health: 'attention',
                git: {
                    currentBranch: 'develop',
                    commitsAhead: 2,
                    commitsBehind: 0,
                    branches: 4,
                    lastActivity: '3 days ago',
                    uncommittedChanges: 0
                },
                activity: {
                    commits7d: 1,
                    linesAdded: 89,
                    linesRemoved: 23
                }
            },
            {
                name: 'hot-flash',
                priority: 'MEDIUM',
                type: 'revenue',
                health: 'critical',
                git: {
                    currentBranch: 'main',
                    commitsAhead: 0,
                    commitsBehind: 8,
                    branches: 1,
                    lastActivity: '7 days ago',
                    uncommittedChanges: 5
                },
                activity: {
                    commits7d: 0,
                    linesAdded: 0,
                    linesRemoved: 0
                }
            },
            {
                name: 'ai-code-review',
                priority: 'MEDIUM',
                type: 'strategic',
                health: 'healthy',
                git: {
                    currentBranch: 'main',
                    commitsAhead: 1,
                    commitsBehind: 0,
                    branches: 2,
                    lastActivity: '1 day ago',
                    uncommittedChanges: 0
                },
                activity: {
                    commits7d: 5,
                    linesAdded: 234,
                    linesRemoved: 67
                }
            }
        ];
    }

    /**
     * Fetch git status data
     */
    async fetchGitStatusData() {
        try {
            const response = await fetch('/api/git-status');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Git status data not available, using mock data');
        }
        
        // Mock git status data
        return {
            totalBranches: 47,
            behindMainCount: 8,
            uncommittedCount: 12,
            mergedThisWeek: 12,
            pushesThisWeek: 89
        };
    }

    /**
     * Render the complete dashboard
     */
    renderDashboard() {
        this.updateLastUpdateTime();
        this.renderExecutiveSummary();
        this.renderProjectList();
        this.renderGitStatusTable();
        this.renderBranchActivityTable();
        this.renderIssuesTable();
        this.renderCharts();
    }

    /**
     * Update last update time
     */
    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('lastUpdate');
        if (lastUpdateElement && this.data.lastUpdate) {
            const timeString = this.data.lastUpdate.toLocaleTimeString();
            lastUpdateElement.innerHTML = `Last Update: <span class="font-medium">${timeString}</span>`;
        }
    }

    /**
     * Render executive summary cards
     */
    renderExecutiveSummary() {
        if (this.selectedProject) {
            this.renderProjectSpecificSummary();
        } else {
            this.renderPortfolioSummary();
        }
    }
    
    /**
     * Render portfolio-wide summary
     */
    renderPortfolioSummary() {
        const { healthStatus, activitySummary } = this.data.summary;

        // Health status cards
        this.updateElement('healthyCount', healthStatus.healthy);
        this.updateElement('attentionCount', healthStatus.attention);
        this.updateElement('criticalCount', healthStatus.critical);
        
        // Activity summary
        this.updateElement('totalActivity', activitySummary.totalCommits);
        this.updateElement('activeBranches', activitySummary.activeBranches);
        this.updateElement('behindMain', activitySummary.behindMain);
        this.updateElement('pendingPushes', activitySummary.pendingPushes);
        this.updateElement('openPRs', activitySummary.openPRs);

        // Update trends (mock data)
        this.updateElement('healthyTrend', 'Portfolio view');
        this.updateElement('attentionTrend', 'All projects');
        this.updateElement('criticalTrend', 'Overall status');
        this.updateElement('activityTrend', 'Total activity');
        this.updateElement('newBranches', 'All branches');
        
        // Update header to show portfolio view
        this.updateDashboardHeader('Portfolio Overview');
    }
    
    /**
     * Render project-specific summary
     */
    renderProjectSpecificSummary() {
        const project = this.data.projects.find(p => p.name === this.selectedProject);
        if (!project) return;

        // Health status (show 1 or 0 for each category)
        this.updateElement('healthyCount', project.health === 'healthy' ? 1 : 0);
        this.updateElement('attentionCount', project.health === 'attention' ? 1 : 0);
        this.updateElement('criticalCount', project.health === 'critical' ? 1 : 0);
        
        // Activity summary for this project
        this.updateElement('totalActivity', project.activity.commits7d || 0);
        this.updateElement('activeBranches', project.git.branches || 0);
        this.updateElement('behindMain', project.git.commitsBehind > 0 ? 1 : 0);
        this.updateElement('pendingPushes', project.git.uncommittedChanges > 0 ? 1 : 0);
        this.updateElement('openPRs', Math.floor((project.git.branches || 0) * 0.3)); // Estimate

        // Update trends with project-specific info
        this.updateElement('healthyTrend', project.health);
        this.updateElement('attentionTrend', `${project.git.currentBranch}`);
        this.updateElement('criticalTrend', project.type);
        this.updateElement('activityTrend', project.git.lastActivity);
        this.updateElement('newBranches', `${project.git.commitsAhead}↑ ${project.git.commitsBehind}↓`);
        
        // Update header to show selected project
        this.updateDashboardHeader(`${this.selectedProject} - Project Details`);
    }

    /**
     * Render project list
     */
    renderProjectList() {
        const projectListElement = document.getElementById('projectList');
        if (!projectListElement) return;

        const projects = this.data.projects || [];
        
        projectListElement.innerHTML = projects.map(project => {
            const healthIcon = this.getHealthIcon(project.health);
            const healthClass = this.getHealthClass(project.health);
            const isSelected = this.selectedProject === project.name;
            const selectedClass = isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : '';
            
            return `
                <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg ${healthClass} ${selectedClass} cursor-pointer hover:shadow-md transition-all" 
                     onclick="window.dashboard.showProjectDetails('${project.name}')">
                    <div class="flex items-center space-x-3">
                        <div class="flex-shrink-0">
                            ${healthIcon}
                        </div>
                        <div>
                            <div class="flex items-center space-x-2">
                                <h3 class="font-medium text-gray-900">${project.name}</h3>
                                <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                    ${project.type}
                                </span>
                                ${isSelected ? '<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Selected</span>' : ''}
                            </div>
                            <div class="text-sm text-gray-600 mt-1">
                                Current: ${project.git.currentBranch} | 
                                ${project.git.branches} open branches | 
                                Last: ${project.git.lastActivity}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-medium">
                            main ↑${project.git.commitsAhead} ↓${project.git.commitsBehind}
                        </div>
                        <div class="text-xs text-gray-500">
                            ${project.activity.commits7d} commits/week
                        </div>
                        <div class="text-xs ${isSelected ? 'text-blue-700' : 'text-blue-600'} font-medium mt-1">
                            ${isSelected ? '✓ Selected' : 'Click to select →'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render git status table
     */
    renderGitStatusTable() {
        const tableElement = document.getElementById('gitStatusTable');
        if (!tableElement) return;

        let projects = this.data.projects || [];
        
        // Filter to selected project if one is selected
        if (this.selectedProject) {
            projects = projects.filter(p => p.name === this.selectedProject);
        }
        
        tableElement.innerHTML = projects.map(project => {
            const statusBadge = this.getGitStatusBadge(project.git);
            
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="font-medium text-gray-900">${project.name}</div>
                            <div class="ml-2 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                ${project.type}
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${project.git.currentBranch}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        ↑${project.git.commitsAhead} ↓${project.git.commitsBehind}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${project.git.branches}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render branch activity table
     */
    renderBranchActivityTable() {
        const tableElement = document.getElementById('branchActivityTable');
        if (!tableElement) return;

        let projects = this.data.projects || [];
        
        // Filter to selected project if one is selected
        if (this.selectedProject) {
            projects = projects.filter(p => p.name === this.selectedProject);
        }
        
        tableElement.innerHTML = projects.map(project => {
            // Mock data for merged branches and pushes
            const mergedThisWeek = Math.floor(Math.random() * 3);
            const pushesThisWeek = Math.floor(Math.random() * 20);
            
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        ${project.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${project.git.branches}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${mergedThisWeek}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${pushesThisWeek}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${project.git.lastActivity}
                        <div class="text-xs text-gray-400">(${project.git.currentBranch})</div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render issues tracking table
     */
    renderIssuesTable() {
        const tableElement = document.getElementById('issuesTable');
        if (!tableElement) return;

        let projects = this.data.projects || [];
        
        // Filter to selected project if one is selected
        if (this.selectedProject) {
            projects = projects.filter(p => p.name === this.selectedProject);
        } else {
            projects = projects.slice(0, 3); // Show top 3 for portfolio view
        }
        
        // Update summary stats based on filtered projects
        const totalOpen = projects.length * 5; // Estimated
        const totalClosed = projects.length * 20; // Estimated
        const velocity = projects.reduce((sum, p) => sum + (p.activity?.commits7d || 0), 0);
        
        this.updateElement('openIssues', totalOpen.toString());
        this.updateElement('closedIssues', totalClosed.toString());
        this.updateElement('weeklyVelocity', `+${velocity}`);
        
        tableElement.innerHTML = projects.map(project => {
            // Mock issue data
            const openIssues = Math.floor(Math.random() * 15) + 1;
            const closedThisWeek = Math.floor(Math.random() * 10);
            const trend = ['↗️', '↘️', '→'][Math.floor(Math.random() * 3)];
            
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        ${project.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${openIssues}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${closedThisWeek}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-lg">
                        ${trend}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render charts
     */
    renderCharts() {
        this.renderCommitsChart();
        this.renderLinesOfCodeChart();
    }

    /**
     * Render commits chart
     */
    renderCommitsChart() {
        const canvas = document.getElementById('commitsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.commits) {
            this.charts.commits.destroy();
        }

        // Get data based on selection
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        let data, chartTitle;
        
        if (this.selectedProject) {
            const project = this.data.projects.find(p => p.name === this.selectedProject);
            if (project) {
                // Generate project-specific commit data
                const weeklyCommits = project.activity.commits7d || 0;
                data = this.generateWeeklyDistribution(weeklyCommits);
                chartTitle = `${this.selectedProject} - Weekly Commits`;
            } else {
                data = [0, 0, 0, 0, 0, 0, 0];
                chartTitle = 'No Data';
            }
        } else {
            // Portfolio-wide data
            data = [12, 19, 3, 5, 2, 3, 20];
            chartTitle = 'Portfolio Commits';
        }

        this.charts.commits = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: chartTitle,
                    data: data,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: this.selectedProject ? 1 : 5
                        }
                    }
                }
            }
        });
    }

    /**
     * Render lines of code chart
     */
    renderLinesOfCodeChart() {
        const canvas = document.getElementById('locChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.loc) {
            this.charts.loc.destroy();
        }

        // Get data based on selection
        let projects, addedLines, removedLines;
        
        if (this.selectedProject) {
            const project = this.data.projects.find(p => p.name === this.selectedProject);
            if (project) {
                projects = [project.name];
                addedLines = [project.activity.linesAdded || 0];
                removedLines = [project.activity.linesRemoved || 0];
            } else {
                projects = ['No Data'];
                addedLines = [0];
                removedLines = [0];
            }
        } else {
            // Portfolio-wide data
            const topProjects = this.data.projects.slice(0, 3);
            projects = topProjects.map(p => p.name);
            addedLines = topProjects.map(p => p.activity.linesAdded || 0);
            removedLines = topProjects.map(p => p.activity.linesRemoved || 0);
        }

        this.charts.loc = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: projects,
                datasets: [{
                    label: 'Lines Added',
                    data: addedLines,
                    backgroundColor: 'rgb(34, 197, 94)'
                }, {
                    label: 'Lines Removed',
                    data: removedLines,
                    backgroundColor: 'rgb(239, 68, 68)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Helper functions
     */
    getHealthIcon(health) {
        const icons = {
            healthy: '<i data-lucide="check-circle" class="h-5 w-5 text-green-500"></i>',
            attention: '<i data-lucide="alert-triangle" class="h-5 w-5 text-yellow-500"></i>',
            critical: '<i data-lucide="alert-octagon" class="h-5 w-5 text-red-500"></i>',
            unknown: '<i data-lucide="help-circle" class="h-5 w-5 text-gray-400"></i>'
        };
        return icons[health] || icons.unknown;
    }

    getHealthClass(health) {
        const classes = {
            healthy: 'border-green-200 bg-green-50',
            attention: 'border-yellow-200 bg-yellow-50',
            critical: 'border-red-200 bg-red-50',
            unknown: 'border-gray-200 bg-gray-50'
        };
        return classes[health] || classes.unknown;
    }

    getGitStatusBadge(git) {
        if (git.uncommittedChanges > 0) {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                🔴 Uncommitted (${git.uncommittedChanges})
            </span>`;
        }
        
        if (git.commitsBehind > 0) {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                🟡 Behind
            </span>`;
        }
        
        if (git.commitsAhead > 0) {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                🟢 Ahead
            </span>`;
        }
        
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            🟢 Up to date
        </span>`;
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    filterProjects(filter) {
        // Implementation for filtering projects
        console.log('Filtering projects by:', filter);
        this.renderProjectList();
    }

    setupAutoRefresh() {
        setInterval(() => {
            this.loadData();
        }, this.refreshInterval);
    }

    showLoadingState() {
        // Add loading indicators
        console.log('Loading data...');
    }

    hideLoadingState() {
        // Remove loading indicators
        console.log('Loading complete');
    }

    showError(message) {
        console.error('Dashboard error:', message);
        // Could implement toast notifications here
    }
    
    /**
     * Show detailed project information (stats only, no modal)
     */
    async showProjectDetails(projectName) {
        try {
            console.log(`Selecting project: ${projectName}`);
            
            // Update dashboard to show project-specific stats
            this.setSelectedProject(projectName);
            
            // Load and display project details
            await this.loadProjectDetails(projectName);
            
        } catch (error) {
            console.error('Error selecting project:', error);
            this.showError(`Failed to select project ${projectName}`);
        }
    }
    
    /**
     * Load detailed project information for open branches and tickets
     */
    async loadProjectDetails(projectName) {
        try {
            // Fetch detailed project data
            const response = await fetch(`/api/projects/${projectName}`);
            if (!response.ok) {
                throw new Error('Failed to load project details');
            }
            
            const projectDetails = await response.json();
            console.log('Project details loaded:', projectDetails);
            
            // Show project details section
            this.showProjectDetailsSection(projectDetails);
            
        } catch (error) {
            console.error('Error loading project details:', error);
            this.hideProjectDetailsSection();
        }
    }
    
    /**
     * Set selected project and update dashboard
     */
    setSelectedProject(projectName) {
        this.selectedProject = projectName;
        this.renderDashboard();
    }
    
    /**
     * Clear selected project and return to portfolio view
     */
    clearSelectedProject() {
        this.selectedProject = null;
        this.hideProjectDetailsSection();
        this.renderDashboard();
    }
    
    /**
     * Update dashboard header title
     */
    updateDashboardHeader(title) {
        const headerElement = document.querySelector('h1');
        if (headerElement) {
            headerElement.textContent = title;
        }
        
        // Show/hide clear selection button
        const clearBtn = document.getElementById('clearSelectionBtn');
        if (clearBtn) {
            clearBtn.style.display = this.selectedProject ? 'flex' : 'none';
        }
        
        // Re-initialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    /**
     * Generate weekly distribution from total commits
     */
    generateWeeklyDistribution(totalCommits) {
        if (totalCommits === 0) return [0, 0, 0, 0, 0, 0, 0];
        
        // Distribute commits across the week with some randomness
        const distribution = [];
        let remaining = totalCommits;
        
        for (let i = 0; i < 6; i++) {
            const max = Math.max(1, Math.floor(remaining / (7 - i)));
            const commits = Math.floor(Math.random() * max);
            distribution.push(commits);
            remaining -= commits;
        }
        distribution.push(remaining); // Assign remaining to last day
        
        return distribution;
    }
    
    /**
     * Show project details section with branches and tickets
     */
    showProjectDetailsSection(projectData) {
        const section = document.getElementById('projectDetailsSection');
        if (!section) return;
        
        // Show the section
        section.style.display = 'block';
        
        // Render open branches
        this.renderOpenBranches(projectData.details?.branches || []);
        
        // Render open tickets
        this.renderOpenTickets(projectData.details?.backlog || []);
        
        // Re-initialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    /**
     * Hide project details section
     */
    hideProjectDetailsSection() {
        const section = document.getElementById('projectDetailsSection');
        if (section) {
            section.style.display = 'none';
        }
    }
    
    /**
     * Render open branches list
     */
    renderOpenBranches(branches) {
        const container = document.getElementById('openBranchesList');
        if (!container) return;
        
        if (!branches || branches.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">No branches found</p>';
            return;
        }
        
        container.innerHTML = branches.map(branch => {
            const isStale = branch.daysSinceActivity > 14;
            const isMain = branch.name === 'main' || branch.name === 'master';
            const staleClass = isStale ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50';
            const mainClass = isMain ? 'border-blue-200 bg-blue-50' : '';
            
            return `
                <div class="p-4 rounded-lg border ${isMain ? mainClass : staleClass}">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-3">
                            <i data-lucide="git-branch" class="h-4 w-4 ${isMain ? 'text-blue-600' : isStale ? 'text-red-600' : 'text-green-600'}"></i>
                            <code class="font-mono text-sm font-medium">${branch.name}</code>
                            ${isMain ? '<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Main</span>' : ''}
                            ${isStale && !isMain ? '<span class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Stale</span>' : ''}
                        </div>
                        <span class="text-xs text-gray-500">${branch.daysSinceActivity}d ago</span>
                    </div>
                    <div class="text-sm text-gray-600">
                        <div class="flex items-center space-x-4">
                            <span>by ${branch.lastAuthor}</span>
                            <span>•</span>
                            <span>${branch.lastCommit}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Render open tickets/issues list
     */
    renderOpenTickets(backlog) {
        const container = document.getElementById('openTicketsList');
        if (!container) return;
        
        if (!backlog || backlog.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">No backlog items found</p>';
            return;
        }
        
        // Filter to only show open/pending items
        const openItems = backlog.filter(item => item.status !== 'completed');
        
        if (openItems.length === 0) {
            container.innerHTML = '<p class="text-green-600 text-sm">✅ All tickets completed!</p>';
            return;
        }
        
        container.innerHTML = openItems.map(issue => {
            const typeClass = issue.type === 'user_story' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700';
            const priorityClass = issue.priority === 'high' ? 'bg-red-100 text-red-700' : 
                                 issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                                 'bg-green-100 text-green-700';
            
            return `
                <div class="p-4 rounded-lg border border-gray-200 bg-white">
                    <div class="flex items-start space-x-3">
                        <i data-lucide="circle" class="h-4 w-4 mt-0.5 text-gray-400"></i>
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <code class="text-xs font-mono bg-gray-100 px-2 py-1 rounded">${issue.id}</code>
                                <span class="text-xs px-2 py-1 rounded ${typeClass}">${issue.type.replace('_', ' ')}</span>
                                ${issue.priority ? `<span class="text-xs px-2 py-1 rounded ${priorityClass}">${issue.priority}</span>` : ''}
                            </div>
                            <p class="text-sm text-gray-900 font-medium mb-1">${issue.description}</p>
                            <div class="text-xs text-gray-500">
                                Status: ${issue.status}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Global functions
function initializeDashboard() {
    window.dashboard = new PortfolioDashboard();
    window.dashboard.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortfolioDashboard;
}