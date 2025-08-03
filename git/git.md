# Git Configuration

Git configuration optimized for modern development workflows with worktree support, AI integration, and team collaboration.

## Key Features

- **Git Worktrees**: Isolated branch development without stashing
- **Smart Aliases**: Efficient shortcuts for common operations
- **GPG Signing**: Verified commits for security
- **Context Switching**: Separate configs for work/personal projects

## Configuration Overview

### Core Settings
```bash
[user]
    name = Your Name
    email = your.email@example.com
    signingkey = YOUR_GPG_KEY_ID

[core]
    editor = nvim
    autocrlf = false
    ignorecase = false
    excludesFile = ~/.gitignore_global

[init]
    defaultBranch = main
```

### Performance Optimization
```bash
[core]
    preloadindex = true
    fscache = true
    
[gc]
    auto = 256

[feature]
    manyFiles = true
```

## Essential Git Commands

### Basic Operations
| Command | Action |
|---------|--------|
| `git status` | Show working tree status |
| `git add .` | Stage all changes |
| `git commit -m "message"` | Commit with message |
| `git push` | Push to remote |
| `git pull` | Pull from remote |

### Branch Management
| Command | Action |
|---------|--------|
| `git branch` | List branches |
| `git branch -d name` | Delete branch |
| `git checkout -b name` | Create and switch branch |
| `git merge branch` | Merge branch |
| `git rebase main` | Rebase onto main |

### History and Inspection
| Command | Action |
|---------|--------|
| `git log --oneline` | Compact commit history |
| `git diff` | Show unstaged changes |
| `git diff --staged` | Show staged changes |
| `git show commit` | Show commit details |
| `git blame file` | Show line-by-line history |

## Git Worktree Workflow

### Why Worktrees?
- **No Stashing**: Keep work in progress across branches
- **Parallel Development**: Multiple features simultaneously  
- **Fast Context Switching**: Instant branch navigation
- **Isolated Environments**: Separate build artifacts per branch

### Worktree Commands
```bash
# Create worktree for new feature
git worktree add ../worktrees/feature-auth feature/authentication

# Create worktree from existing branch
git worktree add ../worktrees/bugfix bugfix/login-issue

# List all worktrees
git worktree list

# Remove worktree
git worktree remove ../worktrees/feature-auth

# Clean up deleted worktrees
git worktree prune
```

### Automated Worktree Management
```bash
# Using setup-worktree.sh script
setup-worktree.sh feature/user-auth     # New feature branch
setup-worktree.sh --issue 123           # GitHub issue branch
setup-worktree.sh --cleanup             # Clean merged worktrees
```

## Useful Git Aliases

### Productivity Aliases
```bash
[alias]
    st = status
    co = checkout
    br = branch
    ci = commit
    ca = commit -a
    cm = commit -m
    cam = commit -am
    
    # Advanced operations
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = !gitk
    
    # Pretty logging
    lg = log --oneline --graph --decorate
    lga = log --oneline --graph --decorate --all
    
    # Worktree shortcuts
    wt = worktree
    wta = worktree add
    wtl = worktree list
    wtr = worktree remove
```

### Advanced Aliases
```bash
[alias]
    # Find commits that changed a file
    follow = log --follow -p --
    
    # Show files in a commit
    files = diff-tree --no-commit-id --name-only -r
    
    # Undo last commit (keep changes)
    undo = reset --soft HEAD~1
    
    # Hard reset (lose changes)
    nuke = reset --hard HEAD
    
    # Interactive rebase last n commits
    reb = "!r() { git rebase -i HEAD~$1; }; r"
```

## Branch Naming Conventions

### Standard Patterns
```bash
feature/user-authentication      # New features
bugfix/login-redirect-issue      # Bug fixes
hotfix/security-patch           # Critical fixes
chore/update-dependencies       # Maintenance
docs/api-documentation          # Documentation
test/integration-tests          # Testing
refactor/user-service          # Code refactoring
```

### GitHub Integration
```bash
# Issue-based branches
issue/123-improve-performance
issue/456-fix-memory-leak

# Pull request branches  
pr/789-add-dark-mode
```

## GPG Commit Signing

### Setup GPG Key
```bash
# Generate GPG key
gpg --full-generate-key

# List keys
gpg --list-secret-keys --keyid-format LONG

# Export public key
gpg --armor --export YOUR_KEY_ID

# Add to GitHub/GitLab
```

### Configure Git
```bash
[user]
    signingkey = YOUR_KEY_ID
    
[commit]
    gpgsign = true
    
[tag]
    forceSignAnnotated = true
```

## Context-Specific Configuration

### Work/Personal Separation
```bash
# Main .gitconfig
[includeIf "gitdir:~/code/work/"]
    path = ~/.gitconfig_work
    
[includeIf "gitdir:~/code/personal/"]
    path = ~/.gitconfig_personal
```

### Work Configuration
```bash
# ~/.gitconfig_work
[user]
    name = Your Name
    email = you@company.com
    signingkey = WORK_GPG_KEY
    
[url "git@github-work:company/"]
    insteadOf = git@github.com:company/
```

## Global Gitignore

### Common Patterns
```bash
# OS generated files
.DS_Store
.DS_Store?  
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Development environments
.vscode/
.idea/
*.swp
*.swo
*~

# Languages and frameworks
node_modules/
*.log
.env
.env.local
*.tmp
*.temp

# Build artifacts
dist/
build/
target/
*.o
*.so
*.dylib
```

## Advanced Git Features

### Hooks Integration
```bash
# Pre-commit hook for code formatting
#!/bin/sh
# Run linter before commit
npm run lint
if [ $? -ne 0 ]; then
    echo "Linting failed. Please fix errors before committing."
    exit 1
fi
```

### Custom Merge Strategies
```bash
[merge]
    tool = nvim
    
[mergetool "nvim"]
    cmd = nvim -d $LOCAL $BASE $REMOTE $MERGED -c '$wincmd w' -c 'wincmd J'
```

### Submodule Management
```bash
# Add submodule
git submodule add https://github.com/user/repo.git path/to/submodule

# Update submodules
git submodule update --init --recursive

# Pull latest changes in submodules
git submodule update --remote
```

## Troubleshooting

### Common Issues

**Large repository performance**
```bash
# Enable partial clone
git clone --filter=blob:none <url>

# Maintenance
git maintenance start
```

**Merge conflicts**
```bash
# Abort merge
git merge --abort

# Continue after resolving
git add resolved-file
git commit
```

**Detached HEAD state**
```bash
# Create branch from detached HEAD
git checkout -b new-branch-name

# Return to main branch
git checkout main
```

**Accidental commits**
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (lose changes)  
git reset --hard HEAD~1

# Amend last commit message
git commit --amend -m "New message"
```

## GitHub CLI Integration

### Essential Commands
```bash
# Authentication
gh auth login

# Repository operations
gh repo create my-project
gh repo clone user/repo

# Issues and PRs
gh issue list
gh pr create --title "Feature" --body "Description"
gh pr checkout 123
```

### Workflow Integration
```bash
# Create worktree from GitHub issue
gh issue view 123
setup-worktree.sh --issue 123

# Create PR from current branch
gh pr create --web
```

## Performance Monitoring

### Repository Health
```bash
# Check repository size
git count-objects -vH

# Find large files
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | sed -n 's/^blob //p' | sort --numeric-sort --key=2 | tail -10

# Garbage collection
git gc --aggressive
```

### Optimization Settings
```bash
[core]
    precomposeunicode = false
    trustctime = false
    
[status]
    showUntrackedFiles = normal
    
[push]
    default = simple
    followTags = true
```