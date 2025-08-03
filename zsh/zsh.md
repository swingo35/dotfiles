# Zsh Configuration

Zsh (Z Shell) is a powerful shell with advanced completion, history, and customization features that enhance command-line productivity.

## Key Features

- **Auto-completion**: Intelligent command and path completion
- **History Management**: Advanced history search and sharing
- **Plugin System**: Extensive customization via Oh My Zsh
- **Prompt Customization**: Beautiful and informative prompts

## Configuration Structure

### File Organization
```
zsh/
├── zshrc              # Main configuration
├── aliases.zsh        # Command shortcuts  
└── functions.zsh      # Custom functions
```

### Loading Order
```bash
# System-wide configurations
/etc/zsh/zshrc

# User configurations  
~/.zshrc               # Main config (symlinked)
~/.zshrc.local         # Machine-specific overrides
```

## Essential Configuration

### Environment Setup
```bash
# Path configuration
export PATH="$HOME/.local/bin:$PATH"
export PATH="/opt/homebrew/bin:$PATH"
export PATH="$HOME/.cargo/bin:$PATH"

# Editor preferences
export EDITOR="nvim"
export VISUAL="nvim"

# Development tools
export ANTHROPIC_API_KEY="your-key-here"
export GITHUB_TOKEN="your-token-here"
```

### Shell Options
```bash
# History
setopt HIST_IGNORE_DUPS      # Don't record duplicate entries
setopt HIST_IGNORE_ALL_DUPS  # Remove old duplicates
setopt HIST_SAVE_NO_DUPS     # Don't save duplicates
setopt SHARE_HISTORY         # Share history across sessions
setopt INC_APPEND_HISTORY    # Append to history immediately

# Completion
setopt AUTO_CD               # cd by typing directory name
setopt CORRECT               # Suggest corrections for typos
setopt COMPLETE_IN_WORD      # Complete from both ends
```

## Key Bindings and Shortcuts

### Navigation
| Key Combination | Action |
|-----------------|--------|
| `Ctrl-A` | Beginning of line |
| `Ctrl-E` | End of line |
| `Ctrl-U` | Clear line before cursor |
| `Ctrl-K` | Clear line after cursor |
| `Alt-B/F` | Word backward/forward |

### History
| Key Combination | Action |
|-----------------|--------|
| `Ctrl-R` | Reverse history search |
| `Ctrl-P/N` | Previous/next command |
| `!!` | Repeat last command |
| `!n` | Execute command line n |
| `^old^new` | Replace old with new in last command |

### Completion
| Key Combination | Action |
|-----------------|--------|
| `Tab` | Complete command/path |
| `Tab Tab` | Show all completions |
| `Ctrl-D` | List completions |
| `Alt-.` | Insert last argument |

## Oh My Zsh Integration

### Plugin System
```bash
# Essential plugins
plugins=(
  git                    # Git aliases and functions
  zsh-autosuggestions   # Command suggestions  
  zsh-syntax-highlighting # Syntax highlighting
  fzf                   # Fuzzy finder integration
  brew                  # Homebrew completion
  docker                # Docker completion
  npm                   # Node.js completion
)
```

### Popular Plugins

#### git
```bash
# Aliases provided
g     # git
ga    # git add
gc    # git commit
gp    # git push
gl    # git pull
gst   # git status
```

#### zsh-autosuggestions
- Shows suggestions based on history
- Accept with `→` (right arrow)
- Partial accept with `Ctrl-→`

#### fzf
```bash
# Fuzzy file search: Ctrl-T
# Fuzzy directory change: Alt-C  
# Fuzzy history search: Ctrl-R
```

## Custom Aliases

### Navigation
```bash
alias ..='cd ..'
alias ...='cd ../..'
alias ~='cd ~'
alias -- -='cd -'

# Quick directory access
alias code='cd ~/code'
alias dots='cd ~/.dotfiles'
```

### Modern Tool Replacements
```bash
alias ls='eza --icons --group-directories-first'
alias ll='eza -la --icons --group-directories-first'  
alias cat='bat --style=plain'
alias grep='rg'
alias find='fd'
```

### Development Shortcuts
```bash
alias vim='nvim'
alias g='git'
alias dc='docker-compose'
alias k='kubectl'
alias be='bundle exec'
```

### tmux Integration
```bash
alias ta='tmux attach'
alias ts='tmux-sessionizer'
alias tk='tmux kill-session -t'
```

## Custom Functions

### Project Management
```bash
# Create and navigate to new project
newproject() {
    local name=$1
    mkdir -p ~/code/personal/$name
    cd ~/code/personal/$name
    git init
    echo "# $name" > README.md
}

# Quick project switching with fzf
proj() {
    local selected=$(find ~/code -mindepth 2 -maxdepth 2 -type d | fzf)
    if [[ -n $selected ]]; then
        cd "$selected"
        if [[ -z $TMUX ]]; then
            tmux-sessionizer "$selected"
        fi
    fi
}
```

### Utility Functions
```bash
# Extract any archive format
extract() {
    case $1 in
        *.tar.gz) tar xzf $1 ;;
        *.zip) unzip $1 ;;
        *.rar) unrar x $1 ;;
        *) echo "Unsupported format" ;;
    esac
}

# Kill process on port
killport() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [[ -n $pid ]]; then
        kill -9 $pid
        echo "Killed process on port $port"
    fi
}
```

## Prompt Customization

### Starship Prompt
```bash
# Install Starship
brew install starship

# Add to .zshrc
eval "$(starship init zsh)"

# Configuration in ~/.config/starship.toml
[character]
success_symbol = "[➜](bold green)"
error_symbol = "[➜](bold red)"

[git_branch]
format = "[$branch]($style) "
style = "bright-purple"
```

### Custom Prompt
```bash
# Git-aware prompt
autoload -Uz vcs_info
precmd() { vcs_info }
zstyle ':vcs_info:git:*' formats ' (%b)'
setopt PROMPT_SUBST
PROMPT='%F{cyan}%~%f%F{red}${vcs_info_msg_0_}%f %F{yellow}➜%f '
```

## Performance Optimization

### Startup Time Profiling
```bash
# Profile zsh startup
time zsh -i -c exit

# Debug slow plugins
zsh -xvs < /dev/null 2>&1 | grep -E '^[^+]*\+[^+]*\+[^+]*\+' | head -20
```

### Lazy Loading
```bash
# Lazy load Node.js
if command -v node >/dev/null 2>&1; then
    export NVM_DIR="$HOME/.nvm"
    alias node='unalias node && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && node'
fi
```

## Advanced Features

### Globbing Patterns
```bash
# List all JavaScript files recursively
ls **/*.js

# Case insensitive matching
ls (#i)*readme*

# Exclude patterns
ls ^*.tmp
```

### Parameter Expansion
```bash
# Variable manipulation
${var#pattern}     # Remove shortest match from beginning
${var##pattern}    # Remove longest match from beginning  
${var%pattern}     # Remove shortest match from end
${var%%pattern}    # Remove longest match from end
${var/old/new}     # Replace first occurrence
${var//old/new}    # Replace all occurrences
```

### Arrays and Loops
```bash
# Array operations
files=(*.txt)
echo ${#files[@]}  # Array length
echo ${files[1]}   # First element

# For loop
for file in *.js; do
    echo "Processing $file"
done
```

## Troubleshooting

### Common Issues

**Slow startup**
```bash
# Check startup time
time zsh -i -c exit

# Disable plugins one by one
# Comment out plugins in .zshrc
```

**Completion not working**
```bash
# Rebuild completion database
rm ~/.zcompdump*
compinit
```

**Oh My Zsh conflicts**
```bash
# Update Oh My Zsh
omz update

# Reset to default
cd ~/.oh-my-zsh/tools && ./uninstall.sh
```

**Environment variables not loading**
```bash
# Check load order
echo $PATH

# Source configuration manually  
source ~/.zshrc
```

## Integration with Other Tools

### fzf Integration
- `Ctrl-T`: Fuzzy file finder
- `Alt-C`: Fuzzy directory changer  
- `Ctrl-R`: Fuzzy history search
- Custom FZF_DEFAULT_COMMAND for better results

### Git Integration
- Branch name in prompt
- Git aliases and functions
- Automatic completion for git commands
- Status indicators for repository state

### Development Tool Integration
- Node.js/npm completion
- Docker command completion
- kubectl completion for Kubernetes
- Homebrew command completion