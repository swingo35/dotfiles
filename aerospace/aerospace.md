# AeroSpace Configuration

AeroSpace is an i3-inspired tiling window manager for macOS that provides keyboard-driven window management with workspaces.

## Key Features

- **Tiling Window Management**: Automatic window arrangement
- **Workspace Organization**: 9 configurable workspaces  
- **Multi-Monitor Support**: Optimized layouts per monitor setup
- **Keyboard-Driven**: Minimal mouse interaction required

## Configuration Overview

### Workspace Layout
- **Workspaces 1-3**: Primary development (code, terminal, tools)
- **Workspaces 4-6**: Communication and monitoring
- **Workspaces 7-9**: Research, design, and miscellaneous

### Key Bindings

#### Workspace Navigation
| Key Combination | Action |
|-----------------|--------|
| `Hyper + 1-9` | Switch to workspace 1-9 |
| `Hyper + Tab` | Switch to recent workspace |

#### Window Management
| Key Combination | Action |
|-----------------|--------|
| `Hyper + H/J/K/L` | Focus window left/down/up/right |
| `Hyper + Shift + H/J/K/L` | Move window left/down/up/right |
| `Hyper + F` | Toggle fullscreen |
| `Hyper + Shift + Space` | Toggle floating |

#### Layout Control
| Key Combination | Action |
|-----------------|--------|
| `Hyper + R` | Resize mode |
| `Hyper + S` | Split horizontal |
| `Hyper + V` | Split vertical |
| `Hyper + E` | Toggle split orientation |

## Application Rules

### Automatic Workspace Assignment
```toml
# Development tools → Workspace 1-3
[[on-window-detected]]
if.app-id = 'com.microsoft.VSCode'
run = 'move-node-to-workspace 1'

# Communication → Workspace 4-6  
[[on-window-detected]]
if.app-id = 'com.tinyspeck.slackmacgap'
run = 'move-node-to-workspace 4'

# Browsers → Workspace 7-9
[[on-window-detected]]
if.app-id = 'com.google.Chrome'
run = 'move-node-to-workspace 7'
```

## Multi-Monitor Optimization

### Single Monitor
- All workspaces on main display
- Heavy use of workspace switching

### Dual Monitor  
- **Primary**: Development workspaces (1-5)
- **Secondary**: Communication and reference (6-9)

### Triple Monitor
- **Center**: Development focus (1-3)  
- **Left**: Communication and monitoring (4-6)
- **Right**: Research and design (7-9)

## Troubleshooting

### Common Issues

**Windows not tiling properly**
```bash
aerospace reload-config
aerospace workspace 1  # Force workspace switch
```

**AeroSpace not starting**
- Check System Settings → Privacy & Security → Accessibility
- Ensure AeroSpace has permission

**Performance issues**
```bash
# Restart AeroSpace weekly
pkill AeroSpace && open -a AeroSpace
```

### Configuration Testing
```bash
# Test configuration without restarting
aerospace --dry-run --config-path ~/.config/aerospace/aerospace.toml

# Reload configuration
aerospace reload-config
```

## Customization

### Adding New Keybindings
```toml
[mode.main.binding]
cmd-shift-enter = 'exec-and-forget open -n /Applications/Ghostty.app'
```

### Custom Application Rules
```toml
[[on-window-detected]]
if.app-id = 'your.app.id'
run = ['move-node-to-workspace 2', 'layout tiling']
```

## Performance Tips

- Restart AeroSpace weekly to prevent memory buildup
- Use `aerospace list-windows` to debug window detection
- Monitor CPU usage during intensive window operations
- Keep configuration changes minimal for stability

## Integration with Other Tools

- **Karabiner-Elements**: Provides Hyper key functionality
- **tmux**: Complements window management with terminal sessions
- **Claude Code**: Workspace organization enhances AI development sessions