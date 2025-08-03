# Create directory and cd into it
mkcd() {
    mkdir -p "$1" && cd "$1"
}

# Extract any archive
extract() {
    if [[ -f $1 ]]; then
        case $1 in
            *.tar.bz2)   tar xvjf $1    ;;
            *.tar.gz)    tar xvzf $1    ;;
            *.bz2)       bunzip2 $1     ;;
            *.rar)       unrar x $1     ;;
            *.gz)        gunzip $1      ;;
            *.tar)       tar xvf $1     ;;
            *.tbz2)      tar xvjf $1    ;;
            *.tgz)       tar xvzf $1    ;;
            *.zip)       unzip $1       ;;
            *.Z)         uncompress $1  ;;
            *.7z)        7z x $1        ;;
            *)           echo "don't know how to extract '$1'..." ;;
        esac
    else
        echo "'$1' is not a valid file!"
    fi
}

# Find and kill process by name
killport() {
    local port=$1
    if [[ -z $port ]]; then
        echo "Usage: killport <port>"
        return 1
    fi
    local pid=$(lsof -ti:$port)
    if [[ -n $pid ]]; then
        kill -9 $pid
        echo "Killed process on port $port (PID: $pid)"
    else
        echo "No process found on port $port"
    fi
}

# Quick file backup
backup() {
    local file=$1
    if [[ -f $file ]]; then
        cp "$file" "${file}.backup.$(date +%Y%m%d_%H%M%S)"
        echo "Backup created: ${file}.backup.$(date +%Y%m%d_%H%M%S)"
    else
        echo "File not found: $file"
    fi
}

# Create a new project directory with git init
newproject() {
    local name=$1
    if [[ -z $name ]]; then
        echo "Usage: newproject <name>"
        return 1
    fi
    mkdir -p ~/code/personal/$name
    cd ~/code/personal/$name
    git init
    echo "# $name" > README.md
    echo "New project created: ~/code/personal/$name"
}

# Quick git commit with message
gcm() {
    git add .
    git commit -m "$*"
}

# Weather function
weather() {
    local city=${1:-}
    curl -s "wttr.in/$city"
}

# Convert markdown to PDF
md2pdf() {
    local input=$1
    local output=${2:-"${input%.*}.pdf"}
    if [[ -f $input ]]; then
        pandoc "$input" -o "$output"
        echo "Converted $input to $output"
    else
        echo "File not found: $input"
    fi
}

# Start development server with common commands
dev() {
    if [[ -f package.json ]]; then
        if command -v bun &> /dev/null; then
            bun run dev
        else
            npm run dev
        fi
    elif [[ -f Cargo.toml ]]; then
        cargo run
    elif [[ -f go.mod ]]; then
        go run .
    elif [[ -f Gemfile ]]; then
        bundle exec rails server
    else
        echo "No recognized project file found"
    fi
}

# Test with appropriate runner
test() {
    if [[ -f package.json ]]; then
        if command -v bun &> /dev/null; then
            bun test
        else
            npm test
        fi
    elif [[ -f Cargo.toml ]]; then
        cargo test
    elif [[ -f go.mod ]]; then
        go test ./...
    elif [[ -f Gemfile ]]; then
        bundle exec rspec
    else
        echo "No recognized test setup found"
    fi
}

# Open GitHub repository in browser
gh-open() {
    local repo_url=$(git remote get-url origin 2>/dev/null)
    if [[ -n $repo_url ]]; then
        # Convert SSH URL to HTTPS
        repo_url=${repo_url/git@github.com:/https://github.com/}
        repo_url=${repo_url/.git/}
        open "$repo_url"
    else
        echo "Not in a git repository or no origin remote found"
    fi
}

# Quick project search and open
proj() {
    local selected=$(find ~/code -mindepth 2 -maxdepth 2 -type d | fzf)
    if [[ -n $selected ]]; then
        cd "$selected"
        # Start tmux session if not already in one
        if [[ -z $TMUX ]]; then
            tmux-sessionizer "$selected"
        fi
    fi
}

# System information
sysinfo() {
    echo "System Information:"
    echo "=================="
    echo "OS: $(sw_vers -productName) $(sw_vers -productVersion)"
    echo "Architecture: $(uname -m)"
    echo "Uptime: $(uptime | awk '{print $3,$4}' | sed 's/,//')"
    echo "Memory: $(top -l 1 -s 0 | grep PhysMem | awk '{print $2}')"
    echo "Disk Usage:"
    df -h / | tail -1 | awk '{print "  " $3 " used of " $2 " (" $5 " full)"}'
    echo "Load Average: $(uptime | awk -F'load averages:' '{print $2}')"
}