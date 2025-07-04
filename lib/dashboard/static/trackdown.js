/**
 * TrackDown Project Manager - JavaScript Interface
 * 
 * Business Purpose: JIRA-like project management interface for TrackDown tickets
 * Project Manager: Claude (AI Project Manager)
 */

class TrackDownDashboard {
    constructor() {
        this.data = {
            projects: [],
            tickets: [],
            analytics: {},
            lastUpdate: null
        };
        
        this.charts = {};
        this.currentView = 'kanban';
        this.currentFilters = {
            projects: [],
            status: [],
            priority: [],
            assignee: '',
            epic: '',
            search: ''
        };
        this.selectedTicket = null;
        this.isEditing = false;
        
        console.log('📋 TrackDown Dashboard initialized');
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            this.setupEventListeners();
            await this.loadData();
            this.renderDashboard();
            
            console.log('✅ TrackDown Dashboard initialization complete');
        } catch (error) {
            console.error('❌ TrackDown Dashboard initialization failed:', error);
            this.showNotification('Failed to initialize dashboard', 'error');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // View mode selector
        const viewModeSelect = document.getElementById('viewMode');
        if (viewModeSelect) {
            viewModeSelect.addEventListener('change', (e) => {
                this.switchView(e.target.value);
            });
        }

        // Project filter
        const projectFilter = document.getElementById('projectFilter');
        if (projectFilter) {
            projectFilter.addEventListener('change', (e) => {
                this.updateFilter('projects', e.target.value === 'all' ? [] : [e.target.value]);
                this.applyFilters();
            });
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.updateFilter('search', e.target.value);
                this.applyFilters();
            });
        }

        // Filter toggle
        const filterBtn = document.getElementById('filterBtn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => {
                this.toggleFilterPanel();
            });
        }

        // Create ticket button
        const createTicketBtn = document.getElementById('createTicketBtn');
        if (createTicketBtn) {
            createTicketBtn.addEventListener('click', () => {
                this.openTicketModal();
            });
        }

        // Sync button
        const syncBtn = document.getElementById('syncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.syncWithGitHub();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadData(true);
            });
        }

        // Modal controls
        const closeModal = document.getElementById('closeModal');
        const cancelTicket = document.getElementById('cancelTicket');
        if (closeModal) closeModal.addEventListener('click', () => this.closeTicketModal());
        if (cancelTicket) cancelTicket.addEventListener('click', () => this.closeTicketModal());

        // Ticket form
        const ticketForm = document.getElementById('ticketForm');
        if (ticketForm) {
            ticketForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTicket();
            });
        }

        // Filter controls
        this.setupFilterControls();
    }

    /**
     * Set up filter controls
     */
    setupFilterControls() {
        // Status filters
        document.querySelectorAll('.status-filter').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateStatusFilters();
            });
        });

        // Priority filters
        document.querySelectorAll('.priority-filter').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updatePriorityFilters();
            });
        });

        // Assignee filter
        const assigneeFilter = document.getElementById('assigneeFilter');
        if (assigneeFilter) {
            assigneeFilter.addEventListener('change', (e) => {
                this.updateFilter('assignee', e.target.value);
                this.applyFilters();
            });
        }

        // Epic filter
        const epicFilter = document.getElementById('epicFilter');
        if (epicFilter) {
            epicFilter.addEventListener('change', (e) => {
                this.updateFilter('epic', e.target.value);
                this.applyFilters();
            });
        }

        // Clear filters
        const clearFilters = document.getElementById('clearFilters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    /**
     * Load data from TrackDown manager
     */
    async loadData(forceRefresh = false) {
        this.showLoadingState();

        try {
            // Load projects
            const projectsResponse = await fetch('/api/trackdown/projects');
            const projects = await projectsResponse.json();

            // Load tickets
            const ticketsResponse = await fetch('/api/trackdown/tickets');
            const tickets = await ticketsResponse.json();

            // Load analytics
            const analyticsResponse = await fetch('/api/trackdown/analytics');
            const analytics = await analyticsResponse.json();

            this.data = {
                projects: projects.success ? projects.data : [],
                tickets: tickets.success ? tickets.data : [],
                analytics: analytics.success ? analytics.data : {},
                lastUpdate: new Date()
            };

            this.populateFilterOptions();
            this.hideLoadingState();
            
            console.log('📊 TrackDown data loaded successfully:', this.data);
            
        } catch (error) {
            console.error('❌ Failed to load TrackDown data:', error);
            this.showNotification('Failed to load data', 'error');
            this.hideLoadingState();
        }
    }

    /**
     * Populate filter dropdown options
     */
    populateFilterOptions() {
        this.populateProjectFilter();
        this.populateAssigneeFilter();
        this.populateEpicFilter();
    }

    /**
     * Populate project filter
     */
    populateProjectFilter() {
        const projectFilter = document.getElementById('projectFilter');
        if (!projectFilter) return;

        const currentValue = projectFilter.value;
        projectFilter.innerHTML = '<option value="all">All Projects</option>';

        this.data.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.name;
            option.textContent = `${project.name} (${project.ticketCount} tickets)`;
            projectFilter.appendChild(option);
        });

        if (currentValue) {
            projectFilter.value = currentValue;
        }
    }

    /**
     * Populate assignee filter
     */
    populateAssigneeFilter() {
        const assigneeFilter = document.getElementById('assigneeFilter');
        if (!assigneeFilter) return;

        const assignees = new Set();
        this.data.tickets.forEach(ticket => {
            if (ticket.assignee) {
                assignees.add(ticket.assignee);
            }
        });

        assigneeFilter.innerHTML = '<option value="">All Assignees</option>';
        Array.from(assignees).sort().forEach(assignee => {
            const option = document.createElement('option');
            option.value = assignee;
            option.textContent = assignee;
            assigneeFilter.appendChild(option);
        });
    }

    /**
     * Populate epic filter
     */
    populateEpicFilter() {
        const epicFilter = document.getElementById('epicFilter');
        if (!epicFilter) return;

        const epics = new Set();
        this.data.tickets.forEach(ticket => {
            if (ticket.epic) {
                epics.add(ticket.epic);
            }
        });

        epicFilter.innerHTML = '<option value="">All Epics</option>';
        Array.from(epics).sort().forEach(epic => {
            const option = document.createElement('option');
            option.value = epic;
            option.textContent = epic;
            epicFilter.appendChild(option);
        });
    }

    /**
     * Render the complete dashboard
     */
    renderDashboard() {
        if (this.data.projects.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        
        switch (this.currentView) {
            case 'kanban':
                this.renderKanbanBoard();
                break;
            case 'list':
                this.renderListView();
                break;
            case 'analytics':
                this.renderAnalyticsView();
                break;
        }
    }

    /**
     * Switch between views
     */
    switchView(view) {
        this.currentView = view;
        
        // Hide all views
        document.getElementById('kanbanBoard').classList.add('hidden');
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('analyticsView').classList.add('hidden');
        
        // Show selected view
        document.getElementById(view === 'kanban' ? 'kanbanBoard' : 
                             view === 'list' ? 'listView' : 'analyticsView').classList.remove('hidden');
        
        this.renderDashboard();
    }

    /**
     * Render Kanban board
     */
    renderKanbanBoard() {
        const filteredTickets = this.getFilteredTickets();
        
        // Group tickets by status
        const statusGroups = {
            'TODO': filteredTickets.filter(t => t.status === 'TODO'),
            'IN_PROGRESS': filteredTickets.filter(t => t.status === 'IN_PROGRESS'),
            'DONE': filteredTickets.filter(t => t.status === 'DONE'),
            'CANCELED': filteredTickets.filter(t => t.status === 'CANCELED')
        };

        // Update counts
        document.getElementById('todoCount').textContent = statusGroups.TODO.length;
        document.getElementById('inProgressCount').textContent = statusGroups.IN_PROGRESS.length;
        document.getElementById('doneCount').textContent = statusGroups.DONE.length;
        document.getElementById('canceledCount').textContent = statusGroups.CANCELED.length;

        // Render columns
        this.renderKanbanColumn('todoColumn', statusGroups.TODO);
        this.renderKanbanColumn('inProgressColumn', statusGroups.IN_PROGRESS);
        this.renderKanbanColumn('doneColumn', statusGroups.DONE);
        this.renderKanbanColumn('canceledColumn', statusGroups.CANCELED);
    }

    /**
     * Render individual Kanban column
     */
    renderKanbanColumn(columnId, tickets) {
        const column = document.getElementById(columnId);
        if (!column) return;

        if (tickets.length === 0) {
            column.innerHTML = '<div class="text-gray-500 text-center py-8">No tickets</div>';
            return;
        }

        column.innerHTML = tickets.map(ticket => {
            const priorityClass = `priority-${ticket.priority.toLowerCase()}`;
            const statusClass = `status-${ticket.status.toLowerCase().replace('_', '')}`;
            
            return `
                <div class="ticket-card ${priorityClass} ${statusClass} bg-white rounded-lg border p-4 cursor-pointer hover:shadow-lg transition-all" 
                     onclick="window.trackdownDashboard.viewTicket('${ticket.project}', '${ticket.id}')">
                    <div class="flex items-start justify-between mb-2">
                        <span class="text-xs font-mono text-gray-500">${ticket.id}</span>
                        <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                            ${ticket.priority}
                        </span>
                    </div>
                    
                    <h4 class="font-medium text-gray-900 mb-2 line-clamp-2">${ticket.title}</h4>
                    
                    <div class="flex items-center justify-between text-xs text-gray-500">
                        <span>${ticket.project}</span>
                        ${ticket.assignee ? `<span>@${ticket.assignee}</span>` : ''}
                    </div>
                    
                    ${ticket.labels.length > 0 ? `
                        <div class="mt-2 flex flex-wrap gap-1">
                            ${ticket.labels.slice(0, 3).map(label => 
                                `<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">${label}</span>`
                            ).join('')}
                            ${ticket.labels.length > 3 ? `<span class="text-xs text-gray-400">+${ticket.labels.length - 3}</span>` : ''}
                        </div>
                    ` : ''}
                    
                    ${ticket.storyPoints ? `
                        <div class="mt-2 text-right">
                            <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">${ticket.storyPoints} pts</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Render list view
     */
    renderListView() {
        const tableBody = document.getElementById('ticketTableBody');
        if (!tableBody) return;

        const filteredTickets = this.getFilteredTickets();

        if (filteredTickets.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        No tickets found matching current filters
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filteredTickets.map(ticket => {
            const statusBadge = this.getStatusBadge(ticket.status);
            const priorityBadge = this.getPriorityBadge(ticket.priority);
            
            return `
                <tr class="hover:bg-gray-50 cursor-pointer" onclick="window.trackdownDashboard.viewTicket('${ticket.project}', '${ticket.id}')">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">${ticket.id}</td>
                    <td class="px-6 py-4 text-sm text-gray-900">
                        <div class="max-w-xs truncate">${ticket.title}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${priorityBadge}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${ticket.assignee || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${ticket.project}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="event.stopPropagation(); window.trackdownDashboard.editTicket('${ticket.project}', '${ticket.id}')" 
                                class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                        <button onclick="event.stopPropagation(); window.trackdownDashboard.deleteTicket('${ticket.project}', '${ticket.id}')" 
                                class="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render analytics view
     */
    renderAnalyticsView() {
        const analytics = this.data.analytics;
        
        // Update summary cards
        document.getElementById('totalTicketsCount').textContent = analytics.totalTickets || 0;
        document.getElementById('totalProjectsCount').textContent = analytics.totalProjects || 0;

        // Render charts
        this.renderStatusChart();
        this.renderPriorityChart();
        this.renderProjectChart();
        
        // Render recent activity
        this.renderRecentActivity();
    }

    /**
     * Render status distribution chart
     */
    renderStatusChart() {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        const analytics = this.data.analytics;
        const statusData = analytics.statusDistribution || {};

        if (this.charts.status) {
            this.charts.status.destroy();
        }

        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: [
                        '#f3f4f6', // TODO - gray
                        '#3b82f6', // IN_PROGRESS - blue
                        '#10b981', // DONE - green
                        '#ef4444'  // CANCELED - red
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Render priority distribution chart
     */
    renderPriorityChart() {
        const ctx = document.getElementById('priorityChart');
        if (!ctx) return;

        const analytics = this.data.analytics;
        const priorityData = analytics.priorityDistribution || {};

        if (this.charts.priority) {
            this.charts.priority.destroy();
        }

        this.charts.priority = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(priorityData),
                datasets: [{
                    data: Object.values(priorityData),
                    backgroundColor: [
                        '#ef4444', // HIGH - red
                        '#f59e0b', // MEDIUM - yellow
                        '#10b981'  // LOW - green
                    ]
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
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Render project distribution chart
     */
    renderProjectChart() {
        const ctx = document.getElementById('projectChart');
        if (!ctx) return;

        const analytics = this.data.analytics;
        const projectData = analytics.projectDistribution || {};

        if (this.charts.project) {
            this.charts.project.destroy();
        }

        this.charts.project = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(projectData),
                datasets: [{
                    data: Object.values(projectData),
                    backgroundColor: [
                        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
                        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Render recent activity
     */
    renderRecentActivity() {
        const activityContainer = document.getElementById('recentActivity');
        if (!activityContainer) return;

        const recentActivity = this.data.analytics.recentActivity || [];

        if (recentActivity.length === 0) {
            activityContainer.innerHTML = '<div class="text-gray-500 text-center py-4">No recent activity</div>';
            return;
        }

        activityContainer.innerHTML = recentActivity.map(ticket => {
            const timeAgo = this.getTimeAgo(ticket.updatedAt);
            return `
                <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                     onclick="window.trackdownDashboard.viewTicket('${ticket.project}', '${ticket.id}')">
                    <div class="flex items-center space-x-3">
                        <div class="flex-shrink-0">
                            ${this.getStatusIcon(ticket.status)}
                        </div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">${ticket.title}</div>
                            <div class="text-xs text-gray-500">${ticket.project} • ${ticket.id}</div>
                        </div>
                    </div>
                    <div class="text-xs text-gray-500">${timeAgo}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Get filtered tickets based on current filters
     */
    getFilteredTickets() {
        let tickets = [...this.data.tickets];

        // Apply project filter
        if (this.currentFilters.projects.length > 0) {
            tickets = tickets.filter(ticket => 
                this.currentFilters.projects.includes(ticket.project)
            );
        }

        // Apply status filter
        if (this.currentFilters.status.length > 0) {
            tickets = tickets.filter(ticket => 
                this.currentFilters.status.includes(ticket.status)
            );
        }

        // Apply priority filter
        if (this.currentFilters.priority.length > 0) {
            tickets = tickets.filter(ticket => 
                this.currentFilters.priority.includes(ticket.priority)
            );
        }

        // Apply assignee filter
        if (this.currentFilters.assignee) {
            tickets = tickets.filter(ticket => 
                ticket.assignee && ticket.assignee.toLowerCase().includes(this.currentFilters.assignee.toLowerCase())
            );
        }

        // Apply epic filter
        if (this.currentFilters.epic) {
            tickets = tickets.filter(ticket => ticket.epic === this.currentFilters.epic);
        }

        // Apply search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            tickets = tickets.filter(ticket =>
                ticket.title.toLowerCase().includes(searchTerm) ||
                ticket.description.toLowerCase().includes(searchTerm) ||
                ticket.id.toLowerCase().includes(searchTerm)
            );
        }

        return tickets;
    }

    /**
     * Update filter
     */
    updateFilter(type, value) {
        this.currentFilters[type] = value;
    }

    /**
     * Update status filters
     */
    updateStatusFilters() {
        const selected = [];
        document.querySelectorAll('.status-filter:checked').forEach(checkbox => {
            selected.push(checkbox.value);
        });
        this.updateFilter('status', selected);
        this.applyFilters();
    }

    /**
     * Update priority filters
     */
    updatePriorityFilters() {
        const selected = [];
        document.querySelectorAll('.priority-filter:checked').forEach(checkbox => {
            selected.push(checkbox.value);
        });
        this.updateFilter('priority', selected);
        this.applyFilters();
    }

    /**
     * Apply all filters
     */
    applyFilters() {
        this.renderDashboard();
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        this.currentFilters = {
            projects: [],
            status: [],
            priority: [],
            assignee: '',
            epic: '',
            search: ''
        };

        // Reset UI controls
        document.getElementById('projectFilter').value = 'all';
        document.getElementById('searchInput').value = '';
        document.getElementById('assigneeFilter').value = '';
        document.getElementById('epicFilter').value = '';
        
        document.querySelectorAll('.status-filter').forEach(cb => cb.checked = false);
        document.querySelectorAll('.priority-filter').forEach(cb => cb.checked = false);

        this.applyFilters();
    }

    /**
     * Toggle filter panel
     */
    toggleFilterPanel() {
        const panel = document.getElementById('filterPanel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }

    /**
     * Open ticket modal for creating new ticket
     */
    openTicketModal(ticket = null) {
        const modal = document.getElementById('ticketModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('ticketForm');
        
        if (!modal || !title || !form) return;

        this.isEditing = !!ticket;
        this.selectedTicket = ticket;

        title.textContent = ticket ? 'Edit Ticket' : 'Create New Ticket';
        
        // Populate project options
        const projectSelect = document.getElementById('ticketProject');
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">Select Project</option>';
            this.data.projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.name;
                option.textContent = project.name;
                projectSelect.appendChild(option);
            });
        }

        // Populate form with ticket data if editing
        if (ticket) {
            document.getElementById('ticketProject').value = ticket.project;
            document.getElementById('ticketId').value = ticket.id;
            document.getElementById('ticketTitle').value = ticket.title;
            document.getElementById('ticketDescription').value = ticket.description;
            document.getElementById('ticketStatus').value = ticket.status;
            document.getElementById('ticketPriority').value = ticket.priority;
            document.getElementById('ticketStoryPoints').value = ticket.storyPoints || '';
            document.getElementById('ticketAssignee').value = ticket.assignee || '';
            document.getElementById('ticketEpic').value = ticket.epic || '';
            document.getElementById('ticketSprint').value = ticket.sprint || '';
            document.getElementById('ticketLabels').value = ticket.labels.join(', ');
        } else {
            form.reset();
        }

        modal.classList.remove('hidden');
    }

    /**
     * Close ticket modal
     */
    closeTicketModal() {
        const modal = document.getElementById('ticketModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.selectedTicket = null;
        this.isEditing = false;
    }

    /**
     * Save ticket
     */
    async saveTicket() {
        const formData = {
            project: document.getElementById('ticketProject').value,
            id: document.getElementById('ticketId').value,
            title: document.getElementById('ticketTitle').value,
            description: document.getElementById('ticketDescription').value,
            status: document.getElementById('ticketStatus').value,
            priority: document.getElementById('ticketPriority').value,
            storyPoints: parseInt(document.getElementById('ticketStoryPoints').value) || null,
            assignee: document.getElementById('ticketAssignee').value || null,
            epic: document.getElementById('ticketEpic').value || null,
            sprint: document.getElementById('ticketSprint').value || null,
            labels: document.getElementById('ticketLabels').value.split(',').map(l => l.trim()).filter(Boolean)
        };

        if (!formData.project || !formData.title) {
            this.showNotification('Project and title are required', 'error');
            return;
        }

        try {
            const url = this.isEditing 
                ? `/api/trackdown/tickets/${formData.project}/${formData.id}`
                : '/api/trackdown/tickets';
            
            const method = this.isEditing ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(
                    this.isEditing ? 'Ticket updated successfully' : 'Ticket created successfully',
                    'success'
                );
                this.closeTicketModal();
                await this.loadData();
                this.renderDashboard();
            } else {
                this.showNotification(result.message || 'Failed to save ticket', 'error');
            }
        } catch (error) {
            console.error('Error saving ticket:', error);
            this.showNotification('Failed to save ticket', 'error');
        }
    }

    /**
     * View ticket details
     */
    viewTicket(project, ticketId) {
        const ticket = this.data.tickets.find(t => t.project === project && t.id === ticketId);
        if (ticket) {
            this.openTicketModal(ticket);
        }
    }

    /**
     * Edit ticket
     */
    editTicket(project, ticketId) {
        this.viewTicket(project, ticketId);
    }

    /**
     * Delete ticket
     */
    async deleteTicket(project, ticketId) {
        if (!confirm(`Are you sure you want to delete ticket ${ticketId}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/trackdown/tickets/${project}/${ticketId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Ticket deleted successfully', 'success');
                await this.loadData();
                this.renderDashboard();
            } else {
                this.showNotification(result.message || 'Failed to delete ticket', 'error');
            }
        } catch (error) {
            console.error('Error deleting ticket:', error);
            this.showNotification('Failed to delete ticket', 'error');
        }
    }

    /**
     * Sync with GitHub
     */
    async syncWithGitHub() {
        this.showNotification('Syncing with GitHub...', 'info');

        try {
            const response = await fetch('/api/trackdown/sync', {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('GitHub sync completed successfully', 'success');
                await this.loadData();
                this.renderDashboard();
            } else {
                this.showNotification(result.message || 'GitHub sync failed', 'error');
            }
        } catch (error) {
            console.error('Error syncing with GitHub:', error);
            this.showNotification('GitHub sync failed', 'error');
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('kanbanBoard').classList.add('hidden');
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('analyticsView').classList.add('hidden');
        document.getElementById('emptyState').classList.add('hidden');
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        document.getElementById('loadingState').classList.add('hidden');
        const viewElement = document.getElementById(
            this.currentView === 'kanban' ? 'kanbanBoard' : 
            this.currentView === 'list' ? 'listView' : 'analyticsView'
        );
        if (viewElement) {
            viewElement.classList.remove('hidden');
        }
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('kanbanBoard').classList.add('hidden');
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('analyticsView').classList.add('hidden');
        document.getElementById('loadingState').classList.add('hidden');
    }

    /**
     * Hide empty state
     */
    hideEmptyState() {
        document.getElementById('emptyState').classList.add('hidden');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const icon = document.getElementById('notificationIcon');
        const title = document.getElementById('notificationTitle');
        const messageEl = document.getElementById('notificationMessage');
        
        if (!notification) return;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };

        icon.textContent = icons[type] || icons.info;
        title.textContent = titles[type] || titles.info;
        messageEl.textContent = message;

        notification.classList.remove('hidden');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 5000);
    }

    /**
     * Get status badge HTML
     */
    getStatusBadge(status) {
        const badges = {
            'TODO': '<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">TODO</span>',
            'IN_PROGRESS': '<span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">In Progress</span>',
            'DONE': '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Done</span>',
            'CANCELED': '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Canceled</span>'
        };
        return badges[status] || badges.TODO;
    }

    /**
     * Get priority badge HTML
     */
    getPriorityBadge(priority) {
        const badges = {
            'HIGH': '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">High</span>',
            'MEDIUM': '<span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Medium</span>',
            'LOW': '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Low</span>'
        };
        return badges[priority] || badges.MEDIUM;
    }

    /**
     * Get status icon
     */
    getStatusIcon(status) {
        const icons = {
            'TODO': '📝',
            'IN_PROGRESS': '🚀',
            'DONE': '✅',
            'CANCELED': '🚫'
        };
        return icons[status] || icons.TODO;
    }

    /**
     * Get time ago string
     */
    getTimeAgo(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.trackdownDashboard = new TrackDownDashboard();
    window.trackdownDashboard.init();
});