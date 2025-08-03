# Karabiner-Elements Configuration

Karabiner-Elements provides advanced keyboard customization for macOS, enabling the creation of a Hyper key for window management and development shortcuts.

## Key Features

- **Hyper Key**: Transform Caps Lock into a modifier key
- **Complex Modifications**: Advanced key mapping rules
- **Application-Specific**: Context-aware key bindings
- **System Integration**: Works with AeroSpace and other tools

## Configuration Overview

### Hyper Key Concept
The Hyper key combines multiple modifiers (Cmd+Ctrl+Option+Shift) accessible via a single key press, providing extensive shortcut possibilities without conflicts.

```json
{
  "description": "Caps Lock to Hyper Key",
  "manipulators": [
    {
      "from": {
        "key_code": "caps_lock",
        "modifiers": { "optional": ["any"] }
      },
      "to": [
        {
          "key_code": "left_command",
          "modifiers": ["left_control", "left_option", "left_shift"]
        }
      ],
      "type": "basic"
    }
  ]
}
```

## Essential Key Mappings

### Window Management (AeroSpace Integration)
| Key Combination | Action |
|-----------------|--------|
| `Hyper + 1-9` | Switch to workspace 1-9 |
| `Hyper + H/J/K/L` | Focus window left/down/up/right |
| `Hyper + Shift + H/J/K/L` | Move window left/down/up/right |
| `Hyper + F` | Toggle fullscreen |
| `Hyper + Space` | Toggle floating |

### Application Shortcuts
| Key Combination | Action |
|-----------------|--------|
| `Hyper + T` | Launch Ghostty terminal |
| `Hyper + B` | Launch browser |
| `Hyper + E` | Launch editor |
| `Hyper + M` | Launch music app |
| `Hyper + C` | Launch calculator |

### Development Shortcuts
| Key Combination | Action |
|-----------------|--------|
| `Hyper + G` | Git status in current directory |
| `Hyper + P` | Project switcher (tmux-sessionizer) |
| `Hyper + W` | Create new worktree |
| `Hyper + R` | Restart development server |

## Configuration Structure

### Basic Rule Format
```json
{
  "description": "Rule description",
  "manipulators": [
    {
      "type": "basic",
      "from": {
        "key_code": "source_key",
        "modifiers": {
          "mandatory": ["left_command"],
          "optional": ["caps_lock"]
        }
      },
      "to": [
        {
          "key_code": "target_key",
          "modifiers": ["left_shift"]
        }
      ]
    }
  ]
}
```

### Application-Specific Rules
```json
{
  "description": "Terminal-specific shortcuts",
  "manipulators": [
    {
      "type": "basic",
      "from": {
        "key_code": "n",
        "modifiers": { "mandatory": ["left_command"] }
      },
      "to": [
        {
          "key_code": "t",
          "modifiers": ["left_command"]
        }
      ],
      "conditions": [
        {
          "type": "frontmost_application_if",
          "bundle_identifiers": ["com.mitchellh.ghostty"]
        }
      ]
    }
  ]
}
```

## Advanced Configurations

### Hyper + Arrow Keys for Window Management
```json
{
  "description": "Hyper + Arrow Keys for AeroSpace",
  "manipulators": [
    {
      "type": "basic",
      "from": {
        "key_code": "left_arrow",
        "modifiers": { "mandatory": ["left_command", "left_control", "left_option", "left_shift"] }
      },
      "to": [
        {
          "shell_command": "aerospace focus left"
        }
      ]
    }
  ]
}
```

### Text Manipulation
```json
{
  "description": "Enhanced text editing",
  "manipulators": [
    {
      "type": "basic",
      "from": {
        "key_code": "h",
        "modifiers": { "mandatory": ["left_control"] }
      },
      "to": [
        {
          "key_code": "delete_or_backspace"
        }
      ]
    }
  ]
}
```

### Mouse Key Simulation
```json
{
  "description": "Mouse keys via Hyper",
  "manipulators": [
    {
      "type": "basic", 
      "from": {
        "key_code": "j",
        "modifiers": { "mandatory": ["left_command", "left_control", "left_option", "left_shift"] }
      },
      "to": [
        {
          "mouse_key": { "y": 1536 }
        }
      ]
    }
  ]
}
```

## Development Workflow Integration

### tmux Session Management
```json
{
  "description": "Development session shortcuts",
  "manipulators": [
    {
      "type": "basic",
      "from": {
        "key_code": "p",
        "modifiers": { "mandatory": ["left_command", "left_control", "left_option", "left_shift"] }
      },
      "to": [
        {
          "shell_command": "open -a Ghostty --args -e tmux-sessionizer"
        }
      ]
    }
  ]
}
```

### Claude Code Integration
```json
{
  "description": "AI development shortcuts",
  "manipulators": [
    {
      "type": "basic",
      "from": {
        "key_code": "a",
        "modifiers": { "mandatory": ["left_command", "left_control", "left_option", "left_shift"] }
      },
      "to": [
        {
          "shell_command": "claude-session.sh --task 'Continue development'"
        }
      ]
    }
  ]
}
```

## Conditional Rules

### Application-Specific Behavior
```json
{
  "conditions": [
    {
      "type": "frontmost_application_if",
      "bundle_identifiers": [
        "com.microsoft.VSCode",
        "com.github.atom",
        "com.sublimetext.4"
      ]
    }
  ]
}
```

### Device-Specific Rules
```json
{
  "conditions": [
    {
      "type": "device_if",
      "identifiers": [
        {
          "vendor_id": 1452,
          "product_id": 641
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Common Issues

**Hyper key not working**
1. Check System Settings → Privacy & Security → Input Monitoring
2. Ensure Karabiner-Elements has permission
3. Restart Karabiner-Elements service

**Rules not applying**
```bash
# Restart Karabiner service
sudo launchctl kickstart -k system/org.pqrs.karabiner.karabiner_grabber
```

**Configuration not loading**
1. Check JSON syntax in configuration file
2. Use Karabiner-Elements EventViewer to debug
3. Verify bundle identifiers for applications

### Debug Tools

**EventViewer**
- Shows real-time key events
- Helps identify key codes and modifiers
- Useful for testing rules

**Log Analysis**
```bash
# View Karabiner logs
tail -f /var/log/karabiner/grabber.log
```

## Performance Optimization

### Rule Efficiency
- Use specific conditions to limit rule scope
- Avoid complex shell commands in frequently used keys
- Group related rules together

### System Impact
```json
{
  "parameters": {
    "delay_milliseconds_before_open_device": 1000,
    "basic.simultaneous_threshold_milliseconds": 50
  }
}
```

## Advanced Features

### Complex Modifications from Internet
1. Open Karabiner-Elements
2. Go to Complex Modifications tab
3. Click "Add rule" → "Import more rules from the Internet"
4. Popular rule sets:
   - "Emacs key bindings in terminal"
   - "VI Style Arrows"
   - "Mouse keys mode"

### Custom Shell Commands
```json
{
  "to": [
    {
      "shell_command": "osascript -e 'tell application \"System Events\" to key code 53'"
    }
  ]
}
```

### Simultaneous Key Presses
```json
{
  "type": "basic",
  "from": {
    "simultaneous": [
      { "key_code": "j" },
      { "key_code": "k" }
    ]
  },
  "to": [
    { "key_code": "escape" }
  ]
}
```

## Integration Examples

### AeroSpace Workspace Switching
```json
{
  "description": "Hyper + Numbers for AeroSpace workspaces", 
  "manipulators": [
    {
      "type": "basic",
      "from": {
        "key_code": "1",
        "modifiers": { "mandatory": ["left_command", "left_control", "left_option", "left_shift"] }
      },
      "to": [
        {
          "shell_command": "aerospace workspace 1"
        }
      ]
    }
  ]
}
```

### Quick Application Launcher
```json
{
  "description": "Hyper + Letters for quick app launch",
  "manipulators": [
    {
      "type": "basic",
      "from": {
        "key_code": "t",
        "modifiers": { "mandatory": ["left_command", "left_control", "left_option", "left_shift"] }
      },
      "to": [
        {
          "shell_command": "open -a Ghostty"
        }
      ]
    }
  ]
}
```

## Backup and Sync

### Configuration Backup
```bash
# Backup current configuration
cp ~/.config/karabiner/karabiner.json ~/.config/karabiner/karabiner.json.backup

# Restore from dotfiles
cp ~/.dotfiles/karabiner/karabiner.json ~/.config/karabiner/karabiner.json
```

### Version Control
- Keep karabiner.json in dotfiles repository
- Use installation script to copy (not symlink) due to app requirements
- Regular backups before major changes