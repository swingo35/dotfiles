#!/usr/bin/env bash

# Monitor Detection and AeroSpace Configuration
# Automatically configures AeroSpace based on detected monitor + context (work/personal)

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

# Default context detection configuration
# Override by: --context, $DOTFILES_CONTEXT, or ~/.dotfiles/local/context.conf
# context.conf example:
#   host:Sean’s MacBook Pro=personal
#   host:Work-MBP=work
LOCAL_CONTEXT_FILE="$DOTFILES_DIR/local/context.conf"

# Helper: trim whitespace
trim() { sed -e 's/^\s\+//' -e 's/\s\+$//'; }

get_hostname() {
    local name
    name=$(scutil --get ComputerName 2>/dev/null || hostname) || true
    echo "$name"
}

detect_context() {
    local forced_context="$1"

    # 1) CLI flag precedence
    if [[ -n "$forced_context" ]]; then
        echo "$forced_context"
        return 0
    fi

    # 2) Env var
    if [[ -n "$DOTFILES_CONTEXT" ]]; then
        echo "$DOTFILES_CONTEXT"
        return 0
    fi

    # 3) Local mapping file by hostname
    if [[ -f "$LOCAL_CONTEXT_FILE" ]]; then
        local host
        host=$(get_hostname)
        local mapped
        mapped=$(grep -E "^host:${host}=" "$LOCAL_CONTEXT_FILE" 2>/dev/null | head -n1 | cut -d'=' -f2 | trim || true)
        if [[ -n "$mapped" ]]; then
            echo "$mapped"
            return 0
        fi
    fi

    # 4) Fallback
    echo "personal"
}

detect_monitors() {
    local monitor_count
    local monitor_info
    
    # Get monitor information using system_profiler
    monitor_info=$(system_profiler SPDisplaysDataType 2>/dev/null)
    monitor_count=$(echo "$monitor_info" | grep -c "Resolution:" || echo "0")

    # Built-in display presence
    local has_builtin="no"
    if echo "$monitor_info" | grep -qiE "Built-?in|Internal"; then
        has_builtin="yes"
    fi
    
    # Alternative method using AeroSpace if available
    if command -v aerospace &> /dev/null; then
        local aerospace_monitors=$(aerospace list-monitors --format "%{monitor-name}" | wc -l | tr -d ' ')
        if [[ $aerospace_monitors -gt 0 ]]; then
            monitor_count=$aerospace_monitors
        fi
    fi
    
    log "Detected $monitor_count monitor(s) (builtin: $has_builtin)"
    
    # Get detailed monitor information
    if [[ $monitor_count -gt 1 ]]; then
        info "Monitor details:"
        system_profiler SPDisplaysDataType | grep -A 2 "Resolution:" || true
    fi
    
    # Return: total_count builtin_flag
    echo "$monitor_count $has_builtin"
}

get_monitor_layout() {
    # Decide among: laptop, dual, dual+laptop, triple, triple+laptop, multi
    local total="$1"
    local builtin="$2"

    # external = total - (builtin ? 1 : 0)
    local external_count="$total"
    if [[ "$builtin" == "yes" ]]; then
        external_count=$(( total - 1 ))
    fi

    if [[ "$external_count" -le 0 ]]; then
        echo "laptop"
        return
    fi

    case "$external_count" in
        1)
            # Not requested, but treat as dual/dual+laptop
            if [[ "$builtin" == "yes" ]]; then
                echo "dual+laptop"
            else
                echo "dual"
            fi
            ;;
        2)
            if [[ "$builtin" == "yes" ]]; then
                echo "dual+laptop"
            else
                echo "dual"
            fi
            ;;
        3)
            if [[ "$builtin" == "yes" ]]; then
                echo "triple+laptop"
            else
                echo "triple"
            fi
            ;;
        *)
            # 4+ externals
            if [[ "$builtin" == "yes" ]]; then
                echo "multi+laptop"
            else
                echo "multi"
            fi
            ;;
    esac
}

create_laptop_config() {
    cat << 'EOF'
# AeroSpace Configuration - Laptop Only

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

# Laptop workspace assignments (all on builtin)
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

## work-only rules (chat/roam) are appended by context

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

alt-cmd-ctrl-shift-cmd-1 = 'move-node-to-workspace 1'
alt-cmd-ctrl-shift-cmd-2 = 'move-node-to-workspace 2'
alt-cmd-ctrl-shift-cmd-3 = 'move-node-to-workspace 3'
alt-cmd-ctrl-shift-cmd-4 = 'move-node-to-workspace 4'
alt-cmd-ctrl-shift-cmd-5 = 'move-node-to-workspace 5'
alt-cmd-ctrl-shift-cmd-6 = 'move-node-to-workspace 6'
alt-cmd-ctrl-shift-cmd-7 = 'move-node-to-workspace 7'
alt-cmd-ctrl-shift-cmd-8 = 'move-node-to-workspace 8'
alt-cmd-ctrl-shift-cmd-9 = 'move-node-to-workspace 9'

alt-cmd-ctrl-shift-cmd-h = 'move left'
alt-cmd-ctrl-shift-cmd-j = 'move down'
alt-cmd-ctrl-shift-cmd-k = 'move up'
alt-cmd-ctrl-shift-cmd-l = 'move right'

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

## work-only rules (chat/roam) are appended by context

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

alt-cmd-ctrl-shift-cmd-1 = 'move-node-to-workspace 1'
alt-cmd-ctrl-shift-cmd-2 = 'move-node-to-workspace 2'
alt-cmd-ctrl-shift-cmd-3 = 'move-node-to-workspace 3'
alt-cmd-ctrl-shift-cmd-4 = 'move-node-to-workspace 4'
alt-cmd-ctrl-shift-cmd-5 = 'move-node-to-workspace 5'
alt-cmd-ctrl-shift-cmd-6 = 'move-node-to-workspace 6'
alt-cmd-ctrl-shift-cmd-7 = 'move-node-to-workspace 7'
alt-cmd-ctrl-shift-cmd-8 = 'move-node-to-workspace 8'
alt-cmd-ctrl-shift-cmd-9 = 'move-node-to-workspace 9'

alt-cmd-ctrl-shift-cmd-h = 'move left'
alt-cmd-ctrl-shift-cmd-j = 'move down'
alt-cmd-ctrl-shift-cmd-k = 'move up'
alt-cmd-ctrl-shift-cmd-l = 'move right'

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

create_dual_laptop_monitor_config() {
    cat << 'EOF'
# AeroSpace Configuration - Dual + Laptop Setup

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

# With laptop open, use externals for 1-8 and keep 9 on laptop
[workspace-to-monitor-force-assignment]
1 = 'main'
2 = 'main'
3 = 'main'
4 = 'secondary'
5 = 'secondary'
6 = 'secondary'
7 = '3'
8 = '3'
9 = '4'   # laptop/builtin if AeroSpace exposes as 4th; fallback will place on main if missing

[[on-window-detected]]
if.app-id = 'com.microsoft.VSCode'
run = 'move-node-to-workspace 1'

[[on-window-detected]]
if.app-id = 'com.mitchellh.ghostty'
run = 'move-node-to-workspace 2'

[[on-window-detected]]
if.app-id = 'com.google.Chrome'
run = 'move-node-to-workspace 7'

## work-only rules (chat/roam) are appended by context

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

alt-cmd-ctrl-shift-cmd-1 = 'move-node-to-workspace 1'
alt-cmd-ctrl-shift-cmd-2 = 'move-node-to-workspace 2'
alt-cmd-ctrl-shift-cmd-3 = 'move-node-to-workspace 3'
alt-cmd-ctrl-shift-cmd-4 = 'move-node-to-workspace 4'
alt-cmd-ctrl-shift-cmd-5 = 'move-node-to-workspace 5'
alt-cmd-ctrl-shift-cmd-6 = 'move-node-to-workspace 6'
alt-cmd-ctrl-shift-cmd-7 = 'move-node-to-workspace 7'
alt-cmd-ctrl-shift-cmd-8 = 'move-node-to-workspace 8'
alt-cmd-ctrl-shift-cmd-9 = 'move-node-to-workspace 9'

alt-cmd-ctrl-shift-cmd-h = 'move left'
alt-cmd-ctrl-shift-cmd-j = 'move down'
alt-cmd-ctrl-shift-cmd-k = 'move up'
alt-cmd-ctrl-shift-cmd-l = 'move right'

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

## work-only rules (chat/roam) are appended by context

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

alt-cmd-ctrl-shift-cmd-1 = 'move-node-to-workspace 1'
alt-cmd-ctrl-shift-cmd-2 = 'move-node-to-workspace 2'
alt-cmd-ctrl-shift-cmd-3 = 'move-node-to-workspace 3'
alt-cmd-ctrl-shift-cmd-4 = 'move-node-to-workspace 4'
alt-cmd-ctrl-shift-cmd-5 = 'move-node-to-workspace 5'
alt-cmd-ctrl-shift-cmd-6 = 'move-node-to-workspace 6'
alt-cmd-ctrl-shift-cmd-7 = 'move-node-to-workspace 7'
alt-cmd-ctrl-shift-cmd-8 = 'move-node-to-workspace 8'
alt-cmd-ctrl-shift-cmd-9 = 'move-node-to-workspace 9'

alt-cmd-ctrl-shift-cmd-h = 'move left'
alt-cmd-ctrl-shift-cmd-j = 'move down'
alt-cmd-ctrl-shift-cmd-k = 'move up'
alt-cmd-ctrl-shift-cmd-l = 'move right'

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

create_triple_laptop_monitor_config() {
    cat << 'EOF'
# AeroSpace Configuration - Triple + Laptop Setup

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

# Triple + laptop: keep externals as 1-9 mapping, reserve 9 for laptop if available
[workspace-to-monitor-force-assignment]
1 = 'main'
2 = 'main'
3 = 'main'
4 = 'secondary'
5 = 'secondary'
6 = 'secondary'
7 = '3'
8 = '3'
9 = '4'   # laptop/builtin if exposed

[[on-window-detected]]
if.app-id = 'com.microsoft.VSCode'
run = 'move-node-to-workspace 1'

[[on-window-detected]]
if.app-id = 'com.mitchellh.ghostty'
run = 'move-node-to-workspace 2'

[[on-window-detected]]
if.app-id = 'com.google.Chrome'
run = 'move-node-to-workspace 7'

## work-only rules (chat/roam) are appended by context

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

alt-cmd-ctrl-shift-cmd-1 = 'move-node-to-workspace 1'
alt-cmd-ctrl-shift-cmd-2 = 'move-node-to-workspace 2'
alt-cmd-ctrl-shift-cmd-3 = 'move-node-to-workspace 3'
alt-cmd-ctrl-shift-cmd-4 = 'move-node-to-workspace 4'
alt-cmd-ctrl-shift-cmd-5 = 'move-node-to-workspace 5'
alt-cmd-ctrl-shift-cmd-6 = 'move-node-to-workspace 6'
alt-cmd-ctrl-shift-cmd-7 = 'move-node-to-workspace 7'
alt-cmd-ctrl-shift-cmd-8 = 'move-node-to-workspace 8'
alt-cmd-ctrl-shift-cmd-9 = 'move-node-to-workspace 9'

alt-cmd-ctrl-shift-cmd-h = 'move left'
alt-cmd-ctrl-shift-cmd-j = 'move down'
alt-cmd-ctrl-shift-cmd-k = 'move up'
alt-cmd-ctrl-shift-cmd-l = 'move right'

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
    local context="$2"   # work|personal
    local config_file="$AEROSPACE_CONFIG_DIR/aerospace.toml"

    # Create configuration directory if it doesn't exist
    mkdir -p "$AEROSPACE_CONFIG_DIR"

    # Backup existing configuration
    if [[ -f "$config_file" ]]; then
        cp "$config_file" "$config_file.backup.$(date +%Y%m%d_%H%M%S)"
        log "Backed up existing configuration"
    fi

    # Generate base by layout
    case "$layout" in
        laptop)
            log "Applying laptop configuration"
            create_laptop_config > "$config_file"
            ;;
        dual)
            log "Applying dual monitor configuration"
            create_dual_monitor_config > "$config_file"
            ;;
        dual+laptop)
            log "Applying dual + laptop configuration"
            create_dual_laptop_monitor_config > "$config_file"
            ;;
        triple)
            log "Applying triple monitor configuration"
            create_triple_monitor_config > "$config_file"
            ;;
        triple+laptop)
            log "Applying triple + laptop configuration"
            create_triple_laptop_monitor_config > "$config_file"
            ;;
        multi|multi+laptop)
            log "Applying triple configuration for multi-monitor"
            create_triple_monitor_config > "$config_file"
            ;;
        *)
            error "Unknown layout: $layout"
            return 1
            ;;
    esac

    # Context-specific rules
    if [[ "$context" == "work" ]]; then
        cat >> "$config_file" <<'WORKCTX'

# ---- Work context: communication and notes on vertical monitor ----
[[on-window-detected]]
if.app-name-regex = 'Google Chat|Chat'
run = 'move-node-to-workspace 4'

[[on-window-detected]]
if.app-name-regex = 'Roam|Roam Research'
run = 'move-node-to-workspace 5'

# Optional: send Ghostty running lazygit to workspace 6 if the title matches
[[on-window-detected]]
if.app-id = 'com.mitchellh.ghostty'
if.window-title-regex = 'lazygit'
run = 'move-node-to-workspace 6'
WORKCTX
        log "Applied work context rules (chat/roam/lazygit)"
    else
        # Personal context: vertical monitor apps + coding/note-taking
        cat >> "$config_file" <<'PERSONALCTX'

# ---- Personal context: vertical monitor (left) and workflows ----
# Vertical monitor (workspaces 4-6)
[[on-window-detected]]
if.app-id = 'com.spotify.client'
run = 'move-node-to-workspace 4'

[[on-window-detected]]
if.app-id = 'com.mitchellh.ghostty'
if.window-title-regex = 'lazygit'
run = 'move-node-to-workspace 5'

[[on-window-detected]]
if.app-id = 'com.google.Chrome'
if.window-title-regex = 'boot\\.dev'
run = 'move-node-to-workspace 6'

# Coding workflow
[[on-window-detected]]
if.app-id = 'com.microsoft.VSCodeInsiders'
run = 'move-node-to-workspace 1'

# Note-taking workflow
[[on-window-detected]]
if.app-id = 'md.obsidian'
run = 'move-node-to-workspace 3'

PERSONALCTX
        log "Applied personal context rules (spotify/lazygit/boot.dev, coding and note-taking)"
    fi

    log "Configuration applied: $config_file"
}

launch_for_context_and_layout() {
    local context="$1"
    local layout="$2"

    if ! command -v aerospace >/dev/null 2>&1; then
        warn "Cannot launch apps automatically: 'aerospace' CLI not found"
        return 0
    fi

    # Always launch core tools suited for FE work
    aerospace workspace 1 >/dev/null 2>&1 || true
    if [ -d "/Applications/Visual Studio Code - Insiders.app" ]; then
        open -na "/Applications/Visual Studio Code - Insiders.app" || true
    else
        open -na "/Applications/Visual Studio Code.app" || true
    fi

    aerospace workspace 2 >/dev/null 2>&1 || true
    open -na "/Applications/Ghostty.app" || true

    aerospace workspace 7 >/dev/null 2>&1 || true
    open -na "/Applications/Google Chrome.app" || true

    if [[ "$context" == "work" ]]; then
        # Vertical monitor: chat (4), roam (5), lazygit (6)
        aerospace workspace 4 >/dev/null 2>&1 || true
        # Prefer dedicated app if installed, else open Chat PWA
        if [ -d "/Applications/Google Chat.app" ]; then
            open -na "/Applications/Google Chat.app" || true
        else
            open -na "/Applications/Google Chrome.app" --args --new-window "https://chat.google.com" || true
        fi

        aerospace workspace 5 >/dev/null 2>&1 || true
        if [ -d "/Applications/Roam Research.app" ]; then
            open -na "/Applications/Roam Research.app" || true
        else
            open -na "/Applications/Google Chrome.app" --args --new-window "https://roamresearch.com/" || true
        fi

        aerospace workspace 6 >/dev/null 2>&1 || true
        # Try to open Ghostty and user can start lazygit
        open -na "/Applications/Ghostty.app" || true
    else
        # Personal context
        # Vertical monitor set: Spotify (4), Ghostty+LG (5), boot.dev (6)
        aerospace workspace 4 >/dev/null 2>&1 || true
        if [ -d "/Applications/Spotify.app" ]; then
            open -na "/Applications/Spotify.app" || true
        fi

        aerospace workspace 5 >/dev/null 2>&1 || true
        open -na "/Applications/Ghostty.app" || true

        aerospace workspace 6 >/dev/null 2>&1 || true
        open -na "/Applications/Google Chrome.app" --args --new-window "https://boot.dev" || true

        # Coding and note-taking
        aerospace workspace 1 >/dev/null 2>&1 || true
        if [ -d "/Applications/Visual Studio Code - Insiders.app" ]; then
            open -na "/Applications/Visual Studio Code - Insiders.app" || true
        fi

        aerospace workspace 3 >/dev/null 2>&1 || true
        if [ -d "/Applications/Obsidian.app" ]; then
            open -na "/Applications/Obsidian.app" || true
        fi
    fi
}

reload_aerospace() {
    if command -v aerospace &> /dev/null; then
        log "Reloading AeroSpace configuration..."
        if aerospace reload-config; then
            log "AeroSpace configuration reloaded successfully"
        else
            warn "AeroSpace reload failed; ensure AeroSpace.app is running"
        fi
    else
        warn "AeroSpace not found in PATH"
    fi
}

print_summary() {
    local monitor_count="$1"
    local layout="$2"
    local context="$3"
    
    echo
    log "Monitor configuration complete!"
    info "Monitors detected: $monitor_count"
    info "Layout applied: $layout"
    info "Context: $context"
    echo
    echo "Workspace assignments:"
    
    case "$layout" in
        laptop)
            echo "  1-9: Laptop display (all workspaces)"
            ;;
        dual)
            echo "  1-5: Primary monitor (development)"
            echo "  6-9: Secondary monitor (communication/docs)"
            ;;
        dual+laptop)
            echo "  1-8: External monitors"
            echo "  9: Laptop display"
            ;;
        triple)
            echo "  1-3: Primary monitor (development)"
            echo "  4-6: Secondary monitor (communication/monitoring)"
            echo "  7-9: Third monitor (browser/design)"
            ;;
        triple+laptop)
            echo "  1-8: External monitors"
            echo "  9: Laptop display"
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
    local context="$1"
    log "Monitoring for display changes..."
    log "Press Ctrl+C to stop monitoring"

    local last
    last=$(detect_monitors)

    while true; do
        sleep 5
        local current
        current=$(detect_monitors)

        if [[ "$current" != "$last" ]]; then
            local last_count last_builtin curr_count curr_builtin
            last_count=$(echo "$last" | awk '{print $1}')
            last_builtin=$(echo "$last" | awk '{print $2}')
            curr_count=$(echo "$current" | awk '{print $1}')
            curr_builtin=$(echo "$current" | awk '{print $2}')

            log "Display change detected: $last_count($last_builtin) → $curr_count($curr_builtin)"

            local new_layout
            new_layout=$(get_monitor_layout "$curr_count" "$curr_builtin")
            apply_configuration "$new_layout" "$context"
            reload_aerospace
            print_summary "$curr_count" "$new_layout" "$context"

            last="$current"
        fi
    done
}

main() {
    local watch_mode=false
    local force_layout=""
    local force_context=""
    local launch="false"
    
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
            -c|--context)
                force_context="$2"
                shift 2
                ;;
            -l|--launch)
                launch="true"
                shift
                ;;
            -h|--help)
                cat << 'EOF'
Monitor Detection and AeroSpace Configuration

USAGE:
    monitor-detect.sh [options]

OPTIONS:
    -w, --watch         Monitor for display changes continuously
    -f, --force <layout> Force a layout (laptop|dual|dual+laptop|triple|triple+laptop)
    -c, --context <ctx>  Force context (work|personal)
    -l, --launch         Launch common apps for the context
    -h, --help          Show this help

EXAMPLES:
    monitor-detect.sh                         # Detect and configure once
    monitor-detect.sh --watch                 # Monitor for changes
    monitor-detect.sh --force dual            # Force dual monitor layout
    monitor-detect.sh --context work --launch # Work context with app launch
EOF
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    local context
    context=$(detect_context "$force_context")

    # Force layout if specified
    if [[ -n "$force_layout" ]]; then
        log "Forcing layout: $force_layout (context: $context)"
        apply_configuration "$force_layout" "$context"
        reload_aerospace
        echo
        log "Forced configuration applied"
        return 0
    fi

    # Detect monitors and apply configuration
    local detected
    detected=$(detect_monitors)
    local monitor_count builtin
    monitor_count=$(echo "$detected" | awk '{print $1}')
    builtin=$(echo "$detected" | awk '{print $2}')
    local layout
    layout=$(get_monitor_layout "$monitor_count" "$builtin")

    apply_configuration "$layout" "$context"
    reload_aerospace
    print_summary "$monitor_count" "$layout" "$context"

    if [[ "$launch" == "true" ]]; then
        log "Launching apps for $context / $layout"
        launch_for_context_and_layout "$context" "$layout"
    fi

    # Watch for changes if requested
    if [[ "$watch_mode" == true ]]; then
        watch_for_changes "$context"
    fi
}

main "$@"
