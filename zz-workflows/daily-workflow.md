# Daily Development Workflow

A complete guide to the daily development workflow using the configured tools and automation.

## Morning Startup Sequence

### 1. System Initialization
```bash
# Open Ghostty terminal (auto-launches tmux-sessionizer)
open -a Ghostty

# Or use Hyper + T if Karabiner is configured
# Hyper + T
```

### 2. Project Selection
```bash
# Interactive project selection with fzf
tmux-sessionizer

# Or use the alias
ts

# Direct project session
tmux-sessionizer ~/code/my-project
```

### 3. Workspace Organization
- **AeroSpace automatically organizes windows**
- Use `Hyper + 1-9` to navigate between workspaces
- Development tools appear in workspaces 1-3
- Communication tools in workspaces 4-6
- Research/browsers in workspaces 7-9

## Feature Development Cycle

### 1. Issue Selection and Planning
```bash
# Browse GitHub issues with gh CLI
gh issue list --state open --assignee @me

# Or use GitHub dashboard
gh dash
```

### 2. Worktree Creation
```bash
# Create worktree for GitHub issue
setup-worktree.sh --issue 123

# Or create feature branch worktree
setup-worktree.sh feature/user-authentication

# Navigate to worktree
cd ../worktrees/issue-123
```

### 3. Development Environment Setup
```bash
# Start AI-assisted development session
claude-session.sh --issue 123

# Or generic AI session
claude-session.sh --task "Implement user authentication"
```

### 4. Coding Workflow
```bash
# Open editor in tmux window 1
# Terminal available in tmux window 2
# Development server in tmux window 3
# Git operations in tmux window 4
# Claude Code in tmux window 5 (if configured)
```

### 5. Testing and Validation
```bash
# Run tests (project-specific)
npm test        # Node.js projects
cargo test      # Rust projects  
go test ./...   # Go projects
pytest          # Python projects

# Or use the universal test function
test
```

### 6. Git Operations
```bash
# Stage and commit changes
git add .
git commit -m "feat: implement user authentication"

# Or use the quick commit function
gcm "feat: implement user authentication"

# Push to remote
git push -u origin feature/user-authentication
```

### 7. Pull Request Creation
```bash
# Create PR via GitHub CLI
gh pr create --title "Implement user authentication" --body "Closes #123"

# Or use web interface
gh pr create --web
```

## Context Switching Workflow

### Project Switching
```bash
# Quick project switching
tmux-sessionizer

# Or use the project search function
proj

# Or use Hyper + P (if configured in Karabiner)
```

### Branch/Worktree Switching
```bash
# List all worktrees
git worktree list

# Switch to different worktree
cd ../worktrees/another-feature

# Create tmux session for worktree
tmux-sessionizer .
```

### Window Management
```bash
# AeroSpace workspace navigation
# Hyper + 1-9: Switch workspaces
# Hyper + H/J/K/L: Navigate windows
# Hyper + Shift + H/J/K/L: Move windows
# Hyper + F: Toggle fullscreen
```

## Multi-tasking Workflow

### Parallel Development
```bash
# Work on multiple features simultaneously
cd ~/code/project
setup-worktree.sh feature/login
setup-worktree.sh feature/dashboard
setup-worktree.sh bugfix/memory-leak

# Each worktree gets its own tmux session
# Switch between them with tmux-sessionizer
```

### Monitoring and Communication
- **Workspace 4**: Slack/Discord for team communication
- **Workspace 5**: System monitoring, logs, metrics
- **Workspace 6**: Documentation, notes, planning tools

### Research and Reference
- **Workspace 7**: Web browser for documentation, Stack Overflow
- **Workspace 8**: Design tools, mockups, wireframes
- **Workspace 9**: Miscellaneous tools, utilities

## End-of-Day Workflow

### 1. Session Cleanup
```bash
# Save tmux sessions (if using tmux-resurrect)
# Sessions are automatically saved

# Clean up old worktrees
setup-worktree.sh --cleanup

# Remove unused tmux sessions
tmux list-sessions | grep -v attached | cut -d: -f1 | xargs -I {} tmux kill-session -t {}
```

### 2. Work Summary
```bash
# Review today's commits
git log --oneline --since="1 day ago" --author="$(git config user.name)"

# Check pull request status
gh pr list --author @me
```

### 3. Planning for Tomorrow
```bash
# Check assigned issues
gh issue list --assignee @me --state open

# Update project boards
gh project list
```

## Troubleshooting Workflow

### Performance Issues
```bash
# Check system health
~/.local/bin/health-check.sh

# Profile shell startup
time zsh -i -c exit

# Check tmux session count
tmux list-sessions | wc -l

# Monitor AeroSpace performance
# Activity Monitor → AeroSpace process
```

### Configuration Issues
```bash
# Reload configurations
source ~/.zshrc              # Shell config
tmux source-file ~/.tmux.conf   # tmux config
aerospace reload-config      # AeroSpace config

# Test configurations
aerospace --dry-run --config-path ~/.config/aerospace/aerospace.toml
```

### Git Issues
```bash
# Check repository health
git fsck
git gc --aggressive

# Resolve merge conflicts
git mergetool

# Reset to clean state
git reset --hard HEAD
git clean -fd
```

## Optimization Tips

### Keyboard Efficiency
- Learn Hyper key combinations for instant access
- Use tmux key bindings for terminal management
- Master AeroSpace workspace navigation
- Utilize vim/neovim modal editing

### Automation Usage
- Let tmux-sessionizer handle project setup
- Use setup-worktree.sh for branch management
- Leverage claude-session.sh for AI assistance
- Automate repetitive tasks with custom functions

### Context Preservation
- Keep worktrees for long-running features
- Use tmux sessions to maintain terminal state
- Organize workspaces consistently
- Document workflow decisions in project files

## Advanced Workflows

### AI-Enhanced Development
```bash
# Start development with AI context
claude-session.sh --issue 123

# Generate code with Claude Code
# Review and refactor with AI assistance
# Use AI for debugging and optimization
```

### Team Collaboration
```bash
# Pair programming setup
# Share tmux session: tmux new -s pair
# Other developer: tmux attach -t pair

# Code review workflow
gh pr checkout 456
# Review in separate worktree
# Test and provide feedback
```

### Release Management
```bash
# Create release worktree
setup-worktree.sh release/v1.2.0

# Merge features and test
# Tag and deploy
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0
```