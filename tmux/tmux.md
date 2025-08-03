# tmux Configuration

tmux (terminal multiplexer) enables persistent terminal sessions with window and pane management for efficient development workflows.

## Key Features

- **Session Persistence**: Sessions survive terminal disconnections
- **Window Management**: Multiple windows per session
- **Pane Splitting**: Divide windows into multiple panes
- **Project Organization**: Dedicated sessions per project

## Configuration Overview

### Prefix Key
```bash
# Custom prefix (default: Ctrl-b)
set -g prefix C-a
unbind C-b
bind C-a send-prefix
```

### Session Management
```bash
# Session settings
set -g history-limit 50000
set -g status-interval 5
set -g escape-time 0
set -g repeat-time 600
```

### Visual Settings
```bash
# Status bar
set -g status-position bottom
set -g status-justify left
set -g status-style 'bg=colour234 fg=colour137'
```

## Essential Key Bindings

### Session Management
| Key Combination | Action |
|-----------------|--------|
| `tmux new -s name` | Create new session |
| `tmux attach -t name` | Attach to session |
| `tmux list-sessions` | List all sessions |
| `prefix + d` | Detach from session |
| `prefix + s` | Switch sessions |

### Window Management
| Key Combination | Action |
|-----------------|--------|
| `prefix + c` | Create new window |
| `prefix + ,` | Rename window |
| `prefix + &` | Kill window |
| `prefix + n/p` | Next/previous window |
| `prefix + 0-9` | Switch to window 0-9 |

### Pane Management
| Key Combination | Action |
|-----------------|--------|
| `prefix + %` | Split vertically |
| `prefix + "` | Split horizontally |
| `prefix + x` | Kill pane |
| `prefix + h/j/k/l` | Navigate panes (vim-style) |
| `prefix + H/J/K/L` | Resize panes |

### Copy Mode
| Key Combination | Action |
|-----------------|--------|
| `prefix + [` | Enter copy mode |
| `Space` | Start selection |
| `Enter` | Copy selection |
| `prefix + ]` | Paste |
| `q` | Exit copy mode |

## tmux-sessionizer Integration

### Automatic Project Sessions

The `tmux-sessionizer` script creates optimized sessions based on project type:

#### JavaScript/TypeScript Projects
```bash
# Window layout for JS/TS projects
Window 1: nvim (code editor)
Window 2: npm run dev (development server)  
Window 3: npm test (testing)
Window 4: git status (version control)
Window 5: claude-session (AI assistance)
```

#### Rust Projects
```bash
# Window layout for Rust projects  
Window 1: nvim (code editor)
Window 2: cargo run (development)
Window 3: cargo test (testing)
Window 4: git status (version control)
```

### Usage
```bash
# Interactive project selection
tmux-sessionizer

# Direct project session
tmux-sessionizer ~/code/my-project

# Quick alias
ts  # if aliased in shell
```

## Plugin System

### TPM (Tmux Plugin Manager)
```bash
# Plugin definitions
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-resurrect'
set -g @plugin 'tmux-plugins/tmux-continuum'
set -g @plugin 'tmux-plugins/tmux-yank'
```

### Essential Plugins

#### tmux-resurrect
- Saves and restores tmux sessions
- Persists across system restarts
```bash
# Save session: prefix + Ctrl-s
# Restore session: prefix + Ctrl-r
```

#### tmux-continuum  
- Automatic session saving
- Seamless session restoration
```bash
set -g @continuum-restore 'on'
set -g @continuum-save-interval '15'
```

#### tmux-yank
- Enhanced copy-paste functionality
- System clipboard integration
```bash
# Copy to system clipboard: prefix + y
# Copy current pane path: prefix + Y
```

## Advanced Configuration

### Custom Status Bar
```bash
# Left side: session name and window info
set -g status-left '#[fg=colour233,bg=colour241,bold] #S #[fg=colour241,bg=colour237,nobold]'

# Right side: time and date
set -g status-right '#[fg=colour233,bg=colour241,bold] %d/%m #[fg=colour233,bg=colour245,bold] %H:%M:%S '
```

### Mouse Support
```bash
# Enable mouse mode
set -g mouse on

# Mouse wheel scrolling
bind -n WheelUpPane if-shell -F -t = "#{mouse_any_flag}" "send-keys -M" "if -Ft= '#{pane_in_mode}' 'send-keys -M' 'select-pane -t=; copy-mode -e; send-keys -M'"
```

### Vim Integration
```bash
# Vim-style pane navigation
bind h select-pane -L
bind j select-pane -D  
bind k select-pane -U
bind l select-pane -R

# Vim-style copy mode
setw -g mode-keys vi
bind -T copy-mode-vi v send -X begin-selection
bind -T copy-mode-vi y send -X copy-pipe-and-cancel 'pbcopy'
```

## Performance Optimization

### Memory Management
```bash
# Limit history to prevent memory bloat
set -g history-limit 50000

# Reduce status update frequency
set -g status-interval 5

# Faster escape sequences
set -sg escape-time 0
```

### Session Cleanup
```bash
# Clean up old sessions
tmux list-sessions | grep -v attached | cut -d: -f1 | xargs -I {} tmux kill-session -t {}

# Monitor session count
tmux list-sessions | wc -l
```

## Troubleshooting

### Common Issues

**Colors not displaying correctly**
```bash
# Add to shell configuration
export TERM="screen-256color"
# Or in tmux.conf
set -g default-terminal "screen-256color"
```

**Key bindings not working**
```bash
# Reload configuration
tmux source-file ~/.tmux.conf
# Or: prefix + r (if configured)
```

**Sessions not persisting**
```bash
# Check tmux-resurrect plugin
ls ~/.tmux/resurrect/
# Manual save
tmux run-shell ~/.tmux/plugins/tmux-resurrect/scripts/save.sh
```

**High CPU usage**
```bash
# Check running processes
ps aux | grep tmux
# Reduce status update frequency
set -g status-interval 10
```

## Development Workflow Integration

### Git Worktree Workflow
- Each worktree gets its own tmux session
- Automatic session naming based on branch
- Isolated development environments

### Claude Code Integration  
- Dedicated AI assistance window
- Context-aware development sessions
- Seamless code sharing between panes

### Multi-Monitor Support
- Sessions span across AeroSpace workspaces
- Complementary to window tiling
- Organized development contexts