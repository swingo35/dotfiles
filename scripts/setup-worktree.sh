#!/usr/bin/env bash

# Git Worktree Automation with Claude Code Integration
# Creates feature branches with isolated worktrees for efficient development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[WORKTREE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Configuration
WORKTREE_BASE_DIR="../worktrees"
DEFAULT_BASE_BRANCH="main"

print_usage() {
    cat << 'EOF'
Git Worktree Automation with Claude Code Integration

USAGE:
    setup-worktree.sh <feature-name> [options]
    setup-worktree.sh --issue <issue-number> [options]
    setup-worktree.sh --cleanup

OPTIONS:
    -b, --base <branch>     Base branch to branch from (default: main)
    -c, --claude           Launch Claude Code after setup
    -t, --tmux             Create tmux session for worktree
    -o, --open             Open in editor after setup
    --issue <number>       Create worktree for GitHub issue
    --cleanup              Clean up merged worktrees
    --list                 List all worktrees
    -h, --help             Show this help

EXAMPLES:
    setup-worktree.sh user-authentication --claude --tmux
    setup-worktree.sh --issue 123 --base develop
    setup-worktree.sh api-refactor -c -t -o
    setup-worktree.sh --cleanup
EOF
}

get_repo_info() {
    if ! git rev-parse --is-inside-work-tree &>/dev/null; then
        error "Not inside a git repository"
        exit 1
    fi
    
    REPO_ROOT=$(git rev-parse --show-toplevel)
    REPO_NAME=$(basename "$REPO_ROOT")
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    
    log "Repository: $REPO_NAME"
    log "Current branch: $CURRENT_BRANCH"
}

validate_base_branch() {
    local base_branch="$1"
    
    if ! git show-ref --verify --quiet "refs/heads/$base_branch"; then
        if ! git show-ref --verify --quiet "refs/remotes/origin/$base_branch"; then
            error "Base branch '$base_branch' does not exist locally or remotely"
            exit 1
        else
            log "Checking out remote branch: $base_branch"
            git checkout -b "$base_branch" "origin/$base_branch"
        fi
    fi
}

create_feature_branch() {
    local feature_name="$1"
    local base_branch="$2"
    
    # Sanitize feature name for branch name
    local branch_name="feature/${feature_name//[^a-zA-Z0-9-]/-}"
    branch_name="${branch_name,,}" # Convert to lowercase
    
    log "Creating feature branch: $branch_name"
    
    # Ensure we're on the base branch and it's up to date
    git checkout "$base_branch"
    git pull origin "$base_branch" || warn "Could not pull latest changes from origin"
    
    # Create feature branch if it doesn't exist
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        warn "Branch $branch_name already exists"
    else
        git checkout -b "$branch_name"
        log "Created new branch: $branch_name"
    fi
    
    echo "$branch_name"
}

create_issue_branch() {
    local issue_number="$1"
    local base_branch="$2"
    
    # Fetch issue details using GitHub CLI if available
    local issue_title=""
    if command -v gh &> /dev/null; then
        issue_title=$(gh issue view "$issue_number" --json title --jq '.title' 2>/dev/null || echo "")
        if [[ -n "$issue_title" ]]; then
            # Sanitize title for branch name
            local sanitized_title=$(echo "$issue_title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
            local branch_name="issue/${issue_number}-${sanitized_title}"
        else
            local branch_name="issue/${issue_number}"
        fi
    else
        local branch_name="issue/${issue_number}"
    fi
    
    log "Creating issue branch: $branch_name"
    
    # Ensure we're on the base branch and it's up to date
    git checkout "$base_branch"
    git pull origin "$base_branch" || warn "Could not pull latest changes from origin"
    
    # Create issue branch if it doesn't exist
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        warn "Branch $branch_name already exists"
    else
        git checkout -b "$branch_name"
        
        # Create initial commit with issue context if gh CLI is available
        if command -v gh &> /dev/null && [[ -n "$issue_title" ]]; then
            local issue_body=$(gh issue view "$issue_number" --json body --jq '.body' 2>/dev/null || echo "")
            local issue_labels=$(gh issue view "$issue_number" --json labels --jq '.labels[].name' 2>/dev/null | tr '\n' ' ' || echo "")
            
            git commit --allow-empty -m "Start work on issue #${issue_number}: ${issue_title}

${issue_body}

Labels: ${issue_labels}
Issue: #${issue_number}"
        else
            git commit --allow-empty -m "Start work on issue #${issue_number}"
        fi
        
        log "Created new issue branch: $branch_name"
    fi
    
    echo "$branch_name"
}

create_worktree() {
    local branch_name="$1"
    local worktree_name="${REPO_NAME}-${branch_name//\//-}"
    local worktree_path="${REPO_ROOT}/${WORKTREE_BASE_DIR}/${worktree_name}"
    
    # Create worktree base directory if it doesn't exist
    mkdir -p "$(dirname "$worktree_path")"
    
    # Check if worktree already exists
    if [[ -d "$worktree_path" ]]; then
        warn "Worktree already exists at: $worktree_path"
        echo "$worktree_path"
        return 0
    fi
    
    log "Creating worktree: $worktree_path"
    git worktree add "$worktree_path" "$branch_name"
    
    # Navigate to worktree
    cd "$worktree_path"
    
    # Initialize development environment
    setup_worktree_environment "$worktree_path" "$branch_name"
    
    echo "$worktree_path"
}

setup_worktree_environment() {
    local worktree_path="$1"
    local branch_name="$2"
    
    # Create Claude Code context file
    cat > "$worktree_path/CLAUDE_CONTEXT.md" << EOF
# Development Context for ${branch_name}

## Branch Information
- **Branch**: ${branch_name}
- **Repository**: ${REPO_NAME}
- **Worktree Path**: ${worktree_path}

## Development Setup
This is an isolated git worktree for feature development. The main repository
remains untouched while you work on this feature.

## Available Tools
- Git operations are isolated to this worktree
- Claude Code is configured for AI-assisted development
- tmux session management for organized workflow

## Next Steps
1. Review the codebase and understand the requirements
2. Plan your implementation approach
3. Write tests for new functionality
4. Implement features incrementally
5. Commit changes with descriptive messages
6. Push to remote when ready for review

## Useful Commands
- \`git status\` - Check current changes
- \`git add .\` - Stage all changes
- \`git commit -m "message"\` - Commit changes
- \`git push -u origin ${branch_name}\` - Push branch to remote
EOF

    log "Created development context file"
    
    # Install dependencies if package files exist
    if [[ -f "package.json" ]]; then
        log "Installing Node.js dependencies..."
        if command -v bun &> /dev/null; then
            bun install
        elif command -v npm &> /dev/null; then
            npm install
        fi
    elif [[ -f "requirements.txt" ]]; then
        log "Python project detected (install dependencies manually if needed)"
    elif [[ -f "Cargo.toml" ]]; then
        log "Rust project detected"
        cargo check || warn "Cargo check failed - dependencies may need attention"
    fi
}

launch_claude_code() {
    local worktree_path="$1"
    
    if ! command -v claude &> /dev/null; then
        warn "Claude Code not found. Install with: npm install -g @anthropic-ai/claude-code"
        return 1
    fi
    
    log "Launching Claude Code..."
    cd "$worktree_path"
    
    # Create or update Claude configuration for this project
    cat > "$worktree_path/.claude.json" << EOF
{
  "projects": {
    "${worktree_path}": {
      "allowedTools": [
        "Bash(git:*)",
        "View",
        "GlobTool", 
        "GrepTool",
        "Write",
        "SearchTool"
      ],
      "customInstructions": "This is a git worktree for feature development. Always check CLAUDE_CONTEXT.md for project-specific information. Run tests after making changes. Use descriptive commit messages."
    }
  }
}
EOF
    
    # Launch Claude Code in background
    claude --config .claude.json &
    log "Claude Code launched successfully"
}

create_tmux_session() {
    local worktree_path="$1"
    local branch_name="$2"
    
    if ! command -v tmux &> /dev/null; then
        warn "tmux not found, skipping session creation"
        return 1
    fi
    
    local session_name="${REPO_NAME}-${branch_name//\//-}"
    
    # Check if session already exists
    if tmux has-session -t "$session_name" 2>/dev/null; then
        log "tmux session '$session_name' already exists"
        return 0
    fi
    
    log "Creating tmux session: $session_name"
    
    # Create session with main window
    tmux new-session -d -s "$session_name" -c "$worktree_path"
    tmux rename-window -t "$session_name:0" "main"
    
    # Create editor window
    tmux new-window -t "$session_name:1" -n "editor" -c "$worktree_path"
    tmux send-keys -t "$session_name:editor" "nvim ." C-m
    
    # Create git window
    tmux new-window -t "$session_name:2" -n "git" -c "$worktree_path"
    tmux send-keys -t "$session_name:git" "lazygit" C-m
    
    # Select main window
    tmux select-window -t "$session_name:main"
    
    log "tmux session created successfully"
    echo "$session_name"
}

open_in_editor() {
    local worktree_path="$1"
    
    if command -v code &> /dev/null; then
        log "Opening in VS Code..."
        code "$worktree_path"
    elif command -v nvim &> /dev/null; then
        log "Opening in Neovim..."
        cd "$worktree_path"
        nvim .
    else
        log "No suitable editor found"
    fi
}

cleanup_merged_worktrees() {
    log "Cleaning up merged worktrees..."
    
    # Get list of merged branches
    local merged_branches=$(git branch --merged "$DEFAULT_BASE_BRANCH" | grep -E "(feature/|issue/)" | sed 's/^[ *]*//')
    
    if [[ -z "$merged_branches" ]]; then
        log "No merged feature branches found"
        return 0
    fi
    
    echo "Merged branches found:"
    echo "$merged_branches"
    echo
    
    for branch in $merged_branches; do
        local worktree_name="${REPO_NAME}-${branch//\//-}"
        local worktree_path="${REPO_ROOT}/${WORKTREE_BASE_DIR}/${worktree_name}"
        
        if [[ -d "$worktree_path" ]]; then
            read -p "Remove worktree for branch '$branch'? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log "Removing worktree: $worktree_path"
                git worktree remove "$worktree_path"
                
                read -p "Delete branch '$branch'? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    git branch -d "$branch"
                    log "Deleted branch: $branch"
                fi
            fi
        fi
    done
    
    # Prune worktree administrative files
    git worktree prune
    log "Cleanup complete"
}

list_worktrees() {
    log "Current worktrees:"
    git worktree list
}

main() {
    local feature_name=""
    local issue_number=""
    local base_branch="$DEFAULT_BASE_BRANCH"
    local launch_claude=false
    local create_tmux=false
    local open_editor=false
    local cleanup=false
    local list_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                print_usage
                exit 0
                ;;
            --cleanup)
                cleanup=true
                shift
                ;;
            --list)
                list_only=true
                shift
                ;;
            --issue)
                issue_number="$2"
                shift 2
                ;;
            -b|--base)
                base_branch="$2"
                shift 2
                ;;
            -c|--claude)
                launch_claude=true
                shift
                ;;
            -t|--tmux)
                create_tmux=true
                shift
                ;;
            -o|--open)
                open_editor=true
                shift
                ;;
            -*)
                error "Unknown option: $1"
                print_usage
                exit 1
                ;;
            *)
                if [[ -z "$feature_name" ]]; then
                    feature_name="$1"
                fi
                shift
                ;;
        esac
    done
    
    get_repo_info
    
    if [[ "$list_only" == true ]]; then
        list_worktrees
        exit 0
    fi
    
    if [[ "$cleanup" == true ]]; then
        cleanup_merged_worktrees
        exit 0
    fi
    
    if [[ -z "$feature_name" && -z "$issue_number" ]]; then
        error "Feature name or issue number required"
        print_usage
        exit 1
    fi
    
    validate_base_branch "$base_branch"
    
    # Create branch based on type
    local branch_name
    if [[ -n "$issue_number" ]]; then
        branch_name=$(create_issue_branch "$issue_number" "$base_branch")
    else
        branch_name=$(create_feature_branch "$feature_name" "$base_branch")
    fi
    
    # Create worktree
    local worktree_path=$(create_worktree "$branch_name")
    
    # Optional integrations
    local session_name=""
    if [[ "$create_tmux" == true ]]; then
        session_name=$(create_tmux_session "$worktree_path" "$branch_name")
    fi
    
    if [[ "$launch_claude" == true ]]; then
        launch_claude_code "$worktree_path"
    fi
    
    if [[ "$open_editor" == true ]]; then
        open_in_editor "$worktree_path"
    fi
    
    # Summary
    echo
    log "Worktree setup complete!"
    info "Branch: $branch_name"
    info "Path: $worktree_path"
    
    if [[ -n "$session_name" ]]; then
        info "tmux session: $session_name"
        echo
        echo "To attach to tmux session:"
        echo "  tmux attach -t $session_name"
    fi
    
    echo
    echo "To navigate to worktree:"
    echo "  cd $worktree_path"
}

main "$@"