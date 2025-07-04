#!/bin/bash

# Local Deployment Script for Git Portfolio Manager
# Deploys to ~/Projects and manages the web service lifecycle

set -e  # Exit on any error

# Configuration
PROJECT_NAME="git-portfolio-manager"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$HOME/Projects"
SERVICE_NAME="portfolio-monitor"
CONFIG_FILE="$DEPLOY_DIR/portfolio-monitor.yml"
PID_FILE="$DEPLOY_DIR/.portfolio-monitor.pid"
LOG_FILE="$DEPLOY_DIR/portfolio-monitor.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if service is running
is_service_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            # PID file exists but process is dead
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Stop the service
stop_service() {
    if is_service_running; then
        local pid=$(cat "$PID_FILE")
        log "Stopping $SERVICE_NAME (PID: $pid)..."
        
        # Try graceful shutdown first
        if kill -TERM "$pid" 2>/dev/null; then
            # Wait up to 10 seconds for graceful shutdown
            for i in {1..10}; do
                if ! kill -0 "$pid" 2>/dev/null; then
                    success "Service stopped gracefully"
                    rm -f "$PID_FILE"
                    return 0
                fi
                sleep 1
            done
            
            # Force kill if graceful shutdown failed
            warning "Graceful shutdown timed out, force killing..."
            kill -KILL "$pid" 2>/dev/null || true
            rm -f "$PID_FILE"
            success "Service force stopped"
        else
            warning "Process already dead, cleaning up PID file"
            rm -f "$PID_FILE"
        fi
    else
        log "$SERVICE_NAME is not running"
    fi
}

# Start the service
start_service() {
    if is_service_running; then
        warning "$SERVICE_NAME is already running (PID: $(cat "$PID_FILE"))"
        return 0
    fi
    
    log "Starting $SERVICE_NAME..."
    
    # Ensure config file exists
    if [[ ! -f "$CONFIG_FILE" ]]; then
        error "Config file not found: $CONFIG_FILE"
    fi
    
    # Change to deploy directory and start service
    cd "$DEPLOY_DIR"
    
    # Start the service in background and capture PID
    nohup npx git-portfolio-manager start --config "$CONFIG_FILE" >> "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$PID_FILE"
    
    # Wait a moment to check if service started successfully
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        success "Service started successfully (PID: $pid)"
        log "Service logs: tail -f $LOG_FILE"
    else
        rm -f "$PID_FILE"
        error "Service failed to start. Check logs: $LOG_FILE"
    fi
}

# Restart the service
restart_service() {
    log "Restarting $SERVICE_NAME..."
    stop_service
    sleep 1
    start_service
}

# Check service status
check_status() {
    if is_service_running; then
        local pid=$(cat "$PID_FILE")
        success "$SERVICE_NAME is running (PID: $pid)"
        
        # Try to get port info from config
        if [[ -f "$CONFIG_FILE" ]]; then
            local port=$(grep -E "^\s*port:\s*" "$CONFIG_FILE" | sed 's/.*port:\s*//' | tr -d ' ')
            if [[ -n "$port" ]]; then
                log "Dashboard should be available at: http://localhost:$port"
            fi
        fi
        
        # Show recent logs
        if [[ -f "$LOG_FILE" ]]; then
            log "Recent logs:"
            tail -5 "$LOG_FILE" | sed 's/^/  /'
        fi
    else
        warning "$SERVICE_NAME is not running"
        return 1
    fi
}

# Build the project
build_project() {
    log "Building project..."
    cd "$SOURCE_DIR"
    
    # Run tests first
    log "Running tests..."
    npm test || error "Tests failed"
    
    # Type check
    log "Type checking..."
    npm run typecheck || error "Type check failed"
    
    # Build TypeScript
    log "Building TypeScript..."
    npm run build || error "Build failed"
    
    success "Build completed successfully"
}

# Deploy to target directory
deploy_project() {
    log "Deploying to $DEPLOY_DIR..."
    
    # Create backup of current deployment if it exists
    if [[ -d "$DEPLOY_DIR/node_modules/git-portfolio-manager" ]]; then
        log "Creating backup of current deployment..."
        local backup_dir="$DEPLOY_DIR/.portfolio-manager-backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$backup_dir"
        cp -r "$DEPLOY_DIR/node_modules/git-portfolio-manager" "$backup_dir/" 2>/dev/null || true
        success "Backup created: $backup_dir"
    fi
    
    # Create deployment directory structure
    mkdir -p "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    
    # Initialize npm if package.json doesn't exist
    if [[ ! -f "package.json" ]]; then
        log "Initializing npm in deployment directory..."
        npm init -y > /dev/null
        success "Created package.json"
    fi
    
    # Install/update the package from local source
    log "Installing/updating git-portfolio-manager..."
    npm install "$SOURCE_DIR" --save || error "Failed to install package"
    
    success "Deployment completed"
}

# Initialize config if it doesn't exist
init_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log "Config file not found, running interactive setup..."
        cd "$DEPLOY_DIR"
        npx git-portfolio-manager init --interactive || error "Failed to initialize configuration"
        success "Configuration initialized"
    else
        log "Using existing config: $CONFIG_FILE"
    fi
}

# Show help
show_help() {
    cat << EOF
Local Deployment Script for Git Portfolio Manager

Usage: $0 [COMMAND]

Commands:
    deploy          Full deployment (build + deploy + restart)
    build           Build TypeScript code only
    start           Start the service
    stop            Stop the service  
    restart         Restart the service
    status          Check service status
    logs            Show recent logs
    config          Initialize configuration
    help            Show this help

Files:
    Config:         $CONFIG_FILE
    PID File:       $PID_FILE
    Log File:       $LOG_FILE
    Deploy Dir:     $DEPLOY_DIR

Examples:
    $0 deploy       # Full deployment and restart
    $0 restart      # Restart running service
    $0 status       # Check if service is running
    $0 logs         # View recent logs
EOF
}

# Show logs
show_logs() {
    if [[ -f "$LOG_FILE" ]]; then
        log "Showing recent logs from $LOG_FILE"
        echo "----------------------------------------"
        tail -20 "$LOG_FILE"
        echo "----------------------------------------"
        log "To follow logs in real-time: tail -f $LOG_FILE"
    else
        warning "No log file found: $LOG_FILE"
    fi
}

# Main deployment function
main_deploy() {
    log "🚀 Starting deployment of $PROJECT_NAME"
    log "Source: $SOURCE_DIR"
    log "Target: $DEPLOY_DIR"
    
    # Stop service if running
    stop_service
    
    # Build project
    build_project
    
    # Deploy
    deploy_project
    
    # Initialize config if needed
    init_config
    
    # Start service
    start_service
    
    # Show status
    check_status
    
    success "🎉 Deployment completed successfully!"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main_deploy
        ;;
    "build")
        build_project
        ;;
    "start")
        start_service
        ;;
    "stop")
        stop_service
        ;;
    "restart")
        restart_service
        ;;
    "status")
        check_status
        ;;
    "logs")
        show_logs
        ;;
    "config")
        init_config
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        error "Unknown command: $1. Use 'help' to see available commands."
        ;;
esac