#!/usr/bin/env bash

# Monitor Detection and AeroSpace Configuration
# Automatically configures AeroSpace based on detected monitor setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[MONITOR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Configuration paths
AEROSPACE_CONFIG_DIR="$HOME/.config/aerospace"
DOTFILES_DIR="$HOME/.dotfiles"

detect_monitors() {
    local monitor_count
    local monitor_info
    
    # Get monitor information using system_profiler
    monitor_info=$(system_profiler SPDisplaysDataType 2>/dev/null)
    monitor_count=$(echo "$monitor_info" | grep -c "Resolution:" || echo "0")
    
    # Alternative method using AeroSpace if available
    if command -v aerospace &> /dev/null; then
        local aerospace_monitors=$(aerospace list-monitors --format "%{monitor-name}" | wc -l | tr -d ' ')
        if [[ $aerospace_monitors -gt 0 ]]; then
            monitor_count=$aerospace_monitors
        fi
    fi
    
    log "Detected $monitor_count monitor(s)"
    
    # Get detailed monitor information
    if [[ $monitor_count -gt 1 ]]; then
        info "Monitor details:"
        system_profiler SPDisplaysDataType | grep -A 2 "Resolution:" || true
    fi
    
    echo "$monitor_count"
}

get_monitor_layout() {
    local monitor_count="$1"
    
    case $monitor_count in
        1)
            echo "single"
            ;;
        2)
            echo "dual"
            ;;
        3)
            echo "triple"
            ;;
        *)
            if [[ $monitor_count -gt 3 ]]; then
                echo "multi"
            else
                echo "single"
            fi
            ;;
    esac
}

create_single_monitor_config() {
    cat << 'EOF'
# AeroSpace Configuration - Single Monitor Setup

after-login-command = []
after-startup-command = []

automatically-unhide-macos-hidden-apps = false
default-root-container-layout = 'tiles'
default-root-container-orientation = 'auto'

enable-normalization-flatten-containers = true
enable-normalization-opposite-orientation-for-nested-containers = true

[gaps]
inner.horizontal = 8
inner.vertical = 8
outer.left = 8
outer.bottom = 8
outer.top = 8
outer.right = 8

# Single monitor workspace assignments
[workspace-to-monitor-force-assignment]
1 = 'main'  # Development
2 = 'main'  # Terminal
3 = 'main'  # Browser
4 = 'main'  # Communication
5 = 'main'  # Tools
6 = 'main'  # Documentation
7 = 'main'  # Media
8 = 'main'  # System
9 = 'main'  # Miscellaneous

# Application assignments optimized for single monitor
[[on-window-detected]]
if.app-id = 'com.microsoft.VSCode'
run = 'move-node-to-workspace 1'

[[on-window-detected]]
if.app-id = 'com.mitchellh.ghostty'
run = 'move-node-to-workspace 2'

[[on-window-detected]]
if.app-id = 'com.google.Chrome'
run = 'move-node-to-workspace 3'

[[on-window-detected]]
if.app-id = 'com.tinyspeck.slackmacgap'
run = 'move-node-to-workspace 4'

# Hyper Key Bindings (same for all layouts)
[mode.main.binding]
alt-cmd-ctrl-shift-h = 'focus left'
alt-cmd-ctrl-shift-j = 'focus down'
alt-cmd-ctrl-shift-k = 'focus up'
alt-cmd-ctrl-shift-l = 'focus right'

alt-cmd-ctrl-shift-1 = 'workspace 1'
alt-cmd-ctrl-shift-2 = 'workspace 2'
alt-cmd-ctrl-shift-3 = 'workspace 3'
alt-cmd-ctrl-shift-4 = 'workspace 4'
alt-cmd-ctrl-shift-5 = 'workspace 5'
alt-cmd-ctrl-shift-6 = 'workspace 6'
alt-cmd-ctrl-shift-7 = 'workspace 7'
alt-cmd-ctrl-shift-8 = 'workspace 8'
alt-cmd-ctrl-shift-9 = 'workspace 9'

alt-cmd-ctrl-shift-shift-1 = 'move-node-to-workspace 1'
alt-cmd-ctrl-shift-shift-2 = 'move-node-to-workspace 2'
alt-cmd-ctrl-shift-shift-3 = 'move-node-to-workspace 3'
alt-cmd-ctrl-shift-shift-4 = 'move-node-to-workspace 4'
alt-cmd-ctrl-shift-shift-5 = 'move-node-to-workspace 5'
alt-cmd-ctrl-shift-shift-6 = 'move-node-to-workspace 6'
alt-cmd-ctrl-shift-shift-7 = 'move-node-to-workspace 7'
alt-cmd-ctrl-shift-shift-8 = 'move-node-to-workspace 8'
alt-cmd-ctrl-shift-shift-9 = 'move-node-to-workspace 9'

alt-cmd-ctrl-shift-shift-h = 'move left'
alt-cmd-ctrl-shift-shift-j = 'move down'
alt-cmd-ctrl-shift-shift-k = 'move up'
alt-cmd-ctrl-shift-shift-l = 'move right'

alt-cmd-ctrl-shift-f = 'fullscreen'
alt-cmd-ctrl-shift-space = 'layout floating tiling'
alt-cmd-ctrl-shift-r = 'mode resize'
alt-cmd-ctrl-shift-return = 'exec-and-forget open -n /Applications/Ghostty.app'

[mode.resize.binding]
h = 'resize width -50'
j = 'resize height +50'
k = 'resize height -50'
l = 'resize width +50'
enter = 'mode main'
esc = 'mode main'

[mode.service.binding]
r = ['reload-config', 'mode main']
q = ['quit-aerospace', 'mode main']
esc = 'mode main'

[mode.main.binding]
alt-cmd-ctrl-shift-semicolon = 'mode service'
EOF
}

create_dual_monitor_config() {
    cat << 'EOF'
# AeroSpace Configuration - Dual Monitor Setup

after-login-command = []
after-startup-command = []

automatically-unhide-macos-hidden-apps = false
default-root-container-layout = 'tiles'
default-root-container-orientation = 'auto'

enable-normalization-flatten-containers = true
enable-normalization-opposite-orientation-for-nested-containers = true

[gaps]
inner.horizontal = 10
inner.vertical = 10
outer.left = 10
outer.bottom = 10
outer.top = 10
outer.right = 10

# Dual monitor workspace assignments
# Primary monitor: Development (1-5)
# Secondary monitor: Communication and docs (6-9)
[workspace-to-monitor-force-assignment]
1 = 'main'        # Code editor
2 = 'main'        # Terminal
3 = 'main'        # Development tools
4 = 'main'        # Testing
5 = 'main'        # Database/logs
6 = 'secondary'   # Browser
7 = 'secondary'   # Communication
8 = 'secondary'   # Documentation
9 = 'secondary'   # Media/misc

# Application assignments
[[on-window-detected]]
if.app-id = 'com.microsoft.VSCode'
run = 'move-node-to-workspace 1'

[[on-window-detected]]
if.app-id = 'com.mitchellh.ghostty'
run = 'move-node-to-workspace 2'

[[on-window-detected]]
if.app-id = 'com.google.Chrome'
run = 'move-node-to-workspace 6'

[[on-window-detected]]
if.app-id = 'com.tinyspeck.slackmacgap'
run = 'move-node-to-workspace 7'

[[on-window-detected]]
if.app-id = 'com.figma.Desktop'
run = 'move-node-to-workspace 8'

# Hyper Key Bindings
[mode.main.binding]
alt-cmd-ctrl-shift-h = 'focus left'
alt-cmd-ctrl-shift-j = 'focus down'
alt-cmd-ctrl-shift-k = 'focus up'
alt-cmd-ctrl-shift-l = 'focus right'

alt-cmd-ctrl-shift-1 = 'workspace 1'
alt-cmd-ctrl-shift-2 = 'workspace 2'
alt-cmd-ctrl-shift-3 = 'workspace 3'
alt-cmd-ctrl-shift-4 = 'workspace 4'
alt-cmd-ctrl-shift-5 = 'workspace 5'
alt-cmd-ctrl-shift-6 = 'workspace 6'
alt-cmd-ctrl-shift-7 = 'workspace 7'
alt-cmd-ctrl-shift-8 = 'workspace 8'
alt-cmd-ctrl-shift-9 = 'workspace 9'

alt-cmd-ctrl-shift-shift-1 = 'move-node-to-workspace 1'
alt-cmd-ctrl-shift-shift-2 = 'move-node-to-workspace 2'
alt-cmd-ctrl-shift-shift-3 = 'move-node-to-workspace 3'
alt-cmd-ctrl-shift-shift-4 = 'move-node-to-workspace 4'
alt-cmd-ctrl-shift-shift-5 = 'move-node-to-workspace 5'
alt-cmd-ctrl-shift-shift-6 = 'move-node-to-workspace 6'
alt-cmd-ctrl-shift-shift-7 = 'move-node-to-workspace 7'
alt-cmd-ctrl-shift-shift-8 = 'move-node-to-workspace 8'
alt-cmd-ctrl-shift-shift-9 = 'move-node-to-workspace 9'

alt-cmd-ctrl-shift-shift-h = 'move left'
alt-cmd-ctrl-shift-shift-j = 'move down'
alt-cmd-ctrl-shift-shift-k = 'move up'
alt-cmd-ctrl-shift-shift-l = 'move right'

alt-cmd-ctrl-shift-f = 'fullscreen'
alt-cmd-ctrl-shift-space = 'layout floating tiling'
alt-cmd-ctrl-shift-r = 'mode resize'
alt-cmd-ctrl-shift-return = 'exec-and-forget open -n /Applications/Ghostty.app'

[mode.resize.binding]
h = 'resize width -50'
j = 'resize height +50'
k = 'resize height -50'
l = 'resize width +50'
enter = 'mode main'
esc = 'mode main'

[mode.service.binding]
r = ['reload-config', 'mode main']
q = ['quit-aerospace', 'mode main']
esc = 'mode main'

[mode.main.binding]
alt-cmd-ctrl-shift-semicolon = 'mode service'
EOF
}

create_triple_monitor_config() {
    cat << 'EOF'
# AeroSpace Configuration - Triple Monitor Setup

after-login-command = []
after-startup-command = []

automatically-unhide-macos-hidden-apps = false
default-root-container-layout = 'tiles'
default-root-container-orientation = 'auto'

enable-normalization-flatten-containers = true
enable-normalization-opposite-orientation-for-nested-containers = true

[gaps]
inner.horizontal = 10
inner.vertical = 10
outer.left = 10
outer.bottom = 10
outer.top = 10
outer.right = 10

# Triple monitor workspace assignments
# Primary (center): Development (1-3)
# Left: Communication and monitoring (4-6)
# Right: Documentation and browser (7-9)
[workspace-to-monitor-force-assignment]
1 = 'main'        # Code editor
2 = 'main'        # Terminal/tmux sessions
3 = 'main'        # Development tools
4 = 'secondary'   # Communication (Slack, etc.)
5 = 'secondary'   # Monitoring/logs
6 = 'secondary'   # Database tools
7 = '3'           # Browser/docs
8 = '3'           # Design tools
9 = '3'           # Miscellaneous

# Application assignments
[[on-window-detected]]
if.app-id = 'com.microsoft.VSCode'
run = 'move-node-to-workspace 1'

[[on-window-detected]]
if.app-id = 'com.mitchellh.ghostty'
run = 'move-node-to-workspace 2'

[[on-window-detected]]
if.app-id = 'com.google.Chrome'
run = 'move-node-to-workspace 7'

[[on-window-detected]]
if.app-id = 'com.tinyspeck.slackmacgap'
run = 'move-node-to-workspace 4'

[[on-window-detected]]
if.app-id = 'com.figma.Desktop'
run = 'move-node-to-workspace 8'

[[on-window-detected]]
if.app-id = 'com.tableplus.TablePlus'
run = 'move-node-to-workspace 6'

# Hyper Key Bindings
[mode.main.binding]
alt-cmd-ctrl-shift-h = 'focus left'
alt-cmd-ctrl-shift-j = 'focus down'
alt-cmd-ctrl-shift-k = 'focus up'
alt-cmd-ctrl-shift-l = 'focus right'

alt-cmd-ctrl-shift-1 = 'workspace 1'
alt-cmd-ctrl-shift-2 = 'workspace 2'
alt-cmd-ctrl-shift-3 = 'workspace 3'
alt-cmd-ctrl-shift-4 = 'workspace 4'
alt-cmd-ctrl-shift-5 = 'workspace 5'
alt-cmd-ctrl-shift-6 = 'workspace 6'
alt-cmd-ctrl-shift-7 = 'workspace 7'
alt-cmd-ctrl-shift-8 = 'workspace 8'
alt-cmd-ctrl-shift-9 = 'workspace 9'

alt-cmd-ctrl-shift-shift-1 = 'move-node-to-workspace 1'
alt-cmd-ctrl-shift-shift-2 = 'move-node-to-workspace 2'
alt-cmd-ctrl-shift-shift-3 = 'move-node-to-workspace 3'
alt-cmd-ctrl-shift-shift-4 = 'move-node-to-workspace 4'
alt-cmd-ctrl-shift-shift-5 = 'move-node-to-workspace 5'
alt-cmd-ctrl-shift-shift-6 = 'move-node-to-workspace 6'
alt-cmd-ctrl-shift-shift-7 = 'move-node-to-workspace 7'
alt-cmd-ctrl-shift-shift-8 = 'move-node-to-workspace 8'
alt-cmd-ctrl-shift-shift-9 = 'move-node-to-workspace 9'

alt-cmd-ctrl-shift-shift-h = 'move left'
alt-cmd-ctrl-shift-shift-j = 'move down'
alt-cmd-ctrl-shift-shift-k = 'move up'
alt-cmd-ctrl-shift-shift-l = 'move right'

alt-cmd-ctrl-shift-f = 'fullscreen'
alt-cmd-ctrl-shift-space = 'layout floating tiling'
alt-cmd-ctrl-shift-r = 'mode resize'
alt-cmd-ctrl-shift-return = 'exec-and-forget open -n /Applications/Ghostty.app'

[mode.resize.binding]
h = 'resize width -50'
j = 'resize height +50'
k = 'resize height -50'
l = 'resize width +50'
enter = 'mode main'
esc = 'mode main'

[mode.service.binding]
r = ['reload-config', 'mode main']
q = ['quit-aerospace', 'mode main']
esc = 'mode main'

[mode.main.binding]
alt-cmd-ctrl-shift-semicolon = 'mode service'
EOF
}

apply_configuration() {
    local layout="$1"
    local config_file="$AEROSPACE_CONFIG_DIR/aerospace.toml"
    
    # Create configuration directory if it doesn't exist
    mkdir -p "$AEROSPACE_CONFIG_DIR"
    
    # Backup existing configuration
    if [[ -f "$config_file" ]]; then
        cp "$config_file" "$config_file.backup.$(date +%Y%m%d_%H%M%S)"
        log "Backed up existing configuration"
    fi
    
    # Apply new configuration based on layout
    case "$layout" in
        single)
            log "Applying single monitor configuration"
            create_single_monitor_config > "$config_file"
            ;;
        dual)
            log "Applying dual monitor configuration"
            create_dual_monitor_config > "$config_file"
            ;;
        triple)
            log "Applying triple monitor configuration"
            create_triple_monitor_config > "$config_file"
            ;;
        multi)
            log "Applying triple monitor configuration (for 4+ monitors)"
            create_triple_monitor_config > "$config_file"
            ;;
        *)
            error "Unknown layout: $layout"
            return 1
            ;;
    esac
    
    log "Configuration applied: $config_file"
}

reload_aerospace() {
    if command -v aerospace &> /dev/null; then
        log "Reloading AeroSpace configuration..."
        aerospace reload-config
        log "AeroSpace configuration reloaded successfully"
    else
        warn "AeroSpace not found in PATH"
    fi
}

print_summary() {
    local monitor_count="$1"
    local layout="$2"
    
    echo
    log "Monitor configuration complete!"
    info "Monitors detected: $monitor_count"
    info "Layout applied: $layout"
    echo
    echo "Workspace assignments:"
    
    case "$layout" in
        single)
            echo "  1-9: Main monitor (all workspaces)"
            ;;
        dual)
            echo "  1-5: Primary monitor (development)"
            echo "  6-9: Secondary monitor (communication/docs)"
            ;;
        triple)
            echo "  1-3: Primary monitor (development)"
            echo "  4-6: Secondary monitor (communication/monitoring)"
            echo "  7-9: Third monitor (browser/design)"
            ;;
    esac
    
    echo
    echo "Key bindings:"
    echo "  Hyper + 1-9: Switch to workspace"
    echo "  Hyper + Shift + 1-9: Move window to workspace"
    echo "  Hyper + H/J/K/L: Focus windows"
    echo "  Hyper + Shift + H/J/K/L: Move windows"
    echo
    info "Use 'Hyper + R' to reload configuration anytime"
}

watch_for_changes() {
    log "Monitoring for display changes..."
    log "Press Ctrl+C to stop monitoring"
    
    local last_count=$(detect_monitors)
    
    while true; do
        sleep 5
        local current_count=$(detect_monitors)
        
        if [[ "$current_count" != "$last_count" ]]; then
            log "Display change detected: $last_count → $current_count monitors"
            
            local new_layout=$(get_monitor_layout "$current_count")
            apply_configuration "$new_layout"
            reload_aerospace
            print_summary "$current_count" "$new_layout"
            
            last_count="$current_count"
        fi
    done
}

main() {
    local watch_mode=false
    local force_layout=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -w|--watch)
                watch_mode=true
                shift
                ;;
            -f|--force)
                force_layout="$2"
                shift 2
                ;;
            -h|--help)
                cat << 'EOF'
Monitor Detection and AeroSpace Configuration

USAGE:
    monitor-detect.sh [options]

OPTIONS:
    -w, --watch         Monitor for display changes continuously
    -f, --force <layout> Force a specific layout (single|dual|triple)
    -h, --help          Show this help

EXAMPLES:
    monitor-detect.sh                    # Detect and configure once
    monitor-detect.sh --watch            # Monitor for changes
    monitor-detect.sh --force dual       # Force dual monitor layout
EOF
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Force layout if specified
    if [[ -n "$force_layout" ]]; then
        log "Forcing layout: $force_layout"
        apply_configuration "$force_layout"
        reload_aerospace
        echo
        log "Forced configuration applied"
        return 0
    fi
    
    # Detect monitors and apply configuration
    local monitor_count=$(detect_monitors)
    local layout=$(get_monitor_layout "$monitor_count")
    
    apply_configuration "$layout"
    reload_aerospace
    print_summary "$monitor_count" "$layout"
    
    # Watch for changes if requested
    if [[ "$watch_mode" == true ]]; then
        watch_for_changes
    fi
}

main "$@"