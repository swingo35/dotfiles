# Modern macOS Developer Dotfiles

**Keyboard-driven, AI-enhanced development environment**

A complete, battle-tested configuration for macOS developers featuring window management, terminal multiplexing, and AI-assisted workflows.

## Quick Start

```bash
# Clone and setup
git clone <your-repo-url> ~/dotfiles
cd ~/dotfiles && ./install.sh

# Optional: symlink for zsh to source repo files
ln -sfn ~/dotfiles ~/.dotfiles

# Authenticate services
gh auth login && claude auth

# Start developing
tmux-sessionizer
```

## Core Philosophy

- **Keyboard-First**: Minimal mouse dependency
- **AI-Enhanced**: Claude Code integration for intelligent assistance  
- **Workspace-Organized**: AeroSpace manages windows across multiple monitors
- **Session-Persistent**: tmux maintains development contexts
- **Worktree-Based**: Git worktrees for parallel feature development

## Essential Tools

| Tool | Purpose | Key Features |
|------|---------|--------------|
| **AeroSpace** | Window Management | i3-inspired tiling, multi-monitor support |
| **Ghostty** | Terminal | GPU-accelerated, tmux integration |
| **tmux** | Session Management | Project-specific layouts, persistence |
| **Neovim** | Editor | LSP support, modern configuration |
| **Zsh** | Shell | Smart completion, plugin ecosystem |
| **Karabiner** | Keyboard | Hyper key for conflict-free shortcuts |

## Repository Structure

```
dotfiles/
├── README.md                 # This guide
├── install.sh               # One-command bootstrap
├── Brewfile                 # Homebrew dependencies
├── aerospace/              
│   ├── aerospace.toml       # Window management config
│   └── aerospace.md         # Setup guide & shortcuts
├── ghostty/
│   ├── config              # Terminal configuration  
│   └── ghostty.md          # Features & customization
├── tmux/
│   ├── tmux.conf           # Session management
│   ├── tmux-sessionizer.sh # Project automation
│   └── tmux.md             # Key bindings & workflows
├── nvim/
│   ├── init.lua            # Editor configuration
│   └── nvim.md             # LSP setup & plugins
├── zsh/
│   ├── zshrc               # Shell configuration
│   ├── aliases.zsh         # Command shortcuts
│   ├── functions.zsh       # Custom functions
│   └── zsh.md              # Customization guide
├── git/
│   ├── gitconfig           # Git settings
│   ├── gitignore_global    # Global ignore patterns
│   └── git.md              # Worktree workflow
├── karabiner/
│   ├── karabiner.json      # Hyper key setup
│   └── karabiner.md        # Key mapping guide
├── scripts/
│   ├── setup-worktree.sh   # Git worktree automation
│   ├── claude-session.sh   # AI development sessions
│   └── monitor-detect.sh   # Display configuration
└── zz-workflows/
    ├── daily-workflow.md    # Complete daily process
    ├── project-setup.md     # New project checklist
    └── ai-development.md    # Claude Code integration
```

## Key Workflows

### Daily Development
```bash
# Morning startup
tmux-sessionizer                    # Select/create project session
# Hyper + 1-9                      # Navigate AeroSpace workspaces
# Hyper + H/J/K/L                  # Focus/move windows
```

### Feature Development
```bash
# Create isolated worktree
setup-worktree.sh --issue 123      # GitHub issue → branch → worktree

# AI-assisted development  
claude-session.sh --issue 123      # Context-aware AI session

# Parallel development
# Multiple worktrees = multiple features simultaneously
```

### Project Management
```bash
# Quick project switching
tmux-sessionizer ~/code/project

# Workspace organization (multi-monitor)
# Workspaces 1-3: Development
# Workspaces 4-6: Communication  
# Workspaces 7-9: Research
```

## Essential Commands

| Command | Purpose |
|---------|---------|
| `tmux-sessionizer` | Interactive project switching |
| `setup-worktree.sh --issue N` | Create GitHub issue worktree |
| `claude-session.sh --task X` | Start AI development session |
| `Hyper + 1-9` | Switch AeroSpace workspaces |
| `proj` | Fuzzy project finder |

## Installation Guide

### Prerequisites
- macOS (tested on Sonoma 14.0+)
- Command Line Tools for Xcode
- Internet connection for downloading packages

### Quick Install
```bash
# 1. Clone the repository
git clone <your-repo-url> ~/dotfiles
cd ~/dotfiles

# 2. Run the installation script
./install.sh

# 3. Restart your terminal

# 4. Authenticate services
gh auth login      # GitHub CLI
claude auth login  # Claude Code
```

### What Gets Installed
- **Homebrew** package manager
- **Core tools**: git, gh, tmux, neovim, fzf, ripgrep
- **Applications**: Ghostty, AeroSpace, Karabiner-Elements
- **Fonts**: JetBrains Mono Nerd Font
- **Shell**: Zsh with Oh My Zsh and plugins
- **Configurations**: All dotfiles linked to `~/.config/`

### Post-Installation
1. **Grant permissions** in System Settings:
   - AeroSpace → Privacy & Security → Accessibility
   - Karabiner-Elements → Privacy & Security → Input Monitoring
2. **Configure Hyper Key** in Karabiner-Elements (Caps Lock → Hyper)
3. **Test the setup**:
   ```bash
   tmux-sessionizer  # Should open project selector
   ```

### First Session
```bash
tmux-sessionizer   # Start your first project session
```

## Documentation

Each tool has comprehensive documentation with setup guides, key bindings, and troubleshooting:

- [`aerospace/aerospace.md`](aerospace/aerospace.md) - Window management shortcuts
- [`tmux/tmux.md`](tmux/tmux.md) - Session management & key bindings  
- [`zsh/zsh.md`](zsh/zsh.md) - Shell customization & functions
- [`git/git.md`](git/git.md) - Worktree workflow & aliases
- [`zz-workflows/`](zz-workflows/) - Complete workflow examples

## Customization

**Machine-specific overrides:**
- `~/.zshrc.local` - Local shell customizations
- `~/.tmux.conf.local` - Local tmux settings
- `~/.gitconfig_work` - Work-specific git config

**Performance monitoring:**
```bash
# Profile shell startup time
time zsh -i -c exit
```

## Philosophy

This configuration prioritizes **developer velocity** through:
- **Keyboard efficiency** - Minimal mouse dependency
- **Context preservation** - Persistent sessions and workspaces
- **Intelligent automation** - AI assistance and smart defaults
- **Parallel workflows** - Multiple projects/features simultaneously

Start with the basics, gradually adopt advanced features, and customize based on your workflow patterns.
