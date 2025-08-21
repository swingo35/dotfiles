# Keybind System

A comprehensive, collision-free keybinding extraction and merging system for managing keyboard shortcuts across multiple tools (tmux, Ghostty, AeroSpace, etc.).

## Features

🔍 **Smart Extraction**: Extract keybindings from various configuration formats
- tmux (list-keys output with isolated defaults)
- Ghostty (configuration files)
- AeroSpace (TOML configuration)

🛡️ **Collision Detection**: Advanced conflict detection with context awareness
- Hard collisions (same key, same context)
- Soft collisions (overlapping contexts)
- Cross-tool conflicts
- System reserved key violations

🔧 **Intelligent Merging**: Priority-based conflict resolution
- User configs override defaults
- Source priority handling (system → default → user → generated)
- Automatic conflict resolution with suggestions

📊 **Comprehensive Validation**: Multi-layer validation system
- Built-in safety checks
- Custom validation rules
- Ergonomic analysis
- Pattern consistency checks

🧠 **AI-Powered Suggestions**: Smart optimization recommendations
- Conflict resolution strategies
- Ergonomic improvements
- Frequency-based optimizations
- Pattern standardization

📱 **PWA Export**: Ready-to-use data for learning applications
- Structured JSON with categories and metadata
- Learning paths for progressive skill building
- Search indices for fast lookups
- Relationship mapping between shortcuts

## Quick Start

### Installation

```bash
# Install dependencies
bun install

# Make CLI tools executable
chmod +x cli/*.ts
```

### Complete Workflow

Run the entire extraction, validation, merging, and export process:

```bash
# Default workflow (all tools)
bun run workflow

# Dry run to see what would happen
bun run workflow:dry-run

# Process specific tools only
bun run workflow:tmux-only

# Export optimized for PWA
bun run workflow:pwa
```

### Individual Tools

Extract keybindings from specific tools:

```bash
# Extract from all tools
bun run extract

# Extract from specific tool
bun run extract:tmux
bun run extract:ghostty
bun run extract:aerospace

# Export to markdown
bun run extract:markdown
```

Validate configurations:

```bash
# Basic validation
bun run validate config.json

# Strict mode (warnings as errors)
bun run validate:strict config.json

# JSON output
bun run validate:json config.json
```

Generate suggestions:

```bash
# Comprehensive optimization
bun run suggest config.json

# Focus on conflict resolution
bun run suggest:conflicts config.json

# Ergonomic analysis
bun run suggest:ergonomic config.json

# Generate new keybindings
bun run suggest:new config.json
```

## Architecture

### Core Components

#### 1. Extractors (`extractors/`)
- **TmuxExtractor**: Parses tmux keybindings with isolated defaults
- **GhosttyExtractor**: Reads Ghostty configuration files
- **AeroSpaceExtractor**: Parses AeroSpace TOML configuration

#### 2. Collision Detection (`collision-detector/`)
- **KeyNormalizer**: Consistent key representation across formats
- **CollisionDetector**: Context-aware conflict detection engine

#### 3. Merging (`merger/`)
- **KeybindMerger**: Priority-based conflict resolution
- **Layer merging**: System → Default → User → Generated

#### 4. Validation (`cli/validate-config.ts`)
- Built-in safety checks
- Custom validation rules
- Multiple output formats (text, JSON, JUnit)

#### 5. Export System (`export/`)
- **PWAExporter**: Learning app optimized format
- **Search indices**: Fast lookup capabilities
- **Learning paths**: Progressive skill building

### Data Flow

```
[Tool Configs] → [Extractors] → [Validation] → [Merger] → [Export] → [PWA Data]
                      ↓             ↓           ↓         ↓
                 [Normalized]  [Conflicts]  [Resolved] [Multiple Formats]
```

## Configuration

### Validation Rules

Create custom validation rules in `data/validation-rules.json`:

```json
{
  "rules": [
    {
      "id": "ergonomic-guidelines",
      "type": "ergonomic-checks",
      "maxModifiers": 3,
      "difficultKeys": ["f1", "f2", "f3", "f4"],
      "severity": "warning"
    },
    {
      "id": "forbidden-system-keys",
      "type": "forbidden-keys",
      "keys": ["cmd+space", "cmd+tab"],
      "severity": "error"
    }
  ]
}
```

### Tool Configuration

Each tool can be configured with defaults:

```json
{
  "tool": "tmux",
  "configFile": "~/.config/tmux/tmux.conf",
  "defaultsFile": "./data/tmux-defaults.json",
  "isolatedDefaults": true
}
```

## Output Formats

### Merged Configuration

Complete merged configuration with metadata:

```json
{
  "version": "2.0",
  "generated": "2024-01-01T00:00:00.000Z",
  "tools": {
    "tmux": {
      "defaults": [...],
      "user": [...],
      "generated": [...],
      "conflicts": [...],
      "suggestions": [...]
    }
  },
  "collisions": {
    "global": [...],
    "contextual": [...],
    "resolved": [...]
  },
  "validation": {...},
  "statistics": {...}
}
```

### PWA Export

Optimized for learning applications:

```json
{
  "keybinds": [
    {
      "id": "tmux-new-session",
      "key": "⌘+T",
      "description": "Create new tmux session",
      "category": "Session Management",
      "difficulty": "beginner",
      "frequency": "high",
      "shortcuts": ["⌘+T", "Cmd+T", "Command+T"]
    }
  ],
  "categories": [...],
  "learningPaths": [...],
  "relationships": [...]
}
```

## CLI Reference

### extract-keybinds.ts

Extract keybindings from configured tools.

```bash
Usage: bun run cli/extract-keybinds.ts [OPTIONS]

Options:
  -o, --output <path>       Output directory (default: ./extracted-keybinds)
  -f, --format <format>     Output format: json, markdown (default: json)
  -t, --tools <tools>       Tools to extract: tmux,ghostty,aerospace
  --no-defaults            Don't extract default keybindings
  --combined               Write single combined file
  -v, --verbose            Verbose output
```

### validate-config.ts

Validate keybinding configurations.

```bash
Usage: bun run cli/validate-config.ts [OPTIONS] <config-files...>

Options:
  -r, --rules <file>        Custom validation rules file
  -s, --strict             Treat warnings as errors
  -f, --format <format>    Report format: text, json, junit
  --no-exit-on-error       Don't exit with error code
  -v, --verbose            Verbose output
```

### generate-suggestions.ts

Generate AI-powered optimization suggestions.

```bash
Usage: bun run cli/generate-suggestions.ts [OPTIONS] <config-files...>

Options:
  -m, --mode <mode>         Suggestion mode: optimize, resolve, generate, ergonomic
  -t, --tool <tool>         Focus on specific tool
  -c, --context <context>   Focus on specific context
  --no-conflicts           Skip conflict resolution suggestions
  --no-ergonomics          Skip ergonomic suggestions
  -e, --export <file>      Export suggestions to JSON file
```

### keybind-workflow.ts

Complete workflow orchestration.

```bash
Usage: bun run cli/keybind-workflow.ts [OPTIONS]

Options:
  -t, --tools <tools>           Tools to process (default: tmux,ghostty,aerospace)
  -o, --output <dir>           Output directory (default: ./keybind-output)
  --no-defaults                Don't include default keybindings
  --no-resolve-conflicts       Don't automatically resolve conflicts
  --skip-validation           Skip validation steps
  --dry-run                   Show what would be done without writing files
```

## Examples

### Basic Usage

```bash
# Quick start - process all tools
bun run workflow

# Extract only tmux keybindings
bun run extract:tmux

# Validate existing configuration
bun run validate my-config.json
```

### Advanced Usage

```bash
# Custom workflow with specific tools
bun run cli/keybind-workflow.ts \
  --tools tmux,ghostty \
  --output ./custom-output \
  --verbose

# Generate conflict resolution suggestions
bun run cli/generate-suggestions.ts \
  --mode resolve \
  --tool tmux \
  --export suggestions.json \
  ./merged-config.json

# Strict validation with custom rules
bun run cli/validate-config.ts \
  --strict \
  --rules ./my-rules.json \
  --format json \
  ./config1.json ./config2.json
```

### PWA Integration

```bash
# Generate PWA-optimized export
bun run workflow --output ./pwa-ready

# Use the generated files in your learning app
cp keybind-output/pwa/*.json /path/to/your/pwa/data/
```

## Integration

### With Learning Applications

The PWA export format is designed for integration with keyboard shortcut learning applications:

```javascript
// Load keybindings in your app
const keybinds = await fetch('/data/keybinds.json').then(r => r.json());
const categories = await fetch('/data/categories.json').then(r => r.json());
const learningPaths = await fetch('/data/learning-paths.json').then(r => r.json());

// Use search index for fast lookups
const searchIndex = await fetch('/data/search-index.json').then(r => r.json());
```

### With CI/CD

Add validation to your CI pipeline:

```yaml
# .github/workflows/validate-keybinds.yml
- name: Validate Keybindings
  run: |
    bun run cli/validate-config.ts --strict --format junit ./config.json > results.xml
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Roadmap

- [ ] Support for additional tools (Vim, VSCode, etc.)
- [ ] Machine learning-based suggestion improvements
- [ ] Integration with popular learning platforms
- [ ] Real-time conflict detection during editing
- [ ] Visual conflict resolution interface
- [ ] Performance optimizations for large configurations

---

**Note**: This system prioritizes safety and collision-free operation. When in doubt, it will flag potential conflicts rather than making assumptions about user intent.