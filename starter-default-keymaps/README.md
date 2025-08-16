# Starter keymaps

This repository provides a simple collection of default keyboard shortcuts (keymaps) for a number of common developer tools installed via Homebrew on macOS.

Each tool under `keymaps/` has its own JSON file. Every file is an object with:

* `source` – link to the official documentation for the default keybindings.
* `keymaps` – array of objects with two fields:
  * `key` – the key combination as you would type it (e.g. `Cmd+N` or `C‑b %`).
  * `description` – a short human‑readable description of what the key does.

For tools that are purely command‑line utilities with no interactive interface, the `keymaps` array contains a single entry explaining that there are no default keybindings.

## Tools covered

- `tmux`
- `fzf`
- `ripgrep` (`rg`)
- `fd`
- `bat`
- `eza`
- `tree`
- `gh` (GitHub CLI)
- `lazygit`
- `ghostty`
- `aerospace`
- `karabiner-elements`
- `visual‑studio‑code`
- `bun`

Feel free to extend these files or generate your own based on your personal configuration. This project is only meant to serve as a starting point for a more sophisticated keymap exporter or PWA cheatsheet.
