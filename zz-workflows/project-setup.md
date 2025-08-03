# Project Setup Workflow

Complete guide for setting up new projects with the configured development environment.

## New Project Creation

### 1. Project Initialization
```bash
# Create project directory
mkdir -p ~/code/personal/my-new-project
cd ~/code/personal/my-new-project

# Or use the newproject function
newproject my-new-project
```

### 2. Git Repository Setup
```bash
# Initialize git repository
git init
git branch -M main

# Create initial files
echo "# My New Project" > README.md
cp ~/.dotfiles/git/gitignore_global .gitignore

# Initial commit
git add .
git commit -m "feat: initial project setup"
```

### 3. GitHub Repository Creation
```bash
# Create GitHub repository
gh repo create my-new-project --public --source=. --remote=origin --push

# Or private repository
gh repo create my-new-project --private --source=. --remote=origin --push
```

## Project Type-Specific Setup

### JavaScript/TypeScript Project
```bash
# Initialize package.json
bun init
# or npm init -y

# Install common dependencies
bun add -d typescript @types/node
bun add -d eslint prettier
bun add -d vitest # or jest

# Create TypeScript config
tsc --init

# Setup scripts in package.json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "tsc",
    "test": "vitest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

### Rust Project
```bash
# Create new Rust project
cargo init

# Add common dependencies to Cargo.toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.0", features = ["full"] }

[dev-dependencies]
tokio-test = "0.4"
```

### Go Project
```bash
# Initialize Go module
go mod init github.com/username/my-new-project

# Create main.go
cat > main.go << 'EOF'
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
EOF

# Add common dependencies
go get -u github.com/gorilla/mux
go get -u github.com/stretchr/testify
```

### Python Project
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Create requirements files
touch requirements.txt
touch requirements-dev.txt

# Install common dev dependencies
pip install pytest black flake8 mypy

# Create pyproject.toml
cat > pyproject.toml << 'EOF'
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-new-project"
version = "0.1.0"
description = ""
authors = [{name = "Your Name", email = "your.email@example.com"}]
EOF
```

## Development Environment Setup

### 1. tmux Session Configuration
```bash
# Create project-specific tmux session
tmux-sessionizer ~/code/personal/my-new-project

# Or manually create session with specific layout
tmux new-session -d -s my-new-project -c ~/code/personal/my-new-project
tmux new-window -t my-new-project:1 -n 'editor' 'nvim'
tmux new-window -t my-new-project:2 -n 'server' 
tmux new-window -t my-new-project:3 -n 'test'
tmux new-window -t my-new-project:4 -n 'git'
```

### 2. Claude Code Integration
```bash
# Generate project context for AI assistance
claude-session.sh --task "Setup new project development environment"

# Create Claude-specific configuration
cat > CLAUDE.md << 'EOF'
# Project Context for Claude Code

## Project Overview
Brief description of the project goals and architecture.

## Development Setup
- Language/Framework: [Specify]
- Build System: [Specify]
- Testing Framework: [Specify]

## Key Commands
- Start development: `npm run dev` or equivalent
- Run tests: `npm test` or equivalent
- Build: `npm run build` or equivalent

## Architecture Notes
- Key components and their responsibilities
- Important patterns and conventions used
EOF
```

### 3. Editor Configuration
```bash
# Create project-specific Neovim configuration (optional)
mkdir -p .nvim
cat > .nvim/init.lua << 'EOF'
-- Project-specific Neovim configuration
-- This will be loaded automatically when opening files in this project
EOF

# Create VS Code workspace file (if using VS Code)
cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
EOF
```

## Continuous Integration Setup

### GitHub Actions
```bash
# Create GitHub Actions directory
mkdir -p .github/workflows

# Create CI workflow
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linter
      run: npm run lint
EOF
```

### Pre-commit Hooks
```bash
# Install pre-commit if not already installed
brew install pre-commit

# Create pre-commit configuration
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: local
    hooks:
      - id: lint
        name: lint
        entry: npm run lint
        language: system
        files: \.(js|ts|jsx|tsx)$
EOF

# Install hooks
pre-commit install
```

## Documentation Setup

### README Template
```bash
cat > README.md << 'EOF'
# Project Name

Brief description of what this project does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Getting Started

### Prerequisites

- Node.js 18+ (or other requirements)
- Git

### Installation

```bash
git clone https://github.com/username/project-name.git
cd project-name
npm install
```

### Development

```bash
npm run dev
```

### Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
EOF
```

### Project Documentation Structure
```bash
# Create documentation directories
mkdir -p docs/{api,guides,examples}

# Create documentation files
touch docs/api/README.md
touch docs/guides/getting-started.md
touch docs/examples/basic-usage.md
```

## Workflow Integration

### Git Worktree Setup
```bash
# Set up worktree structure for the project
mkdir -p ../worktrees

# Create development branch worktree
setup-worktree.sh develop

# Create feature branch for first feature
setup-worktree.sh feature/initial-implementation
```

### Issue Templates
```bash
# Create GitHub issue templates
mkdir -p .github/ISSUE_TEMPLATE

cat > .github/ISSUE_TEMPLATE/bug_report.md << 'EOF'
---
name: Bug report
about: Create a report to help us improve
title: ''
labels: 'bug'
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment:**
- OS: [e.g. macOS]
- Version: [e.g. 1.0.0]
EOF

cat > .github/ISSUE_TEMPLATE/feature_request.md << 'EOF'
---
name: Feature request
about: Suggest an idea for this project
title: ''
labels: 'enhancement'
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Additional context**
Add any other context or screenshots about the feature request here.
EOF
```

## Testing and Quality Assurance

### Test Structure Setup
```bash
# Create test directories
mkdir -p {test,tests,__tests__}

# Create test configuration files
# For Jest/Vitest
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
})
EOF

# Create sample test file
cat > test/example.test.ts << 'EOF'
import { describe, it, expect } from 'vitest'

describe('Example', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2)
  })
})
EOF
```

### Code Quality Tools
```bash
# ESLint configuration for JavaScript/TypeScript
cat > .eslintrc.js << 'EOF'
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
}
EOF

# Prettier configuration
cat > .prettierrc << 'EOF'
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
EOF
```

## Deployment Setup

### Docker Configuration
```bash
# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
EOF

# Create .dockerignore
cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
EOF
```

### Environment Configuration
```bash
# Create environment file templates
cat > .env.example << 'EOF'
# Application settings
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=

# API Keys
API_KEY=
EOF

# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

## Final Steps

### Initial Commit and Push
```bash
# Add all files
git add .

# Create initial commit
git commit -m "feat: initial project setup with development environment"

# Push to GitHub
git push -u origin main

# Create development branch
git checkout -b develop
git push -u origin develop
```

### Project Board Setup
```bash
# Create GitHub project board
gh project create --title "Project Name" --body "Main project board"

# Create initial issues
gh issue create --title "Setup development environment" --body "Initial development environment setup" --label "setup"
gh issue create --title "Implement core functionality" --body "Core feature implementation" --label "feature"
```