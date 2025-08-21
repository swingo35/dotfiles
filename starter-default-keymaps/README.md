# Starter Default Keymaps

A comprehensive collection of default keybindings for macOS and popular development tools, designed for building interactive learning applications and reference materials.

## Overview

This repository contains carefully curated keybinding data for:

- **macOS System** - Essential system shortcuts (150+ shortcuts)
- **tmux** - Terminal multiplexer commands
- **Ghostty** - Modern terminal emulator
- **AeroSpace** - Window management
- **Lazygit** - Git TUI interface  
- **Visual Studio Code** - Code editor shortcuts

## Data Structure

### Enhanced Schema v2.0

Each keybinding file follows a standardized structure with enhanced metadata:

```typescript
interface KeybindFile {
  tool: string;                    // Tool identifier
  name: string;                    // Human-readable tool name
  version: string;                 // Tool version
  source: string;                  // Documentation source URL
  lastUpdated: string;             // Last update date (YYYY-MM-DD)
  description: string;             // Tool description
  keymaps: Keybind[];             // Array of keybindings
}

interface Keybind {
  id: string;                      // Unique identifier
  key: string;                     // Key combination (e.g., "Cmd+Space")
  modifiers: string[];             // Array of modifiers ["cmd", "shift"]
  keySequence: string[] | null;    // Multi-key sequences (e.g., tmux)
  description: string;             // Human-readable description
  category: string;                // Functional category
  context: string;                 // Usage context (global, app-specific, etc.)
  tags: string[];                  // Searchable tags
  difficulty: "beginner" | "intermediate" | "advanced";
  frequency: "high" | "medium" | "low";
  alternatives: string[];          // Alternative key combinations
}
```

### Categories

Keybindings are organized into logical categories:

**macOS System:**
- General (essential system shortcuts)
- Text Editing (cursor movement, selection)
- Window Management (spaces, mission control)
- Finder (file management)
- Browser (web navigation)
- Screenshots (screen capture)
- Security (lock screen, privacy)
- Accessibility (assistive features)

**tmux:**
- Core (prefix commands)
- Sessions (session management)
- Windows (window operations)
- Panes (pane splitting/navigation)
- Copy & Paste (text operations)

**Ghostty:**
- Windows (window management)
- Tabs (tab operations)
- Splits (pane management)
- Copy & Paste (text operations)
- Application (app-level controls)

## File Structure

```
starter-default-keymaps/
├── keymaps/
│   ├── macos.json              # macOS system shortcuts (150+)
│   ├── tmux.json               # tmux terminal multiplexer
│   ├── ghostty.json            # Ghostty terminal emulator
│   ├── aerospace.json          # AeroSpace window manager
│   ├── lazygit.json            # Lazygit TUI
│   └── visual-studio-code.json # VS Code editor
├── categories.json             # Category metadata & learning paths
├── relationships.json          # Cross-tool patterns & relationships
└── README.md                   # This documentation
```

## Metadata Files

### categories.json
Contains metadata for organizing keybindings:
- **Visual styling** (icons, colors)
- **Learning paths** (essential → intermediate → advanced)
- **Difficulty levels** with practice recommendations
- **Category priorities** for structured learning

### relationships.json
Maps patterns and relationships across tools:
- **Universal patterns** (Cmd+C/V, Cmd+T, Cmd+W)
- **Contextual patterns** (browser navigation)
- **Tool-specific patterns** (tmux prefix commands)
- **Learning strategies** for pattern recognition

## Usage Examples

### Loading Keybindings

```typescript
// Load macOS shortcuts
const macosShortcuts = await fetch('./keymaps/macos.json').then(r => r.json());

// Filter by category
const textEditingShortcuts = macosShortcuts.keymaps.filter(
  kb => kb.category === 'Text Editing'
);

// Filter by difficulty
const beginnerShortcuts = macosShortcuts.keymaps.filter(
  kb => kb.difficulty === 'beginner'
);

// Search by tags
const essentialShortcuts = macosShortcuts.keymaps.filter(
  kb => kb.tags.includes('essential')
);
```

### Building Practice Sessions

```typescript
// Load categories for structured learning
const categories = await fetch('./categories.json').then(r => r.json());

// Create beginner practice session
const beginnerSession = macosShortcuts.keymaps
  .filter(kb => kb.difficulty === 'beginner' && kb.frequency === 'high')
  .sort((a, b) => categories.categories[a.category].priority - categories.categories[b.category].priority);
```

### Cross-Tool Learning

```typescript
// Load relationships for pattern recognition
const relationships = await fetch('./relationships.json').then(r => r.json());

// Find universal patterns to teach first
const universalPatterns = Object.values(relationships.relationships)
  .filter(rel => rel.keybinds.some(kb => kb.consistency === 'universal'));
```

## Learning Path Recommendations

### 1. Essential (1-2 hours)
Start with high-frequency, beginner-difficulty shortcuts:
- macOS: Copy/paste, window switching, Spotlight
- Browser: New tab, close tab, address bar
- Basic text navigation

### 2. Intermediate (2-4 hours)  
Add workflow-enhancing shortcuts:
- Advanced text editing (word navigation, line manipulation)
- Window management (Mission Control, spaces)
- Tool-specific basics (tmux prefix, terminal splits)

### 3. Advanced (4-6 hours)
Master specialized and power-user features:
- Complex text operations (Emacs-style shortcuts)
- Advanced window management
- Tool-specific expert features

## Key Patterns to Learn

### Universal Patterns (work everywhere)
- `Cmd+C/V/X` - Copy/paste/cut
- `Cmd+Z/Shift+Z` - Undo/redo  
- `Cmd+A` - Select all
- `Cmd+T` - New tab
- `Cmd+W` - Close window/tab
- `Cmd+Q` - Quit application

### Navigation Patterns
- `Cmd+Arrow` - Line/document boundaries
- `Option+Arrow` - Word-by-word movement
- `Cmd+Tab` - Application switching
- `Cmd+\`` - Window switching within app

### Tool-Specific Patterns
- **tmux**: `Ctrl+B` prefix system
- **Ghostty**: `Cmd+D` for splits
- **Browser**: `Cmd+L` for address bar

## Integration Guidelines

### For Learning Applications
1. **Progressive Disclosure**: Start with essential shortcuts
2. **Pattern Recognition**: Group by patterns, not just tools
3. **Contextual Practice**: Practice shortcuts in realistic scenarios
4. **Spaced Repetition**: Use frequency and difficulty for scheduling
5. **Visual Feedback**: Use category colors and icons

### For Reference Tools
1. **Searchable Tags**: Enable tag-based filtering
2. **Context Awareness**: Show relevant shortcuts based on active app
3. **Alternative Display**: Show multiple ways to achieve the same result
4. **Relationship Mapping**: Highlight patterns across tools

## Contributing

When adding new keybindings:

1. **Follow the schema** - Use the complete Keybind interface
2. **Assign appropriate metadata** - Difficulty, frequency, tags
3. **Include alternatives** - List related shortcuts
4. **Update relationships** - Add cross-tool patterns
5. **Test with learning apps** - Ensure data works for practice

### Schema Validation

Validate your JSON files:
```bash
# Example validation (adjust for your setup)
jsonschema -i keymaps/macos.json schema.json
```

## License

MIT License - Feel free to use this data in your learning applications, reference tools, or documentation.

## Changelog

### v2.0.0 (2024-01-16)
- ✨ Enhanced data structure with metadata
- 📦 Added comprehensive macOS shortcuts (150+)
- 🏷️ Introduced categories, tags, and difficulty levels
- 🔗 Added cross-tool relationship mapping
- 📚 Created learning path recommendations
- 🎨 Added visual styling metadata

### v1.0.0 (Previous)
- 📝 Basic keybinding data for development tools
- 🔧 Simple key/description format