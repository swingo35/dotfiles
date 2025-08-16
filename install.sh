#!/bin/bash

# Modern macOS Developer Environment Bootstrap Script
# This script sets up a complete development environment from a fresh macOS install

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[SETUP]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Configuration
DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_banner() {
    echo -e "${BLUE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                 Modern macOS Developer Setup                     ║
║                                                                  ║
║  🚀 AeroSpace   🖥️  Ghostty    📊 tmux      ✏️  Neovim          ║
║  ⚡ Bun         🔧 Homebrew   🐚 Zsh       🤖 Claude Code      ║
╚══════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

check_macos() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        error "This script is designed for macOS only"
        exit 1
    fi
    log "macOS detected: $(sw_vers -productVersion)"
}

install_xcode_tools() {
    if ! xcode-select -p &> /dev/null; then
        log "Installing Xcode Command Line Tools..."
        xcode-select --install
        warn "Please complete Xcode Command Line Tools installation and re-run this script"
        exit 1
    else
        log "Xcode Command Line Tools already installed"
    fi
}

install_homebrew() {
    if ! command -v brew &> /dev/null; then
        log "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH for Apple Silicon Macs
        if [[ $(uname -m) == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
    else
        log "Homebrew already installed"
    fi
}

verify_dotfiles() {
    if [[ ! -d "$DOTFILES_DIR" ]]; then
        error "Dotfiles directory not found at $DOTFILES_DIR"
        exit 1
    fi
    log "Using dotfiles directory: $DOTFILES_DIR"
}

install_core_packages() {
    log "Installing core packages via Homebrew..."
    
    if [[ -f "$DOTFILES_DIR/Brewfile" ]]; then
        log "Installing packages from Brewfile..."
        brew bundle --file="$DOTFILES_DIR/Brewfile"
    else
        # Fallback to manual installation
        brew install git gh lazygit
        brew install tmux neovim
        brew install bun node
        brew install fzf ripgrep fd bat eza
        brew install karabiner-elements
        
        # Cask applications
        brew install --cask ghostty
        brew install --cask aerospace
        brew install --cask font-jetbrains-mono-nerd-font
    fi
    
    log "Core packages installed successfully"
}

setup_shell() {
    log "Setting up Zsh configuration..."
    
    # Install Oh My Zsh if not present
    if [[ ! -d "$HOME/.oh-my-zsh" ]]; then
        sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
    fi
    
    # Install useful plugins
    git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions 2>/dev/null || true
    git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting 2>/dev/null || true
    
    # Set Zsh as default shell
    if [[ "$SHELL" != */zsh ]]; then
        chsh -s $(which zsh)
        log "Default shell changed to Zsh (restart terminal to take effect)"
    fi
}

setup_directories() {
    log "Creating essential directories..."
    
    mkdir -p ~/.config/{ghostty,aerospace,nvim,karabiner}
    mkdir -p ~/code/{personal,work,forks}
    mkdir -p ~/.local/bin
    
    log "Directories created successfully"
}

link_configurations() {
    log "Linking configuration files..."
    
    # Create symlinks for configuration files
    ln -sf "$DOTFILES_DIR/aerospace/aerospace.toml" ~/.config/aerospace/aerospace.toml
    ln -sf "$DOTFILES_DIR/ghostty/config" ~/.config/ghostty/config
    ln -sf "$DOTFILES_DIR/tmux/tmux.conf" ~/.tmux.conf
    ln -sf "$DOTFILES_DIR/nvim/init.lua" ~/.config/nvim/init.lua
    ln -sf "$DOTFILES_DIR/zsh/zshrc" ~/.zshrc
    ln -sf "$DOTFILES_DIR/git/gitconfig" ~/.gitconfig
    ln -sf "$DOTFILES_DIR/git/gitignore_global" ~/.gitignore_global
    
    # Copy Karabiner configuration (can't symlink due to app requirements)
    cp "$DOTFILES_DIR/karabiner/karabiner.json" ~/.config/karabiner/karabiner.json
    
    log "Configuration files linked successfully"
}

setup_claude_code() {
    log "Setting up Claude Code..."
    
    if ! command -v claude &> /dev/null; then
        npm install -g @anthropic-ai/claude-code
    fi
    
    # Create Claude Code configuration directory
    mkdir -p ~/.claude
    
    log "Claude Code setup complete"
    info "Run 'claude auth' to authenticate with your API key"
}

setup_git_worktrees() {
    log "Setting up Git worktree workflow..."
    
    # Install worktree helper scripts
    cp "$DOTFILES_DIR/scripts/setup-worktree.sh" ~/.local/bin/
    cp "$DOTFILES_DIR/scripts/claude-session.sh" ~/.local/bin/
    cp "$DOTFILES_DIR/scripts/monitor-detect.sh" ~/.local/bin/
    
    # Make tmux-sessionizer available globally
    ln -sf "$DOTFILES_DIR/tmux/tmux-sessionizer.sh" ~/.local/bin/tmux-sessionizer
    
    chmod +x ~/.local/bin/*.sh ~/.local/bin/tmux-sessionizer
    
    log "Git worktree and automation scripts installed"
}

detect_monitors() {
    log "Detecting monitor configuration..."
    
    # Use monitor-detect.sh script if available, otherwise simple detection
    if [[ -f ~/.local/bin/monitor-detect.sh ]]; then
        ~/.local/bin/monitor-detect.sh
    else
        # Fallback to basic aerospace config
        if [[ -f "$DOTFILES_DIR/aerospace/aerospace.toml" ]]; then
            cp "$DOTFILES_DIR/aerospace/aerospace.toml" ~/.config/aerospace/aerospace.toml
        fi
    fi
    
    log "Monitor configuration applied"
}

configure_macos_settings() {
    log "Configuring macOS system settings..."
    
    # Disable "natural" scrolling
    defaults write NSGlobalDomain com.apple.swipescrolldirection -bool false
    
    # Enable key repeat
    defaults write NSGlobalDomain KeyRepeat -int 2
    defaults write NSGlobalDomain InitialKeyRepeat -int 15
    
    # Show hidden files in Finder
    defaults write com.apple.finder AppleShowAllFiles -bool true
    
    # Disable automatic capitalization and correction
    defaults write NSGlobalDomain NSAutomaticCapitalizationEnabled -bool false
    defaults write NSGlobalDomain NSAutomaticSpellingCorrectionEnabled -bool false
    
    log "macOS settings configured"
}

start_services() {
    log "Starting services..."
    
    # Start AeroSpace
    open -a AeroSpace
    
    # Start Karabiner-Elements
    open -a "Karabiner-Elements"
    
    log "Services started successfully"
}

print_next_steps() {
    echo -e "${BLUE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                        Setup Complete! 🎉                       ║
╚══════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo "Next steps:"
    echo "1. Restart your terminal to load Zsh configuration"
    echo "2. Authenticate with GitHub CLI: ${GREEN}gh auth login${NC}"
    echo "3. Set up Claude Code: ${GREEN}claude auth${NC}"
    echo "4. Configure Karabiner-Elements Hyper Key in System Settings"
    echo "5. Grant AeroSpace accessibility permissions in System Settings"
    echo ""
    echo "Essential commands to remember:"
    echo "• ${GREEN}tmux-sessionizer${NC} - Quick project session switching"
    echo "• ${GREEN}setup-worktree${NC} - Create git worktree for feature work"
    echo "• ${GREEN}claude-session${NC} - Start AI-assisted development session"
    echo ""
    echo "Configuration files are linked to: ${GREEN}$DOTFILES_DIR${NC}"
    echo "Make changes there and commit to keep your setup in sync!"
}

main() {
    print_banner
    check_macos
    install_xcode_tools
    install_homebrew
    verify_dotfiles
    install_core_packages
    setup_shell
    setup_directories
    link_configurations
    setup_claude_code
    setup_git_worktrees
    detect_monitors
    configure_macos_settings
    start_services
    print_next_steps
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Modern macOS Developer Environment Setup"
        echo "Usage: $0 [--help]"
        exit 0
        ;;
    *)
        main
        ;;
esac
