#!/usr/bin/env bash

# Claude Session Manager
# Intelligent AI-assisted development session setup with project context

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[CLAUDE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

print_usage() {
    cat << 'EOF'
Claude Session Manager - AI-Assisted Development

USAGE:
    claude-session.sh [options] [project-path]
    claude-session.sh --task <description>
    claude-session.sh --issue <number>

OPTIONS:
    -t, --task <desc>       Describe the task for Claude
    -i, --issue <number>    GitHub issue number for context
    -c, --config <file>     Custom Claude configuration file
    -p, --project <path>    Project directory (default: current)
    -s, --session <name>    tmux session name
    -w, --worktree         Use git worktree for the session
    --no-tmux              Don't create tmux session
    --no-context           Skip context generation
    -h, --help             Show this help

EXAMPLES:
    claude-session.sh --task "Refactor user authentication"
    claude-session.sh --issue 123 --worktree
    claude-session.sh -t "Add TypeScript support" -p ~/code/myproject
EOF
}

detect_project_type() {
    local project_path="$1"
    
    if [[ -f "$project_path/package.json" ]]; then
        echo "javascript"
    elif [[ -f "$project_path/Cargo.toml" ]]; then
        echo "rust"
    elif [[ -f "$project_path/go.mod" ]]; then
        echo "go"
    elif [[ -f "$project_path/pyproject.toml" ]] || [[ -f "$project_path/requirements.txt" ]]; then
        echo "python"
    elif [[ -f "$project_path/Gemfile" ]]; then
        echo "ruby"
    elif [[ -f "$project_path/composer.json" ]]; then
        echo "php"
    elif [[ -f "$project_path/pom.xml" ]] || [[ -f "$project_path/build.gradle" ]]; then
        echo "java"
    elif [[ -f "$project_path/Dockerfile" ]]; then
        echo "docker"
    else
        echo "generic"
    fi
}

generate_project_context() {
    local project_path="$1"
    local project_type="$2"
    local task_description="$3"
    local issue_number="$4"
    
    local context_file="$project_path/CLAUDE_CONTEXT.md"
    
    log "Generating project context..."
    
    cat > "$context_file" << EOF
# Claude Development Session Context

## Project Information
- **Path**: \`$project_path\`
- **Type**: $project_type
- **Generated**: $(date)

## Task Description
$task_description

EOF

    # Add issue context if provided
    if [[ -n "$issue_number" ]] && command -v gh &> /dev/null; then
        local issue_data=$(gh issue view "$issue_number" --json title,body,labels,assignees 2>/dev/null || echo "{}")
        local issue_title=$(echo "$issue_data" | jq -r '.title // "N/A"')
        local issue_body=$(echo "$issue_data" | jq -r '.body // "N/A"')
        local issue_labels=$(echo "$issue_data" | jq -r '.labels[]?.name // empty' | tr '\n' ', ' | sed 's/,$//')
        
        cat >> "$context_file" << EOF
## GitHub Issue #$issue_number
- **Title**: $issue_title
- **Labels**: $issue_labels

### Description
$issue_body

EOF
    fi

    # Add project structure
    cat >> "$context_file" << EOF
## Project Structure
\`\`\`
$(tree -L 3 -I 'node_modules|target|dist|build|.git' "$project_path" 2>/dev/null || find "$project_path" -type d -name ".git" -prune -o -type f -print | head -20)
\`\`\`

EOF

    # Add project-specific context
    case "$project_type" in
        javascript)
            add_javascript_context "$project_path" "$context_file"
            ;;
        rust)
            add_rust_context "$project_path" "$context_file"
            ;;
        go)
            add_go_context "$project_path" "$context_file"
            ;;
        python)
            add_python_context "$project_path" "$context_file"
            ;;
    esac

    # Add development guidelines
    cat >> "$context_file" << EOF
## Development Guidelines
1. **Code Quality**: Follow project conventions and best practices
2. **Testing**: Write tests for new functionality
3. **Documentation**: Update relevant documentation
4. **Git**: Use clear, descriptive commit messages
5. **Review**: Ensure code is ready for review

## Available Tools
- Git operations for version control
- Project-specific build tools and scripts
- Testing frameworks
- Linting and formatting tools

## Quick Commands
\`\`\`bash
# Run tests
npm test        # JavaScript/TypeScript
cargo test      # Rust
go test ./...   # Go
pytest          # Python

# Build project
npm run build   # JavaScript/TypeScript
cargo build     # Rust
go build        # Go
python setup.py build  # Python

# Lint and format
npm run lint    # JavaScript/TypeScript
cargo clippy    # Rust
golangci-lint run  # Go
black .         # Python
\`\`\`

## Next Steps
1. Review the task description and requirements
2. Analyze the current codebase
3. Plan the implementation approach
4. Write tests first (TDD approach)
5. Implement the feature incrementally
6. Test thoroughly and commit changes

---
*This context file is generated automatically for Claude Code sessions.*
EOF

    log "Context file generated: $context_file"
}

add_javascript_context() {
    local project_path="$1"
    local context_file="$2"
    
    cat >> "$context_file" << EOF
## JavaScript/TypeScript Project Details

### Package Information
$(if [[ -f "$project_path/package.json" ]]; then
    echo "\`\`\`json"
    jq '.name, .version, .description, .scripts, .dependencies' "$project_path/package.json" 2>/dev/null || cat "$project_path/package.json"
    echo "\`\`\`"
fi)

### TypeScript Configuration
$(if [[ -f "$project_path/tsconfig.json" ]]; then
    echo "\`\`\`json"
    cat "$project_path/tsconfig.json"
    echo "\`\`\`"
fi)

EOF
}

add_rust_context() {
    local project_path="$1"
    local context_file="$2"
    
    cat >> "$context_file" << EOF
## Rust Project Details

### Cargo Configuration
$(if [[ -f "$project_path/Cargo.toml" ]]; then
    echo "\`\`\`toml"
    cat "$project_path/Cargo.toml"
    echo "\`\`\`"
fi)

### Dependencies
$(if [[ -f "$project_path/Cargo.lock" ]]; then
    echo "Cargo.lock present - dependencies are locked"
fi)

EOF
}

add_go_context() {
    local project_path="$1"
    local context_file="$2"
    
    cat >> "$context_file" << EOF
## Go Project Details

### Module Information
$(if [[ -f "$project_path/go.mod" ]]; then
    echo "\`\`\`"
    cat "$project_path/go.mod"
    echo "\`\`\`"
fi)

EOF
}

add_python_context() {
    local project_path="$1"
    local context_file="$2"
    
    cat >> "$context_file" << EOF
## Python Project Details

### Project Configuration
$(if [[ -f "$project_path/pyproject.toml" ]]; then
    echo "\`\`\`toml"
    cat "$project_path/pyproject.toml"
    echo "\`\`\`"
elif [[ -f "$project_path/setup.py" ]]; then
    echo "\`\`\`python"
    head -20 "$project_path/setup.py"
    echo "\`\`\`"
fi)

### Requirements
$(if [[ -f "$project_path/requirements.txt" ]]; then
    echo "\`\`\`"
    cat "$project_path/requirements.txt"
    echo "\`\`\`"
fi)

EOF
}

create_claude_config() {
    local project_path="$1"
    local project_type="$2"
    local config_file="$project_path/.claude.json"
    
    log "Creating Claude configuration..."
    
    # Base configuration
    local allowed_tools='["Bash(git:*)", "View", "GlobTool", "GrepTool", "Write", "SearchTool"]'
    
    # Add project-specific tools
    case "$project_type" in
        javascript)
            allowed_tools='["Bash(npm:*)", "Bash(bun:*)", "Bash(node:*)", "Bash(git:*)", "View", "GlobTool", "GrepTool", "Write", "SearchTool"]'
            ;;
        rust)
            allowed_tools='["Bash(cargo:*)", "Bash(git:*)", "View", "GlobTool", "GrepTool", "Write", "SearchTool"]'
            ;;
        go)
            allowed_tools='["Bash(go:*)", "Bash(git:*)", "View", "GlobTool", "GrepTool", "Write", "SearchTool"]'
            ;;
        python)
            allowed_tools='["Bash(python:*)", "Bash(pip:*)", "Bash(poetry:*)", "Bash(git:*)", "View", "GlobTool", "GrepTool", "Write", "SearchTool"]'
            ;;
    esac
    
    cat > "$config_file" << EOF
{
  "projects": {
    "$project_path": {
      "allowedTools": $allowed_tools,
      "customInstructions": "You are working on a $project_type project. Always read CLAUDE_CONTEXT.md first for project-specific information and current task details. Follow the project's coding conventions and best practices. Run tests after making changes. Use descriptive commit messages that reference the task or issue being worked on."
    }
  }
}
EOF

    log "Claude configuration created: $config_file"
}

setup_tmux_session() {
    local project_path="$1"
    local session_name="$2"
    local project_type="$3"
    
    if ! command -v tmux &> /dev/null; then
        warn "tmux not found, skipping session creation"
        return 1
    fi
    
    # Check if session already exists
    if tmux has-session -t "$session_name" 2>/dev/null; then
        log "tmux session '$session_name' already exists"
        return 0
    fi
    
    log "Creating tmux session: $session_name"
    
    # Create session with main window
    tmux new-session -d -s "$session_name" -c "$project_path"
    tmux rename-window -t "$session_name:0" "claude"
    
    # Create additional windows based on project type
    tmux new-window -t "$session_name:1" -n "editor" -c "$project_path"
    tmux send-keys -t "$session_name:editor" "zed ." C-m
    
    tmux new-window -t "$session_name:2" -n "terminal" -c "$project_path"
    
    tmux new-window -t "$session_name:3" -n "git" -c "$project_path"
    tmux send-keys -t "$session_name:git" "lazygit" C-m
    
    # Project-specific setup
    case "$project_type" in
        javascript)
            tmux new-window -t "$session_name:4" -n "dev" -c "$project_path"
            if [[ -f "$project_path/package.json" ]] && jq -e '.scripts.dev' "$project_path/package.json" >/dev/null; then
                tmux send-keys -t "$session_name:dev" "npm run dev" C-m
            fi
            ;;
        rust)
            tmux new-window -t "$session_name:4" -n "watch" -c "$project_path"
            tmux send-keys -t "$session_name:watch" "cargo watch -x test" C-m
            ;;
        go)
            tmux new-window -t "$session_name:4" -n "test" -c "$project_path"
            tmux send-keys -t "$session_name:test" "go test -v ./..." C-m
            ;;
    esac
    
    # Select claude window
    tmux select-window -t "$session_name:claude"
    
    log "tmux session created successfully"
}

launch_claude() {
    local project_path="$1"
    local config_file="$project_path/.claude.json"
    
    if ! command -v claude &> /dev/null; then
        error "Claude Code not found. Install with: npm install -g @anthropic-ai/claude-code"
        return 1
    fi
    
    log "Launching Claude Code..."
    cd "$project_path"
    
    # Launch Claude with project configuration
    if [[ -f "$config_file" ]]; then
        claude --config "$config_file"
    else
        claude --project .
    fi
}

main() {
    local project_path=""
    local task_description=""
    local issue_number=""
    local custom_config=""
    local session_name=""
    local use_worktree=false
    local no_tmux=false
    local no_context=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                print_usage
                exit 0
                ;;
            -t|--task)
                task_description="$2"
                shift 2
                ;;
            -i|--issue)
                issue_number="$2"
                shift 2
                ;;
            -c|--config)
                custom_config="$2"
                shift 2
                ;;
            -p|--project)
                project_path="$2"
                shift 2
                ;;
            -s|--session)
                session_name="$2"
                shift 2
                ;;
            -w|--worktree)
                use_worktree=true
                shift
                ;;
            --no-tmux)
                no_tmux=true
                shift
                ;;
            --no-context)
                no_context=true
                shift
                ;;
            -*)
                error "Unknown option: $1"
                print_usage
                exit 1
                ;;
            *)
                if [[ -z "$project_path" ]]; then
                    project_path="$1"
                fi
                shift
                ;;
        esac
    done
    
    # Set defaults
    project_path="${project_path:-$(pwd)}"
    
    # Validate project path
    if [[ ! -d "$project_path" ]]; then
        error "Project directory does not exist: $project_path"
        exit 1
    fi
    
    # Ensure we have a task description
    if [[ -z "$task_description" && -z "$issue_number" ]]; then
        read -p "Describe the task for Claude: " task_description
        if [[ -z "$task_description" ]]; then
            error "Task description is required"
            exit 1
        fi
    fi
    
    # Handle worktree creation
    if [[ "$use_worktree" == true ]]; then
        if [[ -n "$issue_number" ]]; then
            log "Creating worktree for issue #$issue_number..."
            setup-worktree.sh --issue "$issue_number" --claude --tmux
            return $?
        else
            warn "Worktree requested but no issue number provided"
        fi
    fi
    
    # Detect project type
    local project_type=$(detect_project_type "$project_path")
    log "Detected project type: $project_type"
    
    # Generate session name if not provided
    if [[ -z "$session_name" ]]; then
        local project_name=$(basename "$project_path")
        if [[ -n "$issue_number" ]]; then
            session_name="${project_name}-issue-${issue_number}"
        else
            session_name="${project_name}-claude"
        fi
    fi
    
    # Generate context
    if [[ "$no_context" == false ]]; then
        generate_project_context "$project_path" "$project_type" "$task_description" "$issue_number"
    fi
    
    # Create Claude configuration
    if [[ -z "$custom_config" ]]; then
        create_claude_config "$project_path" "$project_type"
    else
        cp "$custom_config" "$project_path/.claude.json"
    fi
    
    # Set up tmux session
    if [[ "$no_tmux" == false ]]; then
        setup_tmux_session "$project_path" "$session_name" "$project_type"
        
        # Attach to tmux and launch Claude in the claude window
        log "Attaching to tmux session and launching Claude..."
        if [[ -z "$TMUX" ]]; then
            tmux attach-session -t "$session_name"
        else
            tmux switch-client -t "$session_name"
        fi
    else
        # Launch Claude directly
        launch_claude "$project_path"
    fi
}

main "$@"