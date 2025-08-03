#!/usr/bin/env bash

# tmux-sessionizer: Intelligent project session management
# Quickly create or switch to tmux sessions based on project directories

set -e

# Configuration
CODE_DIRS=(
    "$HOME/code/personal"
    "$HOME/code/work" 
    "$HOME/code/forks"
    "$HOME/dotfiles"
    "$HOME/.config"
)

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

find_projects() {
    for dir in "${CODE_DIRS[@]}"; do
        if [[ -d "$dir" ]]; then
            find "$dir" -mindepth 1 -maxdepth 1 -type d
        fi
    done
}

get_session_name() {
    local project_path="$1"
    basename "$project_path" | tr . _
}

create_development_session() {
    local project_path="$1"
    local session_name="$2"
    
    # Create new session detached
    tmux new-session -d -s "$session_name" -c "$project_path"
    
    # Rename first window to 'main'
    tmux rename-window -t "$session_name:0" 'main'
    
    # Create additional windows based on project type
    setup_project_windows "$project_path" "$session_name"
    
    echo -e "${GREEN}Created session:${NC} $session_name"
    echo -e "${BLUE}Project path:${NC} $project_path"
}

setup_project_windows() {
    local project_path="$1"
    local session_name="$2"
    
    # Check project type and create appropriate windows
    if [[ -f "$project_path/package.json" ]]; then
        setup_javascript_project "$project_path" "$session_name"
    elif [[ -f "$project_path/Cargo.toml" ]]; then
        setup_rust_project "$project_path" "$session_name"
    elif [[ -f "$project_path/go.mod" ]]; then
        setup_go_project "$project_path" "$session_name"
    elif [[ -f "$project_path/pyproject.toml" ]] || [[ -f "$project_path/requirements.txt" ]]; then
        setup_python_project "$project_path" "$session_name"
    else
        setup_generic_project "$project_path" "$session_name"
    fi
}

setup_javascript_project() {
    local project_path="$1"
    local session_name="$2"
    
    # Editor window
    tmux new-window -t "$session_name:1" -n 'editor' -c "$project_path"
    tmux send-keys -t "$session_name:editor" 'nvim .' C-m
    
    # Development server window
    tmux new-window -t "$session_name:2" -n 'dev' -c "$project_path"
    
    # Testing window
    tmux new-window -t "$session_name:3" -n 'test' -c "$project_path"
    
    # Git operations
    tmux new-window -t "$session_name:4" -n 'git' -c "$project_path"
    tmux send-keys -t "$session_name:git" 'lazygit' C-m
    
    # If using Claude Code, set up AI assistance window
    if command -v claude &> /dev/null; then
        tmux new-window -t "$session_name:5" -n 'claude' -c "$project_path"
        tmux send-keys -t "$session_name:claude" 'claude --project .' C-m
    fi
}

setup_rust_project() {
    local project_path="$1"
    local session_name="$2"
    
    # Editor
    tmux new-window -t "$session_name:1" -n 'editor' -c "$project_path"
    tmux send-keys -t "$session_name:editor" 'nvim .' C-m
    
    # Build and run
    tmux new-window -t "$session_name:2" -n 'cargo' -c "$project_path"
    
    # Testing
    tmux new-window -t "$session_name:3" -n 'test' -c "$project_path"
    tmux send-keys -t "$session_name:test" 'cargo watch -x test' C-m
    
    # Git
    tmux new-window -t "$session_name:4" -n 'git' -c "$project_path"
    tmux send-keys -t "$session_name:git" 'lazygit' C-m
}

setup_go_project() {
    local project_path="$1"
    local session_name="$2"
    
    # Editor
    tmux new-window -t "$session_name:1" -n 'editor' -c "$project_path"
    tmux send-keys -t "$session_name:editor" 'nvim .' C-m
    
    # Development
    tmux new-window -t "$session_name:2" -n 'dev' -c "$project_path"
    
    # Testing
    tmux new-window -t "$session_name:3" -n 'test' -c "$project_path"
    tmux send-keys -t "$session_name:test" 'go test -v ./...' C-m
    
    # Git
    tmux new-window -t "$session_name:4" -n 'git' -c "$project_path"
    tmux send-keys -t "$session_name:git" 'lazygit' C-m
}

setup_python_project() {
    local project_path="$1"
    local session_name="$2"
    
    # Editor
    tmux new-window -t "$session_name:1" -n 'editor' -c "$project_path"
    tmux send-keys -t "$session_name:editor" 'nvim .' C-m
    
    # Development environment
    tmux new-window -t "$session_name:2" -n 'dev' -c "$project_path"
    
    # Testing
    tmux new-window -t "$session_name:3" -n 'test' -c "$project_path"
    
    # Git
    tmux new-window -t "$session_name:4" -n 'git' -c "$project_path"
    tmux send-keys -t "$session_name:git" 'lazygit' C-m
}

setup_generic_project() {
    local project_path="$1"
    local session_name="$2"
    
    # Editor
    tmux new-window -t "$session_name:1" -n 'editor' -c "$project_path"
    tmux send-keys -t "$session_name:editor" 'nvim .' C-m
    
    # Terminal
    tmux new-window -t "$session_name:2" -n 'terminal' -c "$project_path"
    
    # Git
    tmux new-window -t "$session_name:3" -n 'git' -c "$project_path"
    tmux send-keys -t "$session_name:git" 'lazygit' C-m
}

main() {
    local selected_path=""
    
    # If argument provided, use it directly
    if [[ $# -eq 1 ]]; then
        selected_path="$1"
    else
        # Use fzf to select project
        if command -v fzf &> /dev/null; then
            selected_path=$(find_projects | fzf --prompt="Select project: " --height=50% --layout=reverse --border)
        else
            echo "fzf not found. Please install fzf or provide a project path as argument."
            exit 1
        fi
    fi
    
    # Exit if no selection made
    if [[ -z "$selected_path" ]]; then
        exit 0
    fi
    
    # Validate path exists
    if [[ ! -d "$selected_path" ]]; then
        echo "Error: Directory does not exist: $selected_path"
        exit 1
    fi
    
    local session_name=$(get_session_name "$selected_path")
    
    # Check if session already exists
    if tmux has-session -t "$session_name" 2>/dev/null; then
        echo -e "${GREEN}Attaching to existing session:${NC} $session_name"
    else
        create_development_session "$selected_path" "$session_name"
    fi
    
    # Attach to session or switch if already inside tmux
    if [[ -z "$TMUX" ]]; then
        tmux attach-session -t "$session_name"
    else
        tmux switch-client -t "$session_name"
    fi
}

# Handle different invocation methods
case "${1:-}" in
    --help|-h)
        echo "tmux-sessionizer: Intelligent project session management"
        echo ""
        echo "Usage:"
        echo "  $0                    # Interactive project selection"
        echo "  $0 <project-path>     # Direct session creation/attachment"
        echo "  $0 --help             # Show this help"
        echo ""
        echo "Search directories:"
        printf "  %s\n" "${CODE_DIRS[@]}"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac