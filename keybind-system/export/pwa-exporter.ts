/**
 * PWA Export System
 * Converts keybinding data to PWA-compatible formats for the learning app
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Keybind, MergedConfig, ValidationResult } from '../types/index.js';

export interface PWAExportOptions {
  outputDir: string;
  includeDefaults: boolean;
  includeMetadata: boolean;
  generateLearningPaths: boolean;
  includeCategories: boolean;
  includeRelationships: boolean;
  minifyOutput: boolean;
}

export interface PWAKeybind {
  id: string;
  key: string;
  description: string;
  category: string;
  context: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  frequency: 'high' | 'medium' | 'low';
  tool: string;
  shortcuts?: string[];
  alternatives?: string[];
  conflicts?: string[];
  disabled?: boolean;
}

export interface PWACategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  order: number;
  keybindCount: number;
}

export interface PWALearningPath {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  prerequisites: string[];
  keybinds: string[];
  order: number;
}

export interface PWARelationship {
  id: string;
  type: 'similar' | 'opposite' | 'sequence' | 'group';
  keybinds: string[];
  description: string;
}

export interface PWAExportData {
  version: string;
  generated: string;
  metadata: {
    totalKeybinds: number;
    tools: string[];
    categories: string[];
    contexts: string[];
    lastUpdated: string;
  };
  keybinds: PWAKeybind[];
  categories: PWACategory[];
  learningPaths: PWALearningPath[];
  relationships: PWARelationship[];
  validation: {
    valid: boolean;
    errors: number;
    warnings: number;
    lastValidated: string;
  };
}

export class PWAExporter {
  private readonly defaultOptions: PWAExportOptions = {
    outputDir: './pwa-export',
    includeDefaults: true,
    includeMetadata: true,
    generateLearningPaths: true,
    includeCategories: true,
    includeRelationships: true,
    minifyOutput: false,
  };

  /**
   * Export merged configuration to PWA format
   */
  async exportToPWA(
    mergedConfig: MergedConfig,
    validation: ValidationResult,
    options: Partial<PWAExportOptions> = {}
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };

    // Create output directory
    mkdirSync(opts.outputDir, { recursive: true });

    // Extract keybindings from merged config
    const allKeybinds = this.extractKeybindings(mergedConfig, opts);

    // Convert to PWA format
    const pwaKeybinds = this.convertKeybindsToPWA(allKeybinds);

    // Generate categories
    const categories = opts.includeCategories ? this.generateCategories(pwaKeybinds) : [];

    // Generate learning paths
    const learningPaths = opts.generateLearningPaths ? this.generateLearningPaths(pwaKeybinds) : [];

    // Generate relationships
    const relationships = opts.includeRelationships ? this.generateRelationships(pwaKeybinds) : [];

    // Create export data
    const exportData: PWAExportData = {
      version: '2.0.0',
      generated: new Date().toISOString(),
      metadata: this.generateMetadata(allKeybinds, mergedConfig),
      keybinds: pwaKeybinds,
      categories,
      learningPaths,
      relationships,
      validation: {
        valid: validation.valid,
        errors: validation.errors.length,
        warnings: validation.warnings.length,
        lastValidated: new Date().toISOString(),
      },
    };

    // Write main export file
    const mainFile = join(opts.outputDir, 'keybinds.json');
    this.writeJSON(mainFile, exportData, opts.minifyOutput);

    // Write separate files for different data types
    await this.writeSeparateFiles(exportData, opts);

    // Generate index files for different access patterns
    await this.generateIndexFiles(exportData, opts);

    return opts.outputDir;
  }

  /**
   * Extract keybindings from merged configuration
   */
  private extractKeybindings(mergedConfig: MergedConfig, options: PWAExportOptions): Keybind[] {
    const keybinds: Keybind[] = [];

    for (const [tool, toolConfig] of Object.entries(mergedConfig.tools)) {
      // Add defaults if requested
      if (options.includeDefaults) {
        keybinds.push(...toolConfig.defaults);
      }

      // Always include user and generated keybindings
      keybinds.push(...toolConfig.user);
      keybinds.push(...toolConfig.generated);
    }

    return keybinds;
  }

  /**
   * Convert keybindings to PWA format
   */
  private convertKeybindsToPWA(keybinds: Keybind[]): PWAKeybind[] {
    return keybinds.map(keybind => ({
      id: keybind.id,
      key: this.formatKeyForPWA(keybind.key),
      description: keybind.action,
      category: keybind.category,
      context: keybind.context,
      tags: keybind.tags || [],
      difficulty: keybind.difficulty,
      frequency: keybind.frequency,
      tool: keybind.tool,
      shortcuts: this.generateShortcutVariations(keybind.key),
      alternatives: keybind.alternatives || [],
      conflicts: keybind.conflicts || [],
      disabled: keybind.disabled || false,
    }));
  }

  /**
   * Format key for PWA display
   */
  private formatKeyForPWA(key: string): string {
    // Convert to more readable format for PWA
    return key
      .replace(/Cmd/g, '⌘')
      .replace(/Option/g, '⌥')
      .replace(/Shift/g, '⇧')
      .replace(/Ctrl/g, '⌃')
      .replace(/Space/g, '␣')
      .replace(/Tab/g, '⇥')
      .replace(/Enter/g, '↵')
      .replace(/Escape/g, '⎋')
      .replace(/Backspace/g, '⌫')
      .replace(/Delete/g, '⌦');
  }

  /**
   * Generate shortcut variations for better search
   */
  private generateShortcutVariations(key: string): string[] {
    const variations: string[] = [key];

    // Add symbol variations
    variations.push(this.formatKeyForPWA(key));

    // Add alternative representations
    const altKey = key
      .replace(/Cmd/g, 'Command')
      .replace(/Option/g, 'Alt')
      .replace(/Ctrl/g, 'Control');
    
    if (altKey !== key) {
      variations.push(altKey);
    }

    return [...new Set(variations)];
  }

  /**
   * Generate categories from keybindings
   */
  private generateCategories(keybinds: PWAKeybind[]): PWACategory[] {
    const categoryMap = new Map<string, PWACategory>();

    // Count keybindings per category
    const categoryCounts = new Map<string, number>();
    for (const keybind of keybinds) {
      categoryCounts.set(keybind.category, (categoryCounts.get(keybind.category) || 0) + 1);
    }

    // Define category metadata
    const categoryData = new Map([
      ['General', { description: 'Common system-wide shortcuts', icon: '⚡', color: '#3B82F6', order: 1 }],
      ['File', { description: 'File operations and management', icon: '📁', color: '#10B981', order: 2 }],
      ['Edit', { description: 'Text editing and manipulation', icon: '✏️', color: '#F59E0B', order: 3 }],
      ['View', { description: 'Display and view controls', icon: '👁️', color: '#8B5CF6', order: 4 }],
      ['Navigation', { description: 'Moving around and switching', icon: '🧭', color: '#EF4444', order: 5 }],
      ['Window Management', { description: 'Window and pane operations', icon: '🪟', color: '#06B6D4', order: 6 }],
      ['Tab Management', { description: 'Tab operations and navigation', icon: '📑', color: '#84CC16', order: 7 }],
      ['Search', { description: 'Search and find operations', icon: '🔍', color: '#F97316', order: 8 }],
      ['Terminal', { description: 'Terminal-specific commands', icon: '💻', color: '#6B7280', order: 9 }],
      ['Developer', { description: 'Development tools and features', icon: '🛠️', color: '#EC4899', order: 10 }],
    ]);

    for (const [category, count] of categoryCounts) {
      const data = categoryData.get(category) || {
        description: `${category} related shortcuts`,
        icon: '⚙️',
        color: '#6B7280',
        order: 999,
      };

      categoryMap.set(category, {
        id: category.toLowerCase().replace(/\s+/g, '-'),
        name: category,
        description: data.description,
        icon: data.icon,
        color: data.color,
        order: data.order,
        keybindCount: count,
      });
    }

    return Array.from(categoryMap.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * Generate learning paths
   */
  private generateLearningPaths(keybinds: PWAKeybind[]): PWALearningPath[] {
    const paths: PWALearningPath[] = [];

    // Beginner path - essential shortcuts
    const beginnerKeybinds = keybinds.filter(kb => 
      kb.difficulty === 'beginner' && 
      kb.frequency === 'high' &&
      kb.tags.includes('essential')
    ).slice(0, 10);

    if (beginnerKeybinds.length > 0) {
      paths.push({
        id: 'beginner-essentials',
        name: 'Essential Shortcuts',
        description: 'Learn the most important keyboard shortcuts first',
        difficulty: 'beginner',
        estimatedTime: 15,
        prerequisites: [],
        keybinds: beginnerKeybinds.map(kb => kb.id),
        order: 1,
      });
    }

    // Tool-specific paths
    const tools = [...new Set(keybinds.map(kb => kb.tool))];
    for (const tool of tools) {
      const toolKeybinds = keybinds.filter(kb => kb.tool === tool);
      const essentialToolKeybinds = toolKeybinds
        .filter(kb => kb.frequency === 'high')
        .slice(0, 8);

      if (essentialToolKeybinds.length > 0) {
        paths.push({
          id: `${tool}-essentials`,
          name: `${tool.charAt(0).toUpperCase() + tool.slice(1)} Mastery`,
          description: `Master the essential ${tool} shortcuts`,
          difficulty: 'intermediate',
          estimatedTime: 20,
          prerequisites: ['beginner-essentials'],
          keybinds: essentialToolKeybinds.map(kb => kb.id),
          order: paths.length + 1,
        });
      }
    }

    // Advanced path - complex shortcuts
    const advancedKeybinds = keybinds.filter(kb => 
      kb.difficulty === 'advanced'
    ).slice(0, 12);

    if (advancedKeybinds.length > 0) {
      paths.push({
        id: 'advanced-power-user',
        name: 'Power User',
        description: 'Advanced shortcuts for power users',
        difficulty: 'advanced',
        estimatedTime: 30,
        prerequisites: tools.map(tool => `${tool}-essentials`),
        keybinds: advancedKeybinds.map(kb => kb.id),
        order: paths.length + 1,
      });
    }

    return paths;
  }

  /**
   * Generate relationships between keybindings
   */
  private generateRelationships(keybinds: PWAKeybind[]): PWARelationship[] {
    const relationships: PWARelationship[] = [];

    // Group similar actions
    const actionGroups = this.groupSimilarActions(keybinds);
    for (const [groupName, groupKeybinds] of actionGroups) {
      if (groupKeybinds.length > 1) {
        relationships.push({
          id: `group-${groupName}`,
          type: 'group',
          keybinds: groupKeybinds.map(kb => kb.id),
          description: `Related ${groupName} actions`,
        });
      }
    }

    // Find sequence patterns (e.g., tab navigation)
    const sequences = this.findSequencePatterns(keybinds);
    relationships.push(...sequences);

    // Find opposite actions
    const opposites = this.findOppositeActions(keybinds);
    relationships.push(...opposites);

    return relationships;
  }

  /**
   * Group similar actions together
   */
  private groupSimilarActions(keybinds: PWAKeybind[]): Map<string, PWAKeybind[]> {
    const groups = new Map<string, PWAKeybind[]>();

    for (const keybind of keybinds) {
      // Group by common action words
      const actionWords = keybind.description.toLowerCase().split(' ');
      for (const word of actionWords) {
        if (['copy', 'paste', 'cut', 'save', 'open', 'close', 'new', 'tab', 'window', 'focus', 'move'].includes(word)) {
          if (!groups.has(word)) {
            groups.set(word, []);
          }
          groups.get(word)!.push(keybind);
        }
      }
    }

    return groups;
  }

  /**
   * Find sequence patterns
   */
  private findSequencePatterns(keybinds: PWAKeybind[]): PWARelationship[] {
    const sequences: PWARelationship[] = [];

    // Find tab navigation sequences
    const tabKeybinds = keybinds.filter(kb => 
      kb.description.toLowerCase().includes('tab') &&
      (kb.description.toLowerCase().includes('next') || kb.description.toLowerCase().includes('previous'))
    );

    if (tabKeybinds.length >= 2) {
      sequences.push({
        id: 'sequence-tab-navigation',
        type: 'sequence',
        keybinds: tabKeybinds.map(kb => kb.id),
        description: 'Tab navigation sequence',
      });
    }

    // Find workspace sequences
    const workspaceKeybinds = keybinds.filter(kb => 
      kb.description.toLowerCase().includes('workspace')
    );

    if (workspaceKeybinds.length >= 2) {
      sequences.push({
        id: 'sequence-workspace-navigation',
        type: 'sequence',
        keybinds: workspaceKeybinds.map(kb => kb.id),
        description: 'Workspace navigation sequence',
      });
    }

    return sequences;
  }

  /**
   * Find opposite actions
   */
  private findOppositeActions(keybinds: PWAKeybind[]): PWARelationship[] {
    const opposites: PWARelationship[] = [];

    const oppositePatterns = [
      ['increase', 'decrease'],
      ['next', 'previous'],
      ['up', 'down'],
      ['left', 'right'],
      ['open', 'close'],
      ['zoom in', 'zoom out'],
    ];

    for (const [positive, negative] of oppositePatterns) {
      const positiveKeybinds = keybinds.filter(kb => 
        kb.description.toLowerCase().includes(positive)
      );
      const negativeKeybinds = keybinds.filter(kb => 
        kb.description.toLowerCase().includes(negative)
      );

      if (positiveKeybinds.length > 0 && negativeKeybinds.length > 0) {
        opposites.push({
          id: `opposite-${positive}-${negative}`,
          type: 'opposite',
          keybinds: [...positiveKeybinds, ...negativeKeybinds].map(kb => kb.id),
          description: `${positive} vs ${negative} actions`,
        });
      }
    }

    return opposites;
  }

  /**
   * Generate metadata
   */
  private generateMetadata(keybinds: Keybind[], mergedConfig: MergedConfig): PWAExportData['metadata'] {
    return {
      totalKeybinds: keybinds.length,
      tools: [...new Set(keybinds.map(kb => kb.tool))],
      categories: [...new Set(keybinds.map(kb => kb.category))],
      contexts: [...new Set(keybinds.map(kb => kb.context))],
      lastUpdated: mergedConfig.generated,
    };
  }

  /**
   * Write separate files for different data types
   */
  private async writeSeparateFiles(exportData: PWAExportData, options: PWAExportOptions): Promise<void> {
    const { outputDir, minifyOutput } = options;

    // Write keybindings only
    this.writeJSON(
      join(outputDir, 'keybinds-only.json'),
      { keybinds: exportData.keybinds },
      minifyOutput
    );

    // Write categories only
    this.writeJSON(
      join(outputDir, 'categories.json'),
      { categories: exportData.categories },
      minifyOutput
    );

    // Write learning paths only
    this.writeJSON(
      join(outputDir, 'learning-paths.json'),
      { learningPaths: exportData.learningPaths },
      minifyOutput
    );

    // Write metadata only
    this.writeJSON(
      join(outputDir, 'metadata.json'),
      { metadata: exportData.metadata, validation: exportData.validation },
      minifyOutput
    );
  }

  /**
   * Generate index files for different access patterns
   */
  private async generateIndexFiles(exportData: PWAExportData, options: PWAExportOptions): Promise<void> {
    const { outputDir, minifyOutput } = options;

    // Index by tool
    const byTool = new Map<string, PWAKeybind[]>();
    for (const keybind of exportData.keybinds) {
      if (!byTool.has(keybind.tool)) {
        byTool.set(keybind.tool, []);
      }
      byTool.get(keybind.tool)!.push(keybind);
    }
    this.writeJSON(
      join(outputDir, 'index-by-tool.json'),
      Object.fromEntries(byTool),
      minifyOutput
    );

    // Index by category
    const byCategory = new Map<string, PWAKeybind[]>();
    for (const keybind of exportData.keybinds) {
      if (!byCategory.has(keybind.category)) {
        byCategory.set(keybind.category, []);
      }
      byCategory.get(keybind.category)!.push(keybind);
    }
    this.writeJSON(
      join(outputDir, 'index-by-category.json'),
      Object.fromEntries(byCategory),
      minifyOutput
    );

    // Index by difficulty
    const byDifficulty = new Map<string, PWAKeybind[]>();
    for (const keybind of exportData.keybinds) {
      if (!byDifficulty.has(keybind.difficulty)) {
        byDifficulty.set(keybind.difficulty, []);
      }
      byDifficulty.get(keybind.difficulty)!.push(keybind);
    }
    this.writeJSON(
      join(outputDir, 'index-by-difficulty.json'),
      Object.fromEntries(byDifficulty),
      minifyOutput
    );

    // Search index for faster lookups
    const searchIndex = this.generateSearchIndex(exportData.keybinds);
    this.writeJSON(
      join(outputDir, 'search-index.json'),
      searchIndex,
      minifyOutput
    );
  }

  /**
   * Generate search index
   */
  private generateSearchIndex(keybinds: PWAKeybind[]): any {
    const index: any = {
      keys: new Map<string, string[]>(),
      descriptions: new Map<string, string[]>(),
      tags: new Map<string, string[]>(),
      tools: new Map<string, string[]>(),
    };

    for (const keybind of keybinds) {
      // Index by key components
      const keyComponents = keybind.key.toLowerCase().split(/[+\s]/);
      for (const component of keyComponents) {
        if (!index.keys.has(component)) {
          index.keys.set(component, []);
        }
        index.keys.get(component).push(keybind.id);
      }

      // Index by description words
      const descWords = keybind.description.toLowerCase().split(/\s+/);
      for (const word of descWords) {
        if (!index.descriptions.has(word)) {
          index.descriptions.set(word, []);
        }
        index.descriptions.get(word).push(keybind.id);
      }

      // Index by tags
      for (const tag of keybind.tags) {
        if (!index.tags.has(tag.toLowerCase())) {
          index.tags.set(tag.toLowerCase(), []);
        }
        index.tags.get(tag.toLowerCase()).push(keybind.id);
      }

      // Index by tool
      if (!index.tools.has(keybind.tool.toLowerCase())) {
        index.tools.set(keybind.tool.toLowerCase(), []);
      }
      index.tools.get(keybind.tool.toLowerCase()).push(keybind.id);
    }

    // Convert Maps to Objects for JSON serialization
    return {
      keys: Object.fromEntries(index.keys),
      descriptions: Object.fromEntries(index.descriptions),
      tags: Object.fromEntries(index.tags),
      tools: Object.fromEntries(index.tools),
    };
  }

  /**
   * Write JSON to file
   */
  private writeJSON(filePath: string, data: any, minify: boolean): void {
    const json = minify ? JSON.stringify(data) : JSON.stringify(data, null, 2);
    writeFileSync(filePath, json);
  }
}