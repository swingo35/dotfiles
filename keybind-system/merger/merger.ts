/**
 * Priority-Based Keybinding Merger
 * Merges keybindings from multiple sources with intelligent conflict resolution
 */

import { CollisionDetector } from '../collision-detector/detector.js';
import type { 
  Keybind, 
  KeybindingLayer, 
  MergedConfig, 
  ToolConfig,
  Conflict,
  ConflictType,
  Priority,
  Source,
  ValidationResult 
} from '../types/index.js';

export interface MergerOptions {
  resolveConflicts: boolean;
  prioritizeUserConfig: boolean;
  allowSystemOverrides: boolean;
  preserveDisabled: boolean;
  generateSuggestions: boolean;
}

export class KeybindMerger {
  private collisionDetector: CollisionDetector;
  private readonly defaultOptions: MergerOptions = {
    resolveConflicts: true,
    prioritizeUserConfig: true,
    allowSystemOverrides: false,
    preserveDisabled: true,
    generateSuggestions: true,
  };

  constructor() {
    this.collisionDetector = new CollisionDetector();
  }

  /**
   * Merge keybindings from multiple tools and sources
   */
  merge(toolLayers: Record<string, KeybindingLayer>, options: Partial<MergerOptions> = {}): MergedConfig {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    // Collect all keybindings
    const allKeybinds: Keybind[] = [];
    const toolConfigs: Record<string, ToolConfig> = {};

    for (const [tool, layers] of Object.entries(toolLayers)) {
      const toolKeybinds = this.mergeToolLayers(layers, opts);
      allKeybinds.push(...toolKeybinds);

      toolConfigs[tool] = {
        tool,
        defaults: layers.defaults || [],
        user: layers.user || [],
        generated: layers.generated || [],
        conflicts: [],
        suggestions: [],
      };
    }

    // Detect collisions
    this.collisionDetector.buildRegistry(allKeybinds);
    const allConflicts = this.collisionDetector.detectAllCollisions(allKeybinds);

    // Categorize conflicts
    const globalConflicts = allConflicts.filter(c => this.isGlobalConflict(c));
    const contextualConflicts = allConflicts.filter(c => this.isContextualConflict(c));
    const resolvedConflicts: Conflict[] = [];

    // Resolve conflicts if requested
    if (opts.resolveConflicts) {
      const { resolved, updated } = this.resolveConflicts(allKeybinds, allConflicts, opts);
      resolvedConflicts.push(...resolved);
      
      // Update keybinds with resolved conflicts
      for (let i = 0; i < allKeybinds.length; i++) {
        const updatedKeybind = updated.find(kb => kb.id === allKeybinds[i].id);
        if (updatedKeybind) {
          allKeybinds[i] = updatedKeybind;
        }
      }

      // Redistribute resolved keybinds back to tool configs
      this.redistributeKeybinds(allKeybinds, toolConfigs);
    }

    // Update tool configs with conflicts
    this.assignConflictsToTools(allConflicts, toolConfigs);

    // Generate suggestions if requested
    if (opts.generateSuggestions) {
      this.generateToolSuggestions(toolConfigs, allConflicts);
    }

    // Validate final configuration
    const validation = this.collisionDetector.validateConfiguration(allKeybinds);

    // Calculate statistics
    const statistics = this.calculateStatistics(allKeybinds, allConflicts);

    return {
      version: '2.0',
      generated: new Date().toISOString(),
      tools: toolConfigs,
      collisions: {
        global: globalConflicts,
        contextual: contextualConflicts,
        resolved: resolvedConflicts,
      },
      validation,
      statistics,
    };
  }

  /**
   * Merge layers within a single tool
   */
  private mergeToolLayers(layers: KeybindingLayer, options: MergerOptions): Keybind[] {
    const keybindMap = new Map<string, Keybind>();

    // Add system keybinds first (lowest priority unless allowed to override)
    for (const keybind of layers.system || []) {
      const key = this.createKeybindKey(keybind);
      keybindMap.set(key, keybind);
    }

    // Add defaults (higher priority than system)
    for (const keybind of layers.defaults || []) {
      const key = this.createKeybindKey(keybind);
      const existing = keybindMap.get(key);
      
      if (!existing || this.shouldReplace(existing, keybind, options)) {
        keybindMap.set(key, keybind);
      }
    }

    // Add user keybinds (highest priority)
    for (const keybind of layers.user || []) {
      const key = this.createKeybindKey(keybind);
      const existing = keybindMap.get(key);
      
      if (!existing || this.shouldReplace(existing, keybind, options)) {
        keybindMap.set(key, keybind);
      }
    }

    // Add generated keybinds (only if no conflicts)
    for (const keybind of layers.generated || []) {
      const key = this.createKeybindKey(keybind);
      if (!keybindMap.has(key)) {
        keybindMap.set(key, keybind);
      }
    }

    return Array.from(keybindMap.values());
  }

  /**
   * Create a unique key for keybind comparison
   */
  private createKeybindKey(keybind: Keybind): string {
    return `${keybind.context}:${keybind.key}`;
  }

  /**
   * Determine if a keybind should replace an existing one
   */
  private shouldReplace(existing: Keybind, candidate: Keybind, options: MergerOptions): boolean {
    // User always wins if prioritized
    if (options.prioritizeUserConfig && candidate.source === 'user' && existing.source !== 'user') {
      return true;
    }

    // System overrides only if explicitly allowed
    if (existing.source === 'system' && !options.allowSystemOverrides) {
      return false;
    }

    // Priority-based replacement
    return candidate.priority > existing.priority;
  }

  /**
   * Resolve conflicts using priority rules and user preferences
   */
  private resolveConflicts(
    keybinds: Keybind[], 
    conflicts: Conflict[], 
    options: MergerOptions
  ): { resolved: Conflict[]; updated: Keybind[] } {
    const resolved: Conflict[] = [];
    const updated: Keybind[] = [];
    const keybindMap = new Map(keybinds.map(kb => [kb.id, kb]));

    for (const conflict of conflicts) {
      if (conflict.severity === 'error') {
        const resolution = this.resolveErrorConflict(conflict, keybindMap, options);
        if (resolution) {
          resolved.push(conflict);
          updated.push(...resolution.updatedKeybinds);
        }
      }
    }

    return { resolved, updated };
  }

  /**
   * Resolve error-level conflicts
   */
  private resolveErrorConflict(
    conflict: Conflict, 
    keybindMap: Map<string, Keybind>, 
    options: MergerOptions
  ): { updatedKeybinds: Keybind[] } | null {
    const conflictingKeybinds = conflict.keybinds
      .map(id => keybindMap.get(id))
      .filter(Boolean) as Keybind[];

    if (conflictingKeybinds.length < 2) {
      return null;
    }

    const updatedKeybinds: Keybind[] = [];

    switch (conflict.type) {
      case ConflictType.HARD_COLLISION:
        return this.resolveHardCollision(conflictingKeybinds, options);
      
      case ConflictType.SYSTEM_OVERRIDE:
        return this.resolveSystemOverride(conflictingKeybinds, options);
      
      default:
        return null;
    }
  }

  /**
   * Resolve hard collision by disabling lower priority keybinds
   */
  private resolveHardCollision(keybinds: Keybind[], options: MergerOptions): { updatedKeybinds: Keybind[] } {
    const updatedKeybinds: Keybind[] = [];
    
    // Sort by priority (higher priority first)
    const sorted = [...keybinds].sort((a, b) => {
      // User configs always win
      if (a.source === 'user' && b.source !== 'user') return -1;
      if (b.source === 'user' && a.source !== 'user') return 1;
      
      // Then by priority enum
      if (a.priority !== b.priority) return a.priority - b.priority;
      
      // Then by frequency (high frequency wins)
      const freqOrder = { high: 0, medium: 1, low: 2 };
      const aFreq = freqOrder[a.frequency] ?? 3;
      const bFreq = freqOrder[b.frequency] ?? 3;
      
      return aFreq - bFreq;
    });

    // Keep the highest priority, disable others
    for (let i = 0; i < sorted.length; i++) {
      const keybind = { ...sorted[i] };
      
      if (i === 0) {
        // Keep the highest priority keybind
        keybind.conflicts = sorted.slice(1).map(kb => kb.id);
        updatedKeybinds.push(keybind);
      } else {
        // Disable lower priority keybinds
        keybind.disabled = true;
        keybind.conflicts = [sorted[0].id];
        
        if (options.preserveDisabled) {
          updatedKeybinds.push(keybind);
        }
      }
    }

    return { updatedKeybinds };
  }

  /**
   * Resolve system override by disabling user keybind
   */
  private resolveSystemOverride(keybinds: Keybind[], options: MergerOptions): { updatedKeybinds: Keybind[] } {
    const updatedKeybinds: Keybind[] = [];

    for (const keybind of keybinds) {
      const updated = { ...keybind };
      
      if (keybind.source !== 'system') {
        updated.disabled = true;
        updated.conflicts = [`system-reserved-${keybind.key}`];
      }
      
      updatedKeybinds.push(updated);
    }

    return { updatedKeybinds };
  }

  /**
   * Redistribute resolved keybinds back to tool configurations
   */
  private redistributeKeybinds(allKeybinds: Keybind[], toolConfigs: Record<string, ToolConfig>): void {
    for (const keybind of allKeybinds) {
      const toolConfig = toolConfigs[keybind.tool];
      if (!toolConfig) continue;

      // Find and update the keybind in the appropriate source array
      const sourceArray = this.getSourceArray(toolConfig, keybind.source);
      const index = sourceArray.findIndex(kb => kb.id === keybind.id);
      
      if (index >= 0) {
        sourceArray[index] = keybind;
      }
    }
  }

  /**
   * Get the appropriate source array from tool config
   */
  private getSourceArray(toolConfig: ToolConfig, source: Source): Keybind[] {
    switch (source) {
      case 'default': return toolConfig.defaults;
      case 'user': return toolConfig.user;
      case 'generated': return toolConfig.generated;
      default: return toolConfig.user; // fallback
    }
  }

  /**
   * Assign conflicts to their respective tools
   */
  private assignConflictsToTools(conflicts: Conflict[], toolConfigs: Record<string, ToolConfig>): void {
    for (const conflict of conflicts) {
      for (const tool of conflict.tools) {
        const toolConfig = toolConfigs[tool];
        if (toolConfig) {
          toolConfig.conflicts.push(conflict);
        }
      }
    }
  }

  /**
   * Generate suggestions for each tool
   */
  private generateToolSuggestions(toolConfigs: Record<string, ToolConfig>, conflicts: Conflict[]): void {
    for (const [tool, config] of Object.entries(toolConfigs)) {
      const toolConflicts = conflicts.filter(c => c.tools.includes(tool));
      const suggestions = this.generateSuggestionsForTool(tool, config, toolConflicts);
      config.suggestions.push(...suggestions);
    }
  }

  /**
   * Generate suggestions for a specific tool
   */
  private generateSuggestionsForTool(tool: string, config: ToolConfig, conflicts: Conflict[]): any[] {
    const suggestions: any[] = [];

    // Suggest modifier key standardization
    const modifierUsage = this.analyzeModifierUsage(config);
    if (modifierUsage.inconsistent) {
      suggestions.push({
        id: `${tool}-standardize-modifiers`,
        action: `Standardize modifier key usage in ${tool}`,
        reason: 'Inconsistent modifier key patterns detected',
        confidence: 0.8,
        alternatives: modifierUsage.suggestions,
      });
    }

    // Suggest conflict resolution for hard collisions
    const hardCollisions = conflicts.filter(c => c.type === ConflictType.HARD_COLLISION);
    if (hardCollisions.length > 0) {
      suggestions.push({
        id: `${tool}-resolve-collisions`,
        action: `Resolve ${hardCollisions.length} hard collision(s) in ${tool}`,
        reason: 'Multiple keybindings assigned to same key',
        confidence: 0.9,
        alternatives: ['Remap lower priority actions', 'Use sequential key combinations'],
      });
    }

    // Suggest ergonomic improvements
    const ergonomicIssues = this.analyzeErgonomics(config);
    if (ergonomicIssues.length > 0) {
      suggestions.push({
        id: `${tool}-improve-ergonomics`,
        action: `Improve ergonomics for ${ergonomicIssues.length} keybinding(s)`,
        reason: 'Difficult key combinations detected',
        confidence: 0.7,
        alternatives: ['Use home row keys', 'Reduce modifier complexity'],
      });
    }

    return suggestions;
  }

  /**
   * Analyze modifier key usage patterns
   */
  private analyzeModifierUsage(config: ToolConfig): { inconsistent: boolean; suggestions: string[] } {
    const allKeybinds = [...config.defaults, ...config.user, ...config.generated];
    const modifierPatterns = new Map<string, number>();

    for (const keybind of allKeybinds) {
      const pattern = keybind.modifiers.sort().join('+');
      modifierPatterns.set(pattern, (modifierPatterns.get(pattern) || 0) + 1);
    }

    const totalKeybinds = allKeybinds.length;
    const dominantPattern = Array.from(modifierPatterns.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const inconsistent = dominantPattern && (dominantPattern[1] / totalKeybinds) < 0.6;

    return {
      inconsistent,
      suggestions: inconsistent ? [
        `Consider using ${dominantPattern?.[0]} as standard modifier pattern`,
        'Group related actions with consistent modifiers',
      ] : [],
    };
  }

  /**
   * Analyze ergonomic issues in keybindings
   */
  private analyzeErgonomics(config: ToolConfig): Keybind[] {
    const allKeybinds = [...config.defaults, ...config.user, ...config.generated];
    const problematic: Keybind[] = [];

    for (const keybind of allKeybinds) {
      // Check for overly complex modifier combinations
      if (keybind.modifiers.length > 3) {
        problematic.push(keybind);
        continue;
      }

      // Check for difficult key combinations
      const key = keybind.key.split('+').pop()?.toLowerCase();
      const difficultKeys = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'];
      if (key && difficultKeys.includes(key)) {
        problematic.push(keybind);
      }
    }

    return problematic;
  }

  /**
   * Check if conflict is global (affects multiple tools)
   */
  private isGlobalConflict(conflict: Conflict): boolean {
    return conflict.tools.length > 1 || conflict.contexts.includes('global');
  }

  /**
   * Check if conflict is contextual (within same tool/context)
   */
  private isContextualConflict(conflict: Conflict): boolean {
    return conflict.tools.length === 1 && !conflict.contexts.includes('global');
  }

  /**
   * Calculate statistics for the merged configuration
   */
  private calculateStatistics(keybinds: Keybind[], conflicts: Conflict[]): any {
    const byTool = new Map<string, number>();
    const bySource = new Map<Source, number>();
    const byConflictType = new Map<ConflictType, number>();

    for (const keybind of keybinds) {
      byTool.set(keybind.tool, (byTool.get(keybind.tool) || 0) + 1);
      bySource.set(keybind.source, (bySource.get(keybind.source) || 0) + 1);
    }

    for (const conflict of conflicts) {
      byConflictType.set(conflict.type, (byConflictType.get(conflict.type) || 0) + 1);
    }

    return {
      totalKeybinds: keybinds.length,
      byTool: Object.fromEntries(byTool),
      bySource: Object.fromEntries(bySource),
      conflicts: Object.fromEntries(byConflictType),
    };
  }
}