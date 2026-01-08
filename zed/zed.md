# Zed Editor Configuration

Modern, GPU-accelerated editor with built-in AI assistance and vim mode.

## Quick Start

```bash
# Install via Homebrew (done by install.sh)
brew install --cask zed

# Install CLI tool (run from within Zed)
# Command Palette > zed: install cli

# Verify installation
zed --version
```

## Key Features

- **Vim Mode**: Full vim emulation with custom keybindings
- **Built-in LSP**: No plugins needed for language support
- **AI Assistant**: Integrated Claude/OpenAI support with background agents
- **Performance**: GPU-accelerated rendering, instant startup
- **Git Integration**: Inline blame, diff view, hunk staging

## Keybindings Reference

### Leader Key: `Space`

All custom bindings use `Space` as the leader key, matching the Neovim workflow.

### File Navigation

| Binding | Action |
|---------|--------|
| `Space f f` | Find files (fuzzy finder) |
| `Space f g` | Live grep (search in files) |
| `Space f b` | Find buffers/tabs |
| `Space f r` | Recent projects |
| `Space f d` | Diagnostics panel |
| `Space f s` | Document outline/symbols |
| `Space e` or `-` | Toggle project panel |

### LSP Actions

| Binding | Action |
|---------|--------|
| `g d` | Go to definition |
| `g r` | Find all references |
| `g I` | Go to implementation |
| `g D` | Go to declaration |
| `K` | Hover documentation |
| `Space r n` | Rename symbol |
| `Space c a` | Code actions |
| `Space D` | Go to type definition |
| `Space d s` | Document symbols |
| `Space w s` | Workspace symbols |
| `Space l f` | Format document |

### Diagnostics

| Binding | Action |
|---------|--------|
| `[ d` | Previous diagnostic |
| `] d` | Next diagnostic |

### Git Operations

| Binding | Action |
|---------|--------|
| `Space g g` | Launch lazygit |
| `] c` | Next git hunk |
| `[ c` | Previous git hunk |
| `Space h p` | Preview hunk diff |
| `Space h b` | Toggle git blame |

### Buffer/Tab Management

| Binding | Action |
|---------|--------|
| `Tab` | Next buffer |
| `Shift-Tab` | Previous buffer |
| `Space x` | Close buffer |

### Window/Split Management

| Binding | Action |
|---------|--------|
| `Space s v` | Split vertically |
| `Space s h` | Split horizontally |
| `Space s x` | Close split |
| `Ctrl-h/j/k/l` | Navigate between panes |

### General

| Binding | Action |
|---------|--------|
| `Space w` | Save file |
| `Space q` | Close buffer |
| `Space Q` | Close window |
| `Space t` | Toggle terminal |
| `Space a` | Toggle AI assistant |
| `Escape` | Clear search highlights |

### Editing

| Binding | Action |
|---------|--------|
| `Alt-j` | Move line down |
| `Alt-k` | Move line up |
| `g c c` | Toggle comment (normal) |
| `g c` | Toggle comment (visual) |
| `<` / `>` | Indent/outdent (visual) |

## Tasks

Run tasks with `Cmd+Shift+T` or via Command Palette.

### Available Tasks

- **lazygit**: Terminal git UI
- **npm/bun**: dev, test, build, lint
- **cargo**: build, test, watch, clippy, run
- **go**: test, build, run
- **python**: run, pytest

## AI Assistant

The AI assistant panel is docked on the left. Toggle with `Space a`.

### Features

- **Inline Assistance**: Get help with code directly in the editor
- **Background Agents**: Run multiple AI tasks in parallel using container-use
- **Context Awareness**: AI understands your project structure

### Container-Use Background Agents

Zed supports running AI agents in isolated containers:
1. Install the Container-Use extension
2. Create a "Container-use" profile in Agent settings
3. Launch background tasks that run in parallel

## Configuration Files

```
~/.config/zed/
├── settings.json    # Main configuration
├── keymap.json      # Custom keybindings
└── tasks.json       # Task definitions
```

## Language Support

Built-in LSP support for:
- TypeScript/JavaScript (via typescript-language-server)
- Rust (via rust-analyzer with clippy)
- Python (via pyright)
- Go (via gopls)
- HTML/CSS/SCSS
- JSON/YAML/TOML
- Markdown

## Theme

Using Catppuccin with custom dark background (`#11111B`) applied via `experimental.theme_overrides`.

## Customization

### Change Font

Edit `settings.json`:
```json
{
  "buffer_font_family": "Your Font Name",
  "buffer_font_size": 16
}
```

### Add New Tasks

Edit `tasks.json` to add project-specific tasks:
```json
{
  "label": "my-task",
  "command": "npm run my-script",
  "use_new_terminal": true
}
```

### Add Keybindings

Edit `keymap.json`:
```json
{
  "context": "Editor && vim_mode == normal",
  "bindings": {
    "space m y": "your::Action"
  }
}
```

## Troubleshooting

### CLI Not Found

Run from Zed: Command Palette > `zed: install cli`

Or add to PATH manually:
```bash
export PATH="$PATH:/Applications/Zed.app/Contents/MacOS"
```

### LSP Not Working

1. Check the language server is installed
2. View logs: `Cmd+Shift+P` > "zed: open log"
3. Restart Zed or reload the project

### Vim Mode Issues

Ensure `"vim_mode": true` is set in settings.json. Check keymap.json for conflicting bindings.

## Integration with Workflow

Zed integrates with the dotfiles workflow:

- **tmux-sessionizer**: Opens `zed .` in editor windows
- **setup-worktree**: Launches Zed for new worktrees
- **claude-session**: Includes Zed in AI development sessions
- **Git**: Uses `zed --wait` as editor for commits
