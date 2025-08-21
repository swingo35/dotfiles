/**
 * Collision Detection Engine
 * Detects and analyzes keybinding conflicts with context awareness
 */

import { KeyNormalizer } from './normalizer.js';
import type { 
  Keybind, 
  Conflict, 
  ConflictType, 
  CollisionRegistry, 
  ValidationResult,
  NormalizedKey 
} from '../types/index.js';

export class CollisionDetector {
  private registry: CollisionRegistry;

  constructor() {
    this.registry = {
      globalKeys: new Map(),
      contextKeys: new Map(),
      toolKeys: new Map(),
    };
  }

  /**
   * Build collision registry from keybindings
   */
  buildRegistry(keybinds: Keybind[]): void {
    this.clearRegistry();

    for (const keybind of keybinds) {
      this.registerKeybind(keybind);
    }
  }

  /**
   * Clear the collision registry
   */
  private clearRegistry(): void {
    this.registry.globalKeys.clear();
    this.registry.contextKeys.clear();
    this.registry.toolKeys.clear();
  }

  /**
   * Register a single keybinding in the collision registry
   */
  private registerKeybind(keybind: Keybind): void {
    const normalizedKey = KeyNormalizer.normalize(keybind.key);
    const keyString = normalizedKey.normalized;

    // Register in global registry
    if (!this.registry.globalKeys.has(keyString)) {
      this.registry.globalKeys.set(keyString, []);
    }
    this.registry.globalKeys.get(keyString)!.push(keybind.id);

    // Register in context-specific registry
    if (!this.registry.contextKeys.has(keybind.context)) {
      this.registry.contextKeys.set(keybind.context, new Map());
    }
    const contextRegistry = this.registry.contextKeys.get(keybind.context)!;
    if (!contextRegistry.has(keyString)) {
      contextRegistry.set(keyString, []);
    }
    contextRegistry.get(keyString)!.push(keybind.id);

    // Register in tool-specific registry
    if (!this.registry.toolKeys.has(keybind.tool)) {
      this.registry.toolKeys.set(keybind.tool, new Map());
    }
    const toolRegistry = this.registry.toolKeys.get(keybind.tool)!;
    if (!toolRegistry.has(keyString)) {
      toolRegistry.set(keyString, []);
    }
    toolRegistry.get(keyString)!.push(keybind.id);
  }

  /**
   * Detect all collisions in the current registry
   */
  detectAllCollisions(keybinds: Keybind[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const keybindMap = new Map(keybinds.map(kb => [kb.id, kb]));

    // Check global collisions
    for (const [keyString, keybindIds] of this.registry.globalKeys) {
      if (keybindIds.length > 1) {
        const globalConflicts = this.analyzeGlobalCollision(keyString, keybindIds, keybindMap);
        conflicts.push(...globalConflicts);
      }
    }

    // Check context-specific collisions
    for (const [context, contextRegistry] of this.registry.contextKeys) {
      for (const [keyString, keybindIds] of contextRegistry) {
        if (keybindIds.length > 1) {
          const contextConflicts = this.analyzeContextCollision(
            context,
            keyString,
            keybindIds,
            keybindMap
          );
          conflicts.push(...contextConflicts);
        }
      }
    }

    // Check for system reserved key violations
    const systemConflicts = this.detectSystemReservedConflicts(keybinds);
    conflicts.push(...systemConflicts);

    return this.deduplicateConflicts(conflicts);
  }

  /**
   * Detect conflicts for a specific keybinding
   */
  detectKeybindCollisions(keybind: Keybind, allKeybinds: Keybind[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const normalizedKey = KeyNormalizer.normalize(keybind.key);
    const keyString = normalizedKey.normalized;

    // Find other keybindings with the same key
    const conflictingKeybinds = allKeybinds.filter(kb => 
      kb.id !== keybind.id && 
      KeyNormalizer.normalize(kb.key).normalized === keyString
    );

    if (conflictingKeybinds.length === 0) {
      return conflicts;
    }

    // Analyze each potential conflict
    for (const conflictingKeybind of conflictingKeybinds) {
      const conflict = this.analyzeKeybindPair(keybind, conflictingKeybind);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    // Check if it's a system reserved key
    if (KeyNormalizer.isSystemReserved(normalizedKey)) {
      conflicts.push({
        id: `system-reserved-${keybind.id}`,
        severity: 'error',
        type: ConflictType.SYSTEM_OVERRIDE,
        key: keyString,
        keybinds: [keybind.id],
        contexts: [keybind.context],
        tools: [keybind.tool],
        message: `Attempting to override system reserved key: ${KeyNormalizer.toHumanReadable(normalizedKey)}`,
        suggestions: this.suggestAlternativeKeys(normalizedKey),
      });
    }

    return conflicts;
  }

  /**
   * Analyze collision between all keybindings with the same global key
   */
  private analyzeGlobalCollision(
    keyString: string,
    keybindIds: string[],
    keybindMap: Map<string, Keybind>
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const keybinds = keybindIds.map(id => keybindMap.get(id)!).filter(Boolean);

    // Group by context to understand overlap
    const contextGroups = new Map<string, Keybind[]>();
    for (const keybind of keybinds) {
      if (!contextGroups.has(keybind.context)) {
        contextGroups.set(keybind.context, []);
      }
      contextGroups.get(keybind.context)!.push(keybind);
    }

    // If all are in different contexts, it might be okay
    if (contextGroups.size === keybinds.length) {
      // Different contexts - check for cross-tool conflicts
      if (this.hasOverlappingContexts(Array.from(contextGroups.keys()))) {
        conflicts.push({
          id: `cross-tool-${keyString}`,
          severity: 'warning',
          type: ConflictType.CROSS_TOOL,
          key: keyString,
          keybinds: keybindIds,
          contexts: Array.from(contextGroups.keys()),
          tools: [...new Set(keybinds.map(kb => kb.tool))],
          message: `Key used across multiple tools with potentially overlapping contexts`,
          suggestions: ['Consider using tool-specific modifier keys', 'Verify contexts don\'t overlap'],
        });
      }
    } else {
      // Same contexts - hard collision
      for (const [context, contextKeybinds] of contextGroups) {
        if (contextKeybinds.length > 1) {
          conflicts.push({
            id: `hard-collision-${context}-${keyString}`,
            severity: 'error',
            type: ConflictType.HARD_COLLISION,
            key: keyString,
            keybinds: contextKeybinds.map(kb => kb.id),
            contexts: [context],
            tools: [...new Set(contextKeybinds.map(kb => kb.tool))],
            message: `Multiple keybindings for same key in context: ${context}`,
            suggestions: this.suggestConflictResolution(contextKeybinds),
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Analyze collision within a specific context
   */
  private analyzeContextCollision(
    context: string,
    keyString: string,
    keybindIds: string[],
    keybindMap: Map<string, Keybind>
  ): Conflict[] {
    const keybinds = keybindIds.map(id => keybindMap.get(id)!).filter(Boolean);

    // Check for user override scenarios
    const defaultKeybinds = keybinds.filter(kb => kb.source === 'default');
    const userKeybinds = keybinds.filter(kb => kb.source === 'user');

    if (defaultKeybinds.length > 0 && userKeybinds.length > 0) {
      // User override - this is intentional
      return [{
        id: `shadow-${context}-${keyString}`,
        severity: 'info',
        type: ConflictType.SHADOW_COLLISION,
        key: keyString,
        keybinds: keybindIds,
        contexts: [context],
        tools: [...new Set(keybinds.map(kb => kb.tool))],
        message: `User keybinding overrides default for ${keyString}`,
        suggestions: ['This is intentional and expected'],
      }];
    }

    if (userKeybinds.length > 1) {
      // Multiple user keybindings - hard collision
      return [{
        id: `user-collision-${context}-${keyString}`,
        severity: 'error',
        type: ConflictType.HARD_COLLISION,
        key: keyString,
        keybinds: userKeybinds.map(kb => kb.id),
        contexts: [context],
        tools: [...new Set(userKeybinds.map(kb => kb.tool))],
        message: `Multiple user keybindings conflict for ${keyString}`,
        suggestions: this.suggestConflictResolution(userKeybinds),
      }];
    }

    return [];
  }

  /**
   * Analyze collision between two specific keybindings
   */
  private analyzeKeybindPair(keybind1: Keybind, keybind2: Keybind): Conflict | null {
    const key1 = KeyNormalizer.normalize(keybind1.key);
    const key2 = KeyNormalizer.normalize(keybind2.key);

    if (!KeyNormalizer.wouldConflict(key1, key2)) {
      return null;
    }

    // Determine conflict type
    let conflictType: ConflictType;
    let severity: 'error' | 'warning' | 'info' = 'error';

    if (keybind1.context === keybind2.context) {
      if ((keybind1.source === 'default' && keybind2.source === 'user') ||
          (keybind1.source === 'user' && keybind2.source === 'default')) {
        conflictType = ConflictType.SHADOW_COLLISION;
        severity = 'info';
      } else {
        conflictType = ConflictType.HARD_COLLISION;
        severity = 'error';
      }
    } else if (this.contextsOverlap(keybind1.context, keybind2.context)) {
      conflictType = ConflictType.SOFT_COLLISION;
      severity = 'warning';
    } else {
      conflictType = ConflictType.CROSS_TOOL;
      severity = 'warning';
    }

    return {
      id: `conflict-${keybind1.id}-${keybind2.id}`,
      severity,
      type: conflictType,
      key: key1.normalized,
      keybinds: [keybind1.id, keybind2.id],
      contexts: [keybind1.context, keybind2.context],
      tools: [keybind1.tool, keybind2.tool],
      message: this.generateConflictMessage(conflictType, keybind1, keybind2),
      suggestions: this.suggestPairResolution(keybind1, keybind2),
    };
  }

  /**
   * Detect system reserved key violations
   */
  private detectSystemReservedConflicts(keybinds: Keybind[]): Conflict[] {
    const conflicts: Conflict[] = [];

    for (const keybind of keybinds) {
      const normalizedKey = KeyNormalizer.normalize(keybind.key);
      
      if (KeyNormalizer.isSystemReserved(normalizedKey)) {
        conflicts.push({
          id: `system-reserved-${keybind.id}`,
          severity: 'error',
          type: ConflictType.SYSTEM_OVERRIDE,
          key: normalizedKey.normalized,
          keybinds: [keybind.id],
          contexts: [keybind.context],
          tools: [keybind.tool],
          message: `System reserved key should not be overridden: ${KeyNormalizer.toHumanReadable(normalizedKey)}`,
          suggestions: this.suggestAlternativeKeys(normalizedKey),
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if contexts overlap (could cause conflicts)
   */
  private contextsOverlap(context1: string, context2: string): boolean {
    // Global context overlaps with everything
    if (context1 === 'global' || context2 === 'global') {
      return true;
    }

    // Same tool contexts might overlap
    const tool1 = context1.split('-')[0];
    const tool2 = context2.split('-')[0];
    
    return tool1 === tool2;
  }

  /**
   * Check if multiple contexts have overlapping scopes
   */
  private hasOverlappingContexts(contexts: string[]): boolean {
    const globalContexts = contexts.filter(c => c === 'global');
    if (globalContexts.length > 0) {
      return true;
    }

    // Check for tool overlap
    const tools = new Set(contexts.map(c => c.split('-')[0]));
    return tools.size < contexts.length;
  }

  /**
   * Generate human-readable conflict message
   */
  private generateConflictMessage(type: ConflictType, keybind1: Keybind, keybind2: Keybind): string {
    const key = KeyNormalizer.toHumanReadable(KeyNormalizer.normalize(keybind1.key));
    
    switch (type) {
      case ConflictType.HARD_COLLISION:
        return `Key ${key} is bound to both "${keybind1.action}" and "${keybind2.action}" in the same context`;
      case ConflictType.SOFT_COLLISION:
        return `Key ${key} is used in overlapping contexts: "${keybind1.context}" and "${keybind2.context}"`;
      case ConflictType.SHADOW_COLLISION:
        return `User keybinding for ${key} overrides default behavior`;
      case ConflictType.CROSS_TOOL:
        return `Key ${key} is used by multiple tools: ${keybind1.tool} and ${keybind2.tool}`;
      case ConflictType.SYSTEM_OVERRIDE:
        return `Key ${key} is reserved by the system and should not be overridden`;
      default:
        return `Conflict detected for key ${key}`;
    }
  }

  /**
   * Suggest resolutions for a group of conflicting keybindings
   */
  private suggestConflictResolution(keybinds: Keybind[]): string[] {
    const suggestions: string[] = [];
    
    if (keybinds.length === 2) {
      suggestions.push(
        `Keep "${keybinds[0].action}" and remap "${keybinds[1].action}"`,
        `Keep "${keybinds[1].action}" and remap "${keybinds[0].action}"`,
      );
    } else {
      suggestions.push('Remap all but one of the conflicting keybindings');
    }

    suggestions.push(
      'Use different modifier combinations',
      'Move some actions to different contexts',
      'Disable less frequently used actions',
    );

    return suggestions;
  }

  /**
   * Suggest resolutions for a pair of conflicting keybindings
   */
  private suggestPairResolution(keybind1: Keybind, keybind2: Keybind): string[] {
    const suggestions: string[] = [];

    // Priority-based suggestions
    if (keybind1.priority !== keybind2.priority) {
      const higher = keybind1.priority > keybind2.priority ? keybind1 : keybind2;
      const lower = keybind1.priority < keybind2.priority ? keybind1 : keybind2;
      suggestions.push(`Keep ${higher.tool} keybinding (higher priority) and remap ${lower.tool}`);
    }

    // Frequency-based suggestions
    if (keybind1.frequency === 'high' && keybind2.frequency !== 'high') {
      suggestions.push(`Keep high-frequency action "${keybind1.action}"`);
    } else if (keybind2.frequency === 'high' && keybind1.frequency !== 'high') {
      suggestions.push(`Keep high-frequency action "${keybind2.action}"`);
    }

    // Context-based suggestions
    if (keybind1.context === 'global' && keybind2.context !== 'global') {
      suggestions.push('Keep global keybinding and move tool-specific to different key');
    } else if (keybind2.context === 'global' && keybind1.context !== 'global') {
      suggestions.push('Keep global keybinding and move tool-specific to different key');
    }

    // Generic suggestions
    suggestions.push(
      'Add tool-specific modifier key',
      'Use sequential key combination instead',
      'Change to less common key combination',
    );

    return suggestions;
  }

  /**
   * Suggest alternative keys that don't conflict
   */
  private suggestAlternativeKeys(normalizedKey: NormalizedKey): string[] {
    const suggestions: string[] = [];
    const baseKey = normalizedKey.key;
    const modifiers = Array.from(normalizedKey.modifiers);

    // Try adding/changing modifiers
    const modifierCombinations = [
      ['ctrl'],
      ['option'],
      ['shift'],
      ['ctrl', 'shift'],
      ['option', 'shift'],
      ['ctrl', 'option'],
      ['ctrl', 'option', 'shift'],
    ];

    for (const mods of modifierCombinations) {
      const suggestion = mods.length > 0 ? `${mods.join('+')}+${baseKey}` : baseKey;
      suggestions.push(suggestion);
    }

    // Try similar keys
    const similarKeys = this.getSimilarKeys(baseKey);
    for (const key of similarKeys) {
      const suggestion = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
      suggestions.push(suggestion);
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Get keys similar to the given key
   */
  private getSimilarKeys(key: string): string[] {
    const keyGroups = new Map([
      ['A', ['S', 'Q', 'Z']],
      ['S', ['A', 'D', 'W', 'X']],
      ['D', ['S', 'F', 'E', 'C']],
      ['F', ['D', 'G', 'R', 'V']],
      ['Space', ['Tab', 'Enter']],
      ['Enter', ['Space', 'Tab']],
      ['Tab', ['Space', 'Enter']],
    ]);

    return keyGroups.get(key) || [];
  }

  /**
   * Remove duplicate conflicts
   */
  private deduplicateConflicts(conflicts: Conflict[]): Conflict[] {
    const seen = new Set<string>();
    const unique: Conflict[] = [];

    for (const conflict of conflicts) {
      // Create a signature for the conflict
      const signature = `${conflict.type}-${conflict.key}-${conflict.keybinds.sort().join('-')}`;
      
      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(conflict);
      }
    }

    return unique;
  }

  /**
   * Validate complete configuration and return comprehensive results
   */
  validateConfiguration(keybinds: Keybind[]): ValidationResult {
    this.buildRegistry(keybinds);
    const conflicts = this.detectAllCollisions(keybinds);

    const errors = conflicts.filter(c => c.severity === 'error');
    const warnings = conflicts.filter(c => c.severity === 'warning');
    const info = conflicts.filter(c => c.severity === 'info');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
      suggestions: this.generateValidationSuggestions(conflicts),
    };
  }

  /**
   * Generate suggestions for improving the overall configuration
   */
  private generateValidationSuggestions(conflicts: Conflict[]): any[] {
    const suggestions: any[] = [];

    // Count conflict types
    const conflictCounts = new Map<ConflictType, number>();
    for (const conflict of conflicts) {
      conflictCounts.set(conflict.type, (conflictCounts.get(conflict.type) || 0) + 1);
    }

    // Generate suggestions based on conflict patterns
    if (conflictCounts.get(ConflictType.HARD_COLLISION)! > 3) {
      suggestions.push({
        id: 'too-many-hard-collisions',
        action: 'Review keybinding organization',
        reason: 'Multiple hard collisions detected',
        confidence: 0.9,
        alternatives: ['Use more specific contexts', 'Implement priority-based resolution'],
      });
    }

    if (conflictCounts.get(ConflictType.CROSS_TOOL)! > 5) {
      suggestions.push({
        id: 'cross-tool-conflicts',
        action: 'Standardize modifier key usage across tools',
        reason: 'Many cross-tool conflicts detected',
        confidence: 0.8,
        alternatives: ['Use tool-specific modifiers', 'Create tool-switching workflow'],
      });
    }

    return suggestions;
  }
}