# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a modern macOS developer dotfiles repository that provides a complete development environment setup. The repository contains configuration files and automation scripts for a keyboard-driven, AI-enhanced development workflow integrating AeroSpace (window management), Ghostty (terminal), tmux (session management), Neovim (editor), and various development tools.

## Essential Commands

### Installation and Setup
```bash
./install.sh                    # Complete environment bootstrap from scratch
brew bundle --file=Brewfile     # Install/update all dependencies via Homebrew
```

### Core Development Workflow Commands
```bash
# Project and session management
tmux-sessionizer                # Interactive project session selection with fzf
tmux-sessionizer <path>         # Create/attach to specific project session
./scripts/claude-session.sh --task "description"  # Start AI-assisted session with context
./scripts/claude-session.sh --issue 123           # Session for specific GitHub issue

# Git worktree workflow (core feature)
./scripts/setup-worktree.sh <feature>       # Create isolated worktree for feature development
./scripts/setup-worktree.sh --issue 123     # Create worktree for GitHub issue
./scripts/setup-worktree.sh --cleanup       # Clean up merged worktrees and branches

# System configuration management
./scripts/monitor-detect.sh                 # Detect monitors and configure AeroSpace
./scripts/monitor-detect.sh --watch         # Monitor for display changes
```

### Development Environment Testing
```bash
# Verify installation health
for tool in git gh tmux nvim aerospace claude bun; do
    command -v $tool &> /dev/null && echo "✅ $tool" || echo "❌ $tool missing"
done

# Performance diagnostics
time zsh -i -c exit             # Profile shell startup time
tmux list-sessions | wc -l      # Monitor tmux session count
aerospace --reload-config       # Restart AeroSpace for performance
```

## Architecture and Key Concepts

### Configuration Organization
The repository uses a **modular architecture** where each tool has its own directory with:
- **Configuration file** (e.g., `tmux.conf`, `aerospace.toml`)
- **Documentation file** (e.g., `tmux.md`, `aerospace.md`) with setup guides and key bindings
- **Tool-specific assets** (e.g., shell functions, automation scripts)

### Git Worktree Workflow (Core Pattern)
This dotfiles system is built around **git worktrees** for parallel development:
- Main repository stays in `~/code/project/`
- Worktrees created in `../worktrees/feature-name/`
- Each worktree gets its own tmux session
- Automated cleanup of merged branches and worktrees
- Integration with GitHub issues via `gh` CLI

### tmux Session Architecture
The `tmux-sessionizer.sh` script implements **intelligent project detection**:
- Scans predefined directories (`~/code/personal`, `~/code/work`, etc.)
- Auto-detects project type based on files (package.json → JS/TS, Cargo.toml → Rust)
- Creates **project-specific window layouts**:
  - JavaScript/TypeScript: dev server, testing, git, optional Claude windows
  - Rust: cargo commands, test watching, git
  - Go: testing, development, git
  - Python: development environment, testing, git

### AI Integration Pattern
Claude Code integration follows a **context-aware approach**:
- `claude-session.sh` generates project context files automatically
- Detects project type and creates appropriate tool permissions
- Integrates with tmux sessions for organized development
- Supports GitHub issue context for focused development sessions

### Multi-Monitor Workspace Strategy
AeroSpace configuration adapts to monitor setups:
- **Single Monitor**: All workspaces on main display with fast switching
- **Dual Monitor**: Development (workspaces 1-5) on primary, communication/docs (6-9) on secondary  
- **Triple Monitor**: Development (1-3) center, communication (4-6) left, browser/design (7-9) right
- Dynamic reconfiguration via `monitor-detect.sh`

### Automation Script Integration
All automation scripts follow consistent patterns:
- **Color-coded logging** (GREEN for success, YELLOW for warnings, RED for errors)
- **Comprehensive help text** and usage examples
- **Error handling** with proper exit codes
- **Configuration validation** before execution
- **Integration points** with other tools (tmux, gh CLI, Claude Code)

## Key Integration Points

### Shell and Terminal Integration
- **Zsh configuration** loads aliases (`aliases.zsh`) and functions (`functions.zsh`)
- **Ghostty terminal** auto-launches tmux-sessionizer on startup
- **tmux sessions** persist across terminal restarts
- **fzf integration** throughout for fuzzy finding (projects, files, history)

### Development Tools Chain
- **Homebrew Bundle** (`Brewfile`) manages all dependencies declaratively
- **Multiple language runtimes** supported (Node.js via Bun, Rust, Go, Python)
- **LSP integration** in Neovim for all supported languages
- **Git configuration** supports separate work/personal contexts via `includeIf`

### AI Development Enhancement
- **Project context generation** happens automatically in worktrees
- **Claude Code sessions** maintain state and project understanding
- **Documentation integration** with workflow examples in `zz-workflows/`
- **Context persistence** across development sessions

The system emphasizes **keyboard efficiency**, **context preservation**, and **intelligent automation** to minimize friction in development workflows.