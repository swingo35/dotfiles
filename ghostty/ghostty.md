# Ghostty Terminal Configuration

Ghostty is a GPU-accelerated terminal emulator optimized for performance and modern development workflows.

## Key Features

- **GPU Acceleration**: Hardware-accelerated rendering for smooth performance
- **tmux Integration**: Seamless session management integration
- **Unicode Support**: Full emoji and symbol rendering
- **Customizable**: Extensive theming and configuration options

## Configuration Overview

### Performance Settings
```ini
# GPU acceleration
macos-option-as-alt = true
unfocused-split-opacity = 0.7

# Font configuration  
font-family = "JetBrains Mono Nerd Font"
font-size = 14
font-thicken = true
```

### Theme and Appearance
```ini
# Color scheme
theme = "catppuccin-mocha"
background-opacity = 0.95
window-padding-x = 10
window-padding-y = 10

# Cursor
cursor-style = "block"
cursor-style-blink = false
```

### Integration Settings
```ini
# Shell integration
shell-integration = "zsh"  
shell-integration-features = "cursor,sudo,title"

# tmux integration
copy-on-select = true
clipboard-read = "allow"
clipboard-write = "allow"
```

## Keyboard Shortcuts

### Navigation
| Key Combination | Action |
|-----------------|--------|
| `Cmd + T` | New tab |
| `Cmd + W` | Close tab |
| `Cmd + Shift + [/]` | Switch tabs |
| `Cmd + D` | Split pane horizontally |
| `Cmd + Shift + D` | Split pane vertically |

### Text Management
| Key Combination | Action |
|-----------------|--------|
| `Cmd + C` | Copy |
| `Cmd + V` | Paste |
| `Cmd + K` | Clear screen |
| `Cmd + F` | Find in terminal |

### Window Management
| Key Combination | Action |
|-----------------|--------|
| `Cmd + +/-` | Increase/decrease font size |
| `Cmd + 0` | Reset font size |
| `Cmd + Enter` | Toggle fullscreen |

## tmux Integration

### Automatic Session Launch
```bash
# Launch tmux-sessionizer on startup
shell-integration-features = "cursor,sudo,title,tmux"
command = "tmux-sessionizer"
```

### Copy-Paste Workflow
- Select text → automatically copied to system clipboard
- `Cmd + V` pastes from system clipboard
- tmux copy mode integrates seamlessly

## Performance Optimization

### GPU Settings
```ini
# Optimize for performance
macos-non-native-fullscreen = false
resize-overlay = false
resize-overlay-position = "center"
resize-overlay-duration = 100
```

### Memory Management
```ini
# Scrollback buffer
scrollback-limit = 10000
shell-integration-features = "cursor,sudo,title"
```

## Theme Customization

### Popular Themes
- `catppuccin-mocha` - Dark, modern theme
- `gruvbox-dark` - Warm, retro colors  
- `nord` - Cool, minimal palette
- `tokyo-night` - Vibrant dark theme

### Custom Colors
```ini
# Custom color palette
palette = [
  "#1e1e2e", # black
  "#f38ba8", # red  
  "#a6e3a1", # green
  "#f9e2af", # yellow
  "#89b4fa", # blue
  "#f5c2e7", # magenta
  "#94e2d5", # cyan  
  "#bac2de", # white
]
```

## Troubleshooting

### Common Issues

**Font rendering problems**
```ini
# Try different font settings
font-feature = "+liga"
font-codepoint-map = "U+E0A0-U+E0A3,U+E0C0-U+E0C7=FiraCode Nerd Font"
```

**Performance issues**
```ini
# Disable expensive features
unfocused-split-fill = "#1e1e2e"
unfocused-split-opacity = 1.0
```

**tmux integration not working**
```bash
# Check shell integration
echo $GHOSTTY_RESOURCES_DIR
```

### Reset Configuration
```bash
# Backup and reset
cp ~/.config/ghostty/config ~/.config/ghostty/config.backup
rm ~/.config/ghostty/config
# Restart Ghostty to generate defaults
```

## Advanced Configuration

### Custom Key Bindings
```ini
# Override default bindings
keybind = "ctrl+shift+c=copy_to_clipboard"
keybind = "ctrl+shift+v=paste_from_clipboard"
```

### Window Behavior
```ini
# Startup behavior
window-new-tab-position = "end"
confirm-close-surface = false
quit-after-last-window-closed = true
```

## Development Workflow Integration

### Project Switching
- Integrates with tmux-sessionizer for rapid project switching
- Maintains separate terminal environments per project
- Preserves session state across restarts

### AI Development
- Optimized for Claude Code integration
- Large scrollback buffer for context review
- Copy-paste optimization for code sharing