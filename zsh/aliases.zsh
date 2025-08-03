# Navigation and File Operations
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias ~='cd ~'
alias -- -='cd -'

# Modern alternatives
alias ls='eza --icons --group-directories-first'
alias ll='eza -la --icons --group-directories-first'
alias lt='eza --tree --level=3 --icons'
alias cat='bat --style=plain'
alias grep='rg'
alias find='fd'

# Git shortcuts
alias g='git'
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'
alias gd='git diff'
alias gb='git branch'
alias gco='git checkout'
alias glg='git log --oneline --graph --decorate'

# Git worktree workflow
alias wt='setup-worktree.sh'
alias wtl='git worktree list'
alias wtr='git worktree remove'
alias wtc='setup-worktree.sh --cleanup'

# tmux shortcuts
alias ta='tmux attach'
alias tl='tmux list-sessions'
alias ts='tmux-sessionizer'
alias tk='tmux kill-session -t'

# Development shortcuts
alias vim='nvim'
alias vi='nvim'
alias be='bundle exec'
alias dc='docker-compose'
alias k='kubectl'

# System utilities
alias reload='source ~/.zshrc'
alias path='echo $PATH | tr ":" "\n"'
alias ports='lsof -i -P -n | grep LISTEN'
alias pubkey='cat ~/.ssh/id_ed25519.pub | pbcopy && echo "Public key copied to clipboard"'

# Quick directory access
alias code='cd ~/code'
alias dots='cd ~/.dotfiles'
alias dl='cd ~/Downloads'
alias dt='cd ~/Desktop'

# Homebrew shortcuts
alias bi='brew install'
alias bc='brew install --cask'
alias bu='brew update && brew upgrade'
alias bd='brew doctor'
alias bs='brew search'

# Claude Code shortcuts
alias cc='claude code'
alias cs='claude-session.sh'

# Network utilities
alias localip='ipconfig getifaddr en0'
alias myip='curl -s https://httpbin.org/ip | jq -r .origin'
alias speedtest='curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3 -'

# macOS specific
alias showfiles='defaults write com.apple.finder AppleShowAllFiles YES; killall Finder'
alias hidefiles='defaults write com.apple.finder AppleShowAllFiles NO; killall Finder'
alias flushdns='sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder'