/**
 * Core type definitions for the keybinding system
 * Handles extraction, collision detection, and merging of keybindings
 */

export enum Priority {
  SYSTEM_RESERVED = 0,    // macOS system shortcuts (unchangeable)
  TOOL_DEFAULT = 1,       // Tool factory defaults
  USER_OVERRIDE = 2,      // User customizations (highest)
  GENERATED = 3           // AI suggestions (lowest)
}

export type Source = 'default' | 'user' | 'generated' | 'system';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Frequency = 'high' | 'medium' | 'low';
export type ConflictSeverity = 'error' | 'warning' | 'info';

export interface Keybind {
  id: string;                     // Unique identifier
  tool: string;                   // Tool name (tmux, ghostty, aerospace, macos)
  key: string;                    // Human-readable key (e.g., "Cmd+Space")
  modifiers: string[];            // Array of modifiers ["cmd", "shift"]
  keySequence?: string[];         // Multi-key sequences (e.g., tmux prefix)
  action: string;                 // Human-readable description
  category: string;               // Functional category
  context: string;                // Usage context (global, app-specific, etc.)
  tags: string[];                 // Searchable tags
  difficulty: Difficulty;         // Learning difficulty
  frequency: Frequency;           // Usage frequency
  alternatives: string[];         // Alternative key combinations
  
  // Source tracking
  source: Source;                 // Where this keybind comes from
  sourceFile?: string;           // Config file path
  sourceLine?: number;           // Line number in config file
  priority: Priority;            // For conflict resolution
  
  // Conflict management
  conflicts?: string[];          // IDs of conflicting keybinds
  disabled?: boolean;            // Disabled due to conflicts
  
  // Metadata
  version?: string;              // Tool version
  lastUpdated?: string;          // ISO date string
}

export interface KeybindingLayer {
  defaults: Keybind[];           // Factory defaults from tools
  user: Keybind[];               // User customizations from config files
  generated: Keybind[];          // AI/tool-generated suggestions
  system: Keybind[];             // System-level shortcuts (macOS)
}

export interface Conflict {
  id: string;                    // Unique conflict identifier
  severity: ConflictSeverity;    // Error, warning, or info
  type: ConflictType;            // Type of conflict
  key: string;                   // Normalized key causing conflict
  keybinds: string[];            // IDs of conflicting keybinds
  contexts: string[];            // Contexts where conflict occurs
  tools: string[];               // Tools involved in conflict
  message: string;               // Human-readable description
  suggestions: string[];         // Suggested resolutions
}

export enum ConflictType {
  HARD_COLLISION = 'hard',       // Same key, same context (must resolve)
  SOFT_COLLISION = 'soft',       // Same key, overlapping contexts
  SHADOW_COLLISION = 'shadow',   // User overrides default (intentional)
  CROSS_TOOL = 'cross-tool',     // Different tools, same global key
  SYSTEM_OVERRIDE = 'system'     // Attempting to override system key
}

export interface CollisionRegistry {
  // Map of normalized key -> array of keybind IDs
  globalKeys: Map<string, string[]>;
  
  // Context-specific registries
  contextKeys: Map<string, Map<string, string[]>>;
  
  // Tool-specific registries with context awareness
  toolKeys: Map<string, Map<string, string[]>>;
}

export interface ValidationResult {
  valid: boolean;
  errors: Conflict[];
  warnings: Conflict[];
  info: Conflict[];
  suggestions: KeybindSuggestion[];
}

export interface KeybindSuggestion {
  id: string;
  action: string;
  tool: string;
  suggestedKey: string;
  reason: string;
  confidence: number;            // 0-1 confidence score
  alternatives: string[];
}

export interface MergedConfig {
  version: string;
  generated: string;             // ISO timestamp
  tools: Record<string, ToolConfig>;
  collisions: {
    global: Conflict[];
    contextual: Conflict[];
    resolved: Conflict[];
  };
  validation: ValidationResult;
  statistics: {
    totalKeybinds: number;
    byTool: Record<string, number>;
    bySource: Record<Source, number>;
    conflicts: Record<ConflictType, number>;
  };
}

export interface ToolConfig {
  tool: string;
  version?: string;
  defaults: Keybind[];
  user: Keybind[];
  generated: Keybind[];
  conflicts: Conflict[];
  suggestions: KeybindSuggestion[];
}

export interface ExtractionConfig {
  tmux: {
    configFile?: string;
    tables: string[];            // Key tables to extract
    isolatedDefaults: boolean;   // Use isolated tmux for defaults
  };
  ghostty: {
    configFile?: string;
    defaultsFile?: string;       // Path to ghostty-defaults.json
  };
  aerospace: {
    configFile?: string;
    defaultsFile?: string;       // Path to aerospace-defaults.json
  };
  macos: {
    includeSystemShortcuts: boolean;
    includeAppShortcuts: boolean;
  };
}

export interface ValidationRules {
  // Forbidden keys that must never be overridden
  systemReserved: string[];
  
  // Keys that trigger warnings
  dangerous: string[];
  
  // Context-specific rules
  contextRules: Map<string, Rule[]>;
  
  // Accessibility requirements
  accessibility: {
    minKeySize: number;          // Minimum modifier count
    maxComplexity: number;       // Maximum key combo complexity
    ergonomicPreference: string[]; // Preferred modifier combinations
  };
}

export interface Rule {
  id: string;
  description: string;
  severity: ConflictSeverity;
  check: (keybind: Keybind) => boolean;
  message: string;
}

export interface NormalizedKey {
  key: string;                   // Base key (A, Space, Enter, etc.)
  modifiers: Set<string>;        // Normalized modifiers
  sequence?: string[];           // For multi-key sequences
  normalized: string;            // Final normalized string
}

export interface ExtractorResult {
  tool: string;
  version?: string;
  keybinds: Keybind[];
  errors: string[];
  warnings: string[];
}

export interface UserPreferences {
  modifierPreference: string[];  // Preferred modifier order
  ergonomicKeys: string[];       // Preferred base keys
  avoidedKeys: string[];         // Keys to avoid
  patternPreference: {
    consistent: boolean;         // Prefer consistent patterns
    mnemonic: boolean;          // Prefer mnemonic keys
    homeRow: boolean;           // Prefer home row keys
  };
}

export interface ConfigWatcherOptions {
  files: string[];
  debounceMs: number;
  onChange: (file: string) => Promise<void>;
  onError: (error: Error) => void;
}

// CLI-specific interfaces
export interface CLIOptions {
  config?: string;               // Path to config file
  output?: string;               // Output file/directory
  format?: 'json' | 'pwa' | 'markdown';
  strict?: boolean;             // Strict validation mode
  dryRun?: boolean;             // Preview changes only
  verbose?: boolean;            // Verbose output
}

export interface ExportFormat {
  version: string;
  format: string;
  data: any;
  metadata: {
    generated: string;
    source: string;
    tools: string[];
  };
}