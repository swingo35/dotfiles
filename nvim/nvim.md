# Neovim Configuration

Neovim is a modernized version of Vim with enhanced extensibility, performance, and built-in LSP support for a complete development experience.

## Key Features

- **Language Server Protocol (LSP)**: Native code intelligence
- **Lua Configuration**: Modern, performant configuration language
- **Plugin Ecosystem**: Extensive plugin support via lazy.nvim
- **Terminal Integration**: Built-in terminal emulator

## Configuration Structure

### Modular Organization
```
nvim/
├── init.lua                 # Entry point
└── lua/config/             # Modular configuration
    ├── options.lua         # Vim options
    ├── keymaps.lua         # Key bindings
    ├── plugins.lua         # Plugin definitions
    ├── lsp.lua            # LSP configuration
    └── autocmds.lua       # Auto commands
```

### Core Settings
```lua
-- Performance
vim.opt.updatetime = 250
vim.opt.timeoutlen = 300
vim.opt.lazyredraw = true

-- Editor behavior
vim.opt.number = true
vim.opt.relativenumber = true
vim.opt.signcolumn = "yes"
vim.opt.wrap = false

-- Search
vim.opt.ignorecase = true
vim.opt.smartcase = true
vim.opt.hlsearch = false
vim.opt.incsearch = true
```

## Essential Key Bindings

### Navigation
| Key Combination | Action |
|-----------------|--------|
| `h/j/k/l` | Move left/down/up/right |
| `w/b` | Word forward/backward |
| `gg/G` | Go to top/bottom |
| `Ctrl-u/d` | Half page up/down |
| `{/}` | Paragraph up/down |

### Editing
| Key Combination | Action |
|-----------------|--------|
| `i/a` | Insert before/after cursor |
| `I/A` | Insert at line start/end |
| `o/O` | New line below/above |
| `dd` | Delete line |
| `yy` | Copy line |
| `p/P` | Paste after/before |

### Visual Mode
| Key Combination | Action |
|-----------------|--------|
| `v` | Character visual mode |
| `V` | Line visual mode |
| `Ctrl-v` | Block visual mode |
| `y` | Copy selection |
| `d` | Delete selection |

### Search and Replace
| Key Combination | Action |
|-----------------|--------|
| `/pattern` | Search forward |
| `?pattern` | Search backward |
| `n/N` | Next/previous match |
| `:%s/old/new/g` | Replace all |
| `*/#` | Search word under cursor |

## LSP Configuration

### Language Servers
```lua
-- JavaScript/TypeScript
require('lspconfig').tsserver.setup{}

-- Rust
require('lspconfig').rust_analyzer.setup{}

-- Go
require('lspconfig').gopls.setup{}

-- Python
require('lspconfig').pyright.setup{}

-- Lua
require('lspconfig').lua_ls.setup{}
```

### LSP Key Bindings
| Key Combination | Action |
|-----------------|--------|
| `gd` | Go to definition |
| `gr` | Go to references |
| `gi` | Go to implementation |
| `K` | Show hover documentation |
| `<leader>rn` | Rename symbol |
| `<leader>ca` | Code actions |
| `<leader>f` | Format document |

## Plugin Ecosystem

### Plugin Manager (lazy.nvim)
```lua
-- Plugin specification
return {
  -- Git integration
  'tpope/vim-fugitive',
  
  -- File explorer
  'nvim-tree/nvim-tree.lua',
  
  -- Fuzzy finder
  {
    'nvim-telescope/telescope.nvim',
    dependencies = { 'nvim-lua/plenary.nvim' }
  },
  
  -- Syntax highlighting
  {
    'nvim-treesitter/nvim-treesitter',
    build = ':TSUpdate'
  }
}
```

### Essential Plugins

#### Telescope (Fuzzy Finder)
```lua
-- Find files: <leader>ff
-- Find in files: <leader>fg  
-- Find buffers: <leader>fb
-- Find help: <leader>fh
```

#### Treesitter (Syntax Highlighting)
```lua
require('nvim-treesitter.configs').setup {
  ensure_installed = { "lua", "javascript", "typescript", "rust", "go", "python" },
  highlight = { enable = true },
  indent = { enable = true }
}
```

#### nvim-tree (File Explorer)
```lua
-- Toggle: <leader>e
-- Focus: <leader>o
```

## Customization

### Color Schemes
```lua
-- Popular themes
use 'catppuccin/nvim'
use 'folke/tokyonight.nvim'  
use 'gruvbox-community/gruvbox'
use 'nordtheme/vim'

-- Set theme
vim.cmd.colorscheme 'catppuccin-mocha'
```

### Custom Key Maps
```lua
-- Example custom mappings
vim.keymap.set('n', '<leader>w', ':w<CR>', { desc = 'Save file' })
vim.keymap.set('n', '<leader>q', ':q<CR>', { desc = 'Quit' })
vim.keymap.set('n', '<Esc>', '<cmd>nohlsearch<CR>', { desc = 'Clear search highlight' })
```

### Auto Commands
```lua
-- Format on save
vim.api.nvim_create_autocmd('BufWritePre', {
  pattern = {'*.js', '*.ts', '*.jsx', '*.tsx'},
  callback = function()
    vim.lsp.buf.format()
  end,
})

-- Highlight on yank
vim.api.nvim_create_autocmd('TextYankPost', {
  callback = function()
    vim.highlight.on_yank()
  end,
})
```

## Performance Optimization

### Startup Time
```bash
# Profile startup time
nvim --startuptime startup.log

# Lazy load plugins
require('lazy').setup(plugins, {
  performance = {
    rtp = {
      disabled_plugins = {
        "gzip", "matchit", "matchparen", "netrwPlugin", "tarPlugin", "tohtml", "tutor", "zipPlugin"
      }
    }
  }
})
```

### Memory Usage
```lua
-- Optimize for large files
vim.opt.synmaxcol = 300
vim.opt.lazyredraw = true
vim.opt.regexpengine = 1
```

## Troubleshooting

### Common Issues

**LSP not working**
```lua
-- Check LSP status
:LspInfo

-- Restart LSP
:LspRestart

-- Check server installation
:Mason  -- if using mason.nvim
```

**Slow performance**
```bash
# Profile plugins
:Lazy profile

# Check health
:checkhealth
```

**Plugin errors**
```lua
-- Update plugins
:Lazy update

-- Clean unused plugins
:Lazy clean
```

### Configuration Testing
```lua
-- Reload configuration
:source $MYVIMRC

-- Check Lua syntax
:luafile %
```

## Development Workflow Integration

### Git Integration
- Built-in `:Git` commands via vim-fugitive
- Visual diff viewing and conflict resolution
- Seamless branch switching and commit workflows

### tmux Integration
- Terminal mode for running commands
- Seamless pane navigation between editor and terminal
- Project-specific configurations

### Claude Code Integration
- Optimized for AI-assisted development
- Easy code sharing and context building
- Enhanced copy-paste workflows

## Advanced Features

### Macros
```vim
" Record macro: q{register}
" Stop recording: q
" Play macro: @{register}
" Repeat last macro: @@
```

### Registers
```vim
" View registers: :registers
" Use register: "{register}
" System clipboard: "+
" Primary selection: "*
```

### Marks
```vim
" Set mark: m{a-z}
" Jump to mark: '{a-z}
" List marks: :marks
```