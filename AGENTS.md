# Repository Guidelines

## Project Structure & Module Organization
- `aerospace/`: Window tiling config (`aerospace.toml`) and docs.
- `ghostty/`: Terminal settings under `config/`.
- `tmux/`: `tmux.conf` and `tmux-sessionizer.sh` for session automation.
- `nvim/`: Neovim `init.lua` and notes.
- `zsh/`: `zshrc`, aliases, and functions.
- `git/`: `gitconfig`, global ignore.
- `karabiner/`: `karabiner.json` for Hyper key.
- `scripts/`: Utilities (`setup-worktree.sh`, `claude-session.sh`, `monitor-detect.sh`).
- Root: `install.sh` bootstrap, `Brewfile`, `README.md`.

## Build, Test, and Development Commands
- Install/Bootstrap: `./install.sh` — installs Homebrew apps, links configs, sets defaults.
- Packages: `brew bundle --file Brewfile` — sync CLI apps and casks.
- Worktrees: `scripts/setup-worktree.sh --issue 123 -c -t` — branch, worktree, Claude, tmux.
- AI Session: `scripts/claude-session.sh --task "X" -p <path>` — generate context and launch Claude.
- Monitors: `scripts/monitor-detect.sh --force dual` — write AeroSpace config and reload.

## Coding Style & Naming Conventions
- Shell: POSIX/Bash, functions + small helpers; prefer kebab-case for scripts (e.g., `setup-worktree.sh`). Run `shellcheck scripts/*.sh` before PRs.
- Lua/TOML: 2 spaces, trailing commas where supported; keep options grouped and commented.
- Markdown: sentence-case headings, fenced code blocks with language tags.
- File layout: keep tool configs in their folder; link targets match `install.sh` expectations.

## Testing Guidelines
- Shell: `shellcheck scripts/*.sh`; dry-run risky steps; avoid destructive defaults.
- Tmux: `tmux -f tmux/tmux.conf start-server \; kill-server` to validate syntax.
- Neovim: `nvim --headless "+checkhealth" +qa` to surface issues.
- AeroSpace: apply and reload with `aerospace reload-config` after edits.
- Aim for “safe by default” scripts and clear error messages.

## Commit & Pull Request Guidelines
- History is minimal; adopt Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- Commits: small, scoped; reference issues/worktrees (e.g., `issue/#123`).
- PRs: include summary, before/after notes or screenshots (e.g., tiling layouts), commands to validate locally, and linked issues.

## Security & Configuration Tips
- Do not commit secrets or machine-specific overrides (`~/.zshrc.local`, `~/.gitconfig_work`).
- Validate changes won’t clobber user files; prefer symlinks where possible.
- After `install.sh`, verify permissions for AeroSpace and Karabiner in System Settings.

