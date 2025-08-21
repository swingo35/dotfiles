#!/usr/bin/env bun
/**
 * CLI tool for generating AI-powered keybinding suggestions
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CollisionDetector } from '../collision-detector/detector.js';
import { KeybindMerger } from '../merger/merger.js';
import { KeyNormalizer } from '../collision-detector/normalizer.js';
import type { Keybind, CLIOptions } from '../types/index.js';

interface SuggestionOptions extends CLIOptions {
  configFiles?: string[];
  mode?: 'optimize' | 'resolve' | 'generate' | 'ergonomic';
  tool?: string;
  context?: string;
  conflicts?: boolean;
  ergonomics?: boolean;
  frequency?: boolean;
  patterns?: boolean;
  export?: string;
}

const DEFAULT_OPTIONS: SuggestionOptions = {
  configFiles: [],
  mode: 'optimize',
  conflicts: true,
  ergonomics: true,
  frequency: true,
  patterns: true,
  verbose: false,
};

/**
 * Main suggestion generation function
 */
async function generateSuggestions(options: SuggestionOptions): Promise<void> {
  const detector = new CollisionDetector();
  const merger = new KeybindMerger();
  const allKeybinds: Keybind[] = [];

  console.log('🧠 Generating keybinding suggestions...\n');

  // Load keybindings
  for (const configFile of options.configFiles!) {
    if (!existsSync(configFile)) {
      console.error(`❌ Configuration file not found: ${configFile}`);
      process.exit(1);
    }

    console.log(`📁 Loading ${configFile}...`);
    const keybinds = await loadKeybindsFromFile(configFile);
    allKeybinds.push(...keybinds);
  }

  // Filter by tool/context if specified
  let targetKeybinds = allKeybinds;
  if (options.tool) {
    targetKeybinds = targetKeybinds.filter(kb => kb.tool === options.tool);
    console.log(`🎯 Focusing on ${options.tool} (${targetKeybinds.length} keybindings)`);
  }
  if (options.context) {
    targetKeybinds = targetKeybinds.filter(kb => kb.context === options.context);
    console.log(`🎯 Focusing on context ${options.context} (${targetKeybinds.length} keybindings)`);
  }

  console.log(`\n🔍 Analyzing ${targetKeybinds.length} keybindings...`);

  const suggestions = await generateSuggestionsForMode(
    options.mode!,
    targetKeybinds,
    allKeybinds,
    detector,
    merger,
    options
  );

  console.log(`\n💡 Generated ${suggestions.length} suggestions`);

  // Display suggestions
  displaySuggestions(suggestions, options);

  // Export if requested
  if (options.export) {
    await exportSuggestions(suggestions, options.export, options);
    console.log(`\n📤 Exported suggestions to ${options.export}`);
  }
}

/**
 * Generate suggestions based on mode
 */
async function generateSuggestionsForMode(
  mode: string,
  targetKeybinds: Keybind[],
  allKeybinds: Keybind[],
  detector: CollisionDetector,
  merger: KeybindMerger,
  options: SuggestionOptions
): Promise<any[]> {
  switch (mode) {
    case 'optimize':
      return generateOptimizationSuggestions(targetKeybinds, allKeybinds, detector, merger, options);
    case 'resolve':
      return generateConflictResolutions(targetKeybinds, allKeybinds, detector, options);
    case 'generate':
      return generateNewKeybindings(targetKeybinds, allKeybinds, detector, options);
    case 'ergonomic':
      return generateErgonomicSuggestions(targetKeybinds, options);
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}

/**
 * Generate optimization suggestions
 */
async function generateOptimizationSuggestions(
  targetKeybinds: Keybind[],
  allKeybinds: Keybind[],
  detector: CollisionDetector,
  merger: KeybindMerger,
  options: SuggestionOptions
): Promise<any[]> {
  const suggestions: any[] = [];

  if (options.conflicts) {
    const conflictSuggestions = await generateConflictResolutions(targetKeybinds, allKeybinds, detector, options);
    suggestions.push(...conflictSuggestions.map(s => ({ ...s, category: 'conflict-resolution' })));
  }

  if (options.ergonomics) {
    const ergonomicSuggestions = await generateErgonomicSuggestions(targetKeybinds, options);
    suggestions.push(...ergonomicSuggestions.map(s => ({ ...s, category: 'ergonomics' })));
  }

  if (options.frequency) {
    const frequencySuggestions = await generateFrequencyOptimizations(targetKeybinds, options);
    suggestions.push(...frequencySuggestions.map(s => ({ ...s, category: 'frequency' })));
  }

  if (options.patterns) {
    const patternSuggestions = await generatePatternOptimizations(targetKeybinds, options);
    suggestions.push(...patternSuggestions.map(s => ({ ...s, category: 'patterns' })));
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Generate conflict resolution suggestions
 */
async function generateConflictResolutions(
  targetKeybinds: Keybind[],
  allKeybinds: Keybind[],
  detector: CollisionDetector,
  options: SuggestionOptions
): Promise<any[]> {
  const suggestions: any[] = [];
  
  // Detect conflicts
  detector.buildRegistry(allKeybinds);
  const conflicts = detector.detectAllCollisions(allKeybinds);

  // Process each conflict
  for (const conflict of conflicts) {
    const conflictingKeybinds = conflict.keybinds
      .map(id => targetKeybinds.find(kb => kb.id === id))
      .filter(Boolean) as Keybind[];

    if (conflictingKeybinds.length === 0) continue;

    const suggestion = await resolveConflict(conflict, conflictingKeybinds, allKeybinds, detector);
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  return suggestions;
}

/**
 * Resolve a specific conflict
 */
async function resolveConflict(
  conflict: any,
  conflictingKeybinds: Keybind[],
  allKeybinds: Keybind[],
  detector: CollisionDetector
): Promise<any | null> {
  if (conflictingKeybinds.length < 2) return null;

  const alternatives: any[] = [];

  // Sort by priority and frequency to determine which to keep
  const sorted = conflictingKeybinds.sort((a, b) => {
    // User configs win
    if (a.source === 'user' && b.source !== 'user') return -1;
    if (b.source === 'user' && a.source !== 'user') return 1;
    
    // Higher priority wins
    if (a.priority !== b.priority) return a.priority - b.priority;
    
    // High frequency wins
    const freqOrder = { high: 0, medium: 1, low: 2 };
    const aFreq = freqOrder[a.frequency as keyof typeof freqOrder] ?? 3;
    const bFreq = freqOrder[b.frequency as keyof typeof freqOrder] ?? 3;
    
    return aFreq - bFreq;
  });

  const keepKeybind = sorted[0];
  const remapKeybinds = sorted.slice(1);

  // Generate alternatives for keybinds that need remapping
  for (const keybind of remapKeybinds) {
    const keyAlternatives = await generateKeyAlternatives(keybind, allKeybinds, detector);
    alternatives.push({
      action: 'remap',
      keybind: keybind.id,
      from: keybind.key,
      to: keyAlternatives.slice(0, 3),
      reason: `Conflicts with higher priority "${keepKeybind.action}"`,
    });
  }

  return {
    id: `resolve-${conflict.id}`,
    type: 'conflict-resolution',
    severity: conflict.severity,
    title: `Resolve ${conflict.type.toLowerCase().replace('_', ' ')} for ${conflict.key}`,
    description: conflict.message,
    keep: {
      keybind: keepKeybind.id,
      reason: getKeepReason(keepKeybind, remapKeybinds),
    },
    alternatives,
    confidence: calculateResolutionConfidence(conflict, keepKeybind, remapKeybinds),
  };
}

/**
 * Generate key alternatives for a keybinding
 */
async function generateKeyAlternatives(
  keybind: Keybind,
  allKeybinds: Keybind[],
  detector: CollisionDetector
): Promise<string[]> {
  const alternatives: string[] = [];
  const normalizedKey = KeyNormalizer.normalize(keybind.key);
  const baseKey = normalizedKey.key;
  const modifiers = Array.from(normalizedKey.modifiers);

  // Try different modifier combinations
  const modifierCombinations = [
    [...modifiers, 'shift'],
    [...modifiers, 'option'],
    [...modifiers, 'ctrl'],
    modifiers.filter(m => m !== 'shift'),
    modifiers.filter(m => m !== 'option'),
    [...modifiers.filter(m => m !== 'shift'), 'option'],
  ];

  for (const mods of modifierCombinations) {
    const uniqueMods = [...new Set(mods)];
    const candidateKey = uniqueMods.length > 0 ? `${uniqueMods.join('+')}+${baseKey}` : baseKey;
    
    // Check if this alternative would conflict
    const testKeybind = { ...keybind, key: candidateKey, modifiers: uniqueMods };
    const conflicts = detector.detectKeybindCollisions(testKeybind, allKeybinds);
    
    if (conflicts.length === 0) {
      alternatives.push(candidateKey);
    }
  }

  // Try similar keys
  const similarKeys = getSimilarKeys(baseKey);
  for (const similarKey of similarKeys) {
    const candidateKey = modifiers.length > 0 ? `${modifiers.join('+')}+${similarKey}` : similarKey;
    const testKeybind = { ...keybind, key: candidateKey, modifiers };
    const conflicts = detector.detectKeybindCollisions(testKeybind, allKeybinds);
    
    if (conflicts.length === 0) {
      alternatives.push(candidateKey);
    }
  }

  return alternatives.slice(0, 5);
}

/**
 * Generate ergonomic optimization suggestions
 */
async function generateErgonomicSuggestions(targetKeybinds: Keybind[], options: SuggestionOptions): Promise<any[]> {
  const suggestions: any[] = [];

  const homeRowKeys = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  const difficultKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];

  for (const keybind of targetKeybinds) {
    const baseKey = keybind.key.split('+').pop()?.toUpperCase();
    
    // Check for difficult keys
    if (difficultKeys.includes(baseKey!)) {
      const homeRowAlternatives = homeRowKeys.filter(k => k !== baseKey);
      suggestions.push({
        id: `ergonomic-${keybind.id}`,
        type: 'ergonomic-improvement',
        title: `Replace difficult key ${baseKey}`,
        description: `${baseKey} requires reaching away from home row`,
        keybind: keybind.id,
        from: keybind.key,
        alternatives: homeRowAlternatives.slice(0, 3).map(k => 
          keybind.modifiers.length > 0 ? `${keybind.modifiers.join('+')}+${k}` : k
        ),
        confidence: 0.8,
        impact: 'high',
      });
    }

    // Check for too many modifiers
    if (keybind.modifiers.length > 3) {
      suggestions.push({
        id: `modifiers-${keybind.id}`,
        type: 'modifier-simplification',
        title: `Simplify modifier combination`,
        description: `${keybind.modifiers.length} modifiers is difficult to press`,
        keybind: keybind.id,
        from: keybind.key,
        alternatives: [
          generateSimplifiedModifiers(keybind.modifiers, baseKey!),
          generateSequentialAlternative(keybind),
        ].filter(Boolean),
        confidence: 0.7,
        impact: 'medium',
      });
    }
  }

  return suggestions;
}

/**
 * Generate frequency-based optimization suggestions
 */
async function generateFrequencyOptimizations(targetKeybinds: Keybind[], options: SuggestionOptions): Promise<any[]> {
  const suggestions: any[] = [];

  const highFreqKeybinds = targetKeybinds.filter(kb => kb.frequency === 'high');
  const easyKeys = ['A', 'S', 'D', 'F', 'J', 'K', 'L', 'Space', 'Tab'];

  for (const keybind of highFreqKeybinds) {
    const baseKey = keybind.key.split('+').pop()?.toUpperCase();
    
    if (!easyKeys.includes(baseKey!) && keybind.modifiers.length > 1) {
      suggestions.push({
        id: `frequency-${keybind.id}`,
        type: 'frequency-optimization',
        title: `Optimize high-frequency action`,
        description: `"${keybind.action}" is used frequently but has complex keybinding`,
        keybind: keybind.id,
        from: keybind.key,
        alternatives: easyKeys.slice(0, 3).map(k => 
          keybind.modifiers.length > 0 ? `${keybind.modifiers.slice(0, 1).join('+')}+${k}` : k
        ),
        confidence: 0.9,
        impact: 'high',
      });
    }
  }

  return suggestions;
}

/**
 * Generate pattern-based optimization suggestions
 */
async function generatePatternOptimizations(targetKeybinds: Keybind[], options: SuggestionOptions): Promise<any[]> {
  const suggestions: any[] = [];

  // Analyze modifier patterns
  const modifierPatterns = new Map<string, Keybind[]>();
  for (const keybind of targetKeybinds) {
    const pattern = keybind.modifiers.sort().join('+');
    if (!modifierPatterns.has(pattern)) {
      modifierPatterns.set(pattern, []);
    }
    modifierPatterns.get(pattern)!.push(keybind);
  }

  // Find inconsistent patterns
  const sortedPatterns = Array.from(modifierPatterns.entries())
    .sort((a, b) => b[1].length - a[1].length);

  if (sortedPatterns.length > 1) {
    const dominantPattern = sortedPatterns[0];
    const inconsistentKeybinds = sortedPatterns.slice(1).flatMap(([_, keybinds]) => keybinds);

    if (inconsistentKeybinds.length > 0 && dominantPattern[1].length > inconsistentKeybinds.length) {
      suggestions.push({
        id: 'pattern-consistency',
        type: 'pattern-optimization',
        title: 'Standardize modifier patterns',
        description: `Most keybindings use "${dominantPattern[0]}" pattern`,
        inconsistentKeybinds: inconsistentKeybinds.map(kb => kb.id),
        recommendedPattern: dominantPattern[0],
        confidence: 0.8,
        impact: 'medium',
      });
    }
  }

  return suggestions;
}

/**
 * Generate new keybinding suggestions
 */
async function generateNewKeybindings(
  targetKeybinds: Keybind[],
  allKeybinds: Keybind[],
  detector: CollisionDetector,
  options: SuggestionOptions
): Promise<any[]> {
  const suggestions: any[] = [];

  // Find common actions that might need keybindings
  const commonActions = [
    { action: 'Copy', category: 'Edit' },
    { action: 'Paste', category: 'Edit' },
    { action: 'Undo', category: 'Edit' },
    { action: 'Redo', category: 'Edit' },
    { action: 'Save', category: 'File' },
    { action: 'Find', category: 'Search' },
    { action: 'Replace', category: 'Search' },
  ];

  // Check which actions are missing
  for (const commonAction of commonActions) {
    const existing = targetKeybinds.find(kb => 
      kb.action.toLowerCase().includes(commonAction.action.toLowerCase())
    );

    if (!existing) {
      const suggestedKey = await suggestKeyForAction(commonAction.action, allKeybinds, detector);
      if (suggestedKey) {
        suggestions.push({
          id: `new-${commonAction.action.toLowerCase()}`,
          type: 'new-keybinding',
          title: `Add keybinding for ${commonAction.action}`,
          description: `Common action "${commonAction.action}" lacks a keybinding`,
          action: commonAction.action,
          category: commonAction.category,
          suggestedKey,
          confidence: 0.7,
          impact: 'medium',
        });
      }
    }
  }

  return suggestions;
}

/**
 * Suggest a key for a given action
 */
async function suggestKeyForAction(action: string, allKeybinds: Keybind[], detector: CollisionDetector): Promise<string | null> {
  const actionMap = new Map([
    ['Copy', 'Cmd+C'],
    ['Paste', 'Cmd+V'],
    ['Undo', 'Cmd+Z'],
    ['Redo', 'Cmd+Shift+Z'],
    ['Save', 'Cmd+S'],
    ['Find', 'Cmd+F'],
    ['Replace', 'Cmd+Option+F'],
  ]);

  const standardKey = actionMap.get(action);
  if (standardKey) {
    // Check if standard key conflicts
    const normalizedKey = KeyNormalizer.normalize(standardKey);
    const conflicts = allKeybinds.filter(kb => 
      KeyNormalizer.normalize(kb.key).normalized === normalizedKey.normalized
    );

    if (conflicts.length === 0) {
      return standardKey;
    }
  }

  return null;
}

/**
 * Load keybindings from file
 */
async function loadKeybindsFromFile(filePath: string): Promise<Keybind[]> {
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  if (data.keybinds && Array.isArray(data.keybinds)) {
    return data.keybinds;
  }

  // Handle merged configuration format
  if (data.tools) {
    const keybinds: Keybind[] = [];
    for (const [tool, toolConfig] of Object.entries(data.tools)) {
      const config = toolConfig as any;
      if (config.defaults) keybinds.push(...config.defaults);
      if (config.user) keybinds.push(...config.user);
      if (config.generated) keybinds.push(...config.generated);
    }
    return keybinds;
  }

  throw new Error('Invalid configuration file format');
}

/**
 * Helper functions
 */
function getSimilarKeys(key: string): string[] {
  const keyGroups = new Map([
    ['A', ['S', 'Q', 'Z']],
    ['S', ['A', 'D', 'W', 'X']],
    ['D', ['S', 'F', 'E', 'C']],
    ['F', ['D', 'G', 'R', 'V']],
    ['J', ['H', 'K', 'U', 'N']],
    ['K', ['J', 'L', 'I', 'M']],
    ['L', ['K', 'O']],
  ]);

  return keyGroups.get(key.toUpperCase()) || [];
}

function getKeepReason(keepKeybind: Keybind, remapKeybinds: Keybind[]): string {
  if (keepKeybind.source === 'user') return 'User-defined keybinding';
  if (keepKeybind.frequency === 'high') return 'High-frequency action';
  if (keepKeybind.priority < Math.min(...remapKeybinds.map(kb => kb.priority))) return 'Higher priority';
  return 'Default choice';
}

function calculateResolutionConfidence(conflict: any, keepKeybind: Keybind, remapKeybinds: Keybind[]): number {
  let confidence = 0.5;
  
  if (keepKeybind.source === 'user') confidence += 0.3;
  if (keepKeybind.frequency === 'high') confidence += 0.2;
  if (conflict.severity === 'error') confidence += 0.2;
  
  return Math.min(confidence, 1.0);
}

function generateSimplifiedModifiers(modifiers: string[], baseKey: string): string {
  const simplified = modifiers.slice(0, 2); // Take only first 2 modifiers
  return simplified.length > 0 ? `${simplified.join('+')}+${baseKey}` : baseKey;
}

function generateSequentialAlternative(keybind: Keybind): string {
  const baseKey = keybind.key.split('+').pop();
  return `${keybind.modifiers[0]}+${baseKey} ${baseKey}`;
}

/**
 * Display suggestions
 */
function displaySuggestions(suggestions: any[], options: SuggestionOptions): void {
  if (suggestions.length === 0) {
    console.log('✨ No suggestions needed - configuration looks good!');
    return;
  }

  // Group by category
  const byCategory = new Map<string, any[]>();
  for (const suggestion of suggestions) {
    const category = suggestion.category || suggestion.type || 'general';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(suggestion);
  }

  for (const [category, categorySuggestions] of byCategory) {
    console.log(`\n📋 ${category.charAt(0).toUpperCase() + category.slice(1)} Suggestions:`);
    
    for (const suggestion of categorySuggestions) {
      const confidence = Math.round((suggestion.confidence || 0) * 100);
      const icon = confidence > 80 ? '🟢' : confidence > 60 ? '🟡' : '🔴';
      
      console.log(`\n  ${icon} ${suggestion.title} (${confidence}% confidence)`);
      console.log(`     ${suggestion.description}`);
      
      if (suggestion.alternatives && suggestion.alternatives.length > 0) {
        console.log(`     Suggestions: ${suggestion.alternatives.slice(0, 3).join(', ')}`);
      }
      
      if (options.verbose) {
        console.log(`     ID: ${suggestion.id}`);
        if (suggestion.impact) console.log(`     Impact: ${suggestion.impact}`);
      }
    }
  }
}

/**
 * Export suggestions to file
 */
async function exportSuggestions(suggestions: any[], exportPath: string, options: SuggestionOptions): Promise<void> {
  const exportData = {
    generated: new Date().toISOString(),
    mode: options.mode,
    filters: {
      tool: options.tool || null,
      context: options.context || null,
    },
    suggestions,
    summary: {
      total: suggestions.length,
      byType: suggestions.reduce((acc, s) => {
        const type = s.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      avgConfidence: suggestions.reduce((sum, s) => sum + (s.confidence || 0), 0) / suggestions.length,
    },
  };

  writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
🧠 Keybinding Suggestions Generator

Generate AI-powered suggestions for keybinding optimization

USAGE:
  bun run generate-suggestions.ts [OPTIONS] <config-files...>

OPTIONS:
  -m, --mode <mode>         Suggestion mode: optimize, resolve, generate, ergonomic (default: optimize)
  -t, --tool <tool>         Focus on specific tool
  -c, --context <context>   Focus on specific context
  --no-conflicts           Skip conflict resolution suggestions
  --no-ergonomics          Skip ergonomic suggestions
  --no-frequency           Skip frequency optimization suggestions
  --no-patterns            Skip pattern optimization suggestions
  -e, --export <file>      Export suggestions to JSON file
  -v, --verbose            Verbose output
  -h, --help               Show this help

MODES:
  optimize    Comprehensive optimization suggestions (default)
  resolve     Focus on conflict resolution
  generate    Suggest new keybindings for common actions
  ergonomic   Focus on ergonomic improvements

EXAMPLES:
  # Generate optimization suggestions
  bun run generate-suggestions.ts ./config.json

  # Focus on tmux conflicts
  bun run generate-suggestions.ts -m resolve -t tmux ./config.json

  # Ergonomic analysis with export
  bun run generate-suggestions.ts -m ergonomic -e suggestions.json ./config.json

  # Generate new keybindings
  bun run generate-suggestions.ts -m generate ./config.json
`);
}

/**
 * Parse command line arguments
 */
function parseArguments(): SuggestionOptions {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      mode: { type: 'string', short: 'm' },
      tool: { type: 'string', short: 't' },
      context: { type: 'string', short: 'c' },
      'no-conflicts': { type: 'boolean' },
      'no-ergonomics': { type: 'boolean' },
      'no-frequency': { type: 'boolean' },
      'no-patterns': { type: 'boolean' },
      export: { type: 'string', short: 'e' },
      verbose: { type: 'boolean', short: 'v' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (positionals.length === 0) {
    console.error('❌ No configuration files specified');
    printHelp();
    process.exit(1);
  }

  const options: SuggestionOptions = { ...DEFAULT_OPTIONS };

  options.configFiles = positionals;
  if (values.mode) options.mode = values.mode as any;
  if (values.tool) options.tool = values.tool;
  if (values.context) options.context = values.context;
  if (values['no-conflicts']) options.conflicts = false;
  if (values['no-ergonomics']) options.ergonomics = false;
  if (values['no-frequency']) options.frequency = false;
  if (values['no-patterns']) options.patterns = false;
  if (values.export) options.export = values.export;
  if (values.verbose) options.verbose = true;

  // Validate mode
  if (!['optimize', 'resolve', 'generate', 'ergonomic'].includes(options.mode!)) {
    console.error(`❌ Invalid mode: ${options.mode}. Must be 'optimize', 'resolve', 'generate', or 'ergonomic'`);
    process.exit(1);
  }

  return options;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const options = parseArguments();
    await generateSuggestions(options);
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}