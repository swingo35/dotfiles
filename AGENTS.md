# Dotfiles Repository Guidelines

## Purpose

Machine configuration for shell, editor, terminal, and window management.
**AI workflow tooling lives in [OmniTasker](~/Github/Omnitaskerv2)** via the `ot` CLI.

## Structure

| Directory | Purpose |
|-----------|---------|
| `aerospace/` | Window tiling config (`aerospace.toml`) |
| `ghostty/` | Terminal settings |
| `tmux/` | Multiplexer config and session automation |
| `nvim/` | Neovim config (`init.lua`) |
| `zsh/` | Shell config (zshrc, aliases, functions) |
| `git/` | Git config and global ignore |
| `karabiner/` | Hyper key and keyboard remapping |
| `scripts/` | Hardware utilities (monitor detection) |

## Commands

```bash
# Bootstrap machine
./install.sh

# Sync packages
brew bundle --file Brewfile

# Validate configs
shellcheck scripts/*.sh
tmux -f tmux/tmux.conf start-server \; kill-server
nvim --headless "+checkhealth" +qa
aerospace reload-config
```

## AI Workflows

Use OmniTasker CLI for AI-assisted development:

```bash
# Create worktree for issue
ot worktree create --issue 123 --repo ~/Github/myproject

# Spawn AI agent
ot agent spawn --task abc123 --agent claude-code

# Multi-agent orchestration
ot orchestrate --issue 42 --strategy parallel --agents "claude-code,pi"
```

See [OmniTasker docs](~/Github/Omnitaskerv2/docs/) for full CLI reference.

## Coding Conventions

- **Shell**: POSIX/Bash, kebab-case filenames, `shellcheck` clean
- **Lua/TOML**: 2-space indent, trailing commas, grouped options
- **Markdown**: Sentence-case headings, fenced code blocks with language tags
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)

## Adding New Tool Configs

1. Create directory: `toolname/`
2. Add config files matching tool's expected structure
3. Update `install.sh` to symlink: `ln -sf "$DOTFILES/toolname/config" "$HOME/.config/toolname"`
4. Document in this file's Structure table

## Security

- Never commit secrets or tokens
- Machine-specific overrides go in `~/.zshrc.local` or `~/.gitconfig_work`
- Verify permissions for AeroSpace and Karabiner in System Settings after install
