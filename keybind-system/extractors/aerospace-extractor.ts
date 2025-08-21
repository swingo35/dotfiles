/**
 * AeroSpace Keybinding Extractor
 * Parses AeroSpace TOML configuration and extracts keybinding information
 */

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Keybind, ExtractorResult, Priority } from '../types/index.js';

// Simple TOML parser for AeroSpace config
interface TOMLValue {
  [key: string]: any;
}

export interface AeroSpaceExtractionOptions {
  configFile?: string;
  defaultsFile?: string;
  includePlatformDefaults?: boolean;
}

export class AeroSpaceExtractor {
  private readonly defaultOptions: AeroSpaceExtractionOptions = {
    configFile: join(homedir(), '.config', 'aerospace', 'aerospace.toml'),
    defaultsFile: join(import.meta.dir, '../data/aerospace-defaults.json'),
    includePlatformDefaults: true,
  };

  /**
   * Extract AeroSpace keybindings from TOML config
   */
  async extract(options: AeroSpaceExtractionOptions = {}): Promise<ExtractorResult> {
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    const keybinds: Keybind[] = [];

    try {
      // Load default keybindings
      let defaultKeybinds: Keybind[] = [];
      if (opts.includePlatformDefaults) {
        try {
          defaultKeybinds = await this.loadDefaults(opts.defaultsFile!);
        } catch (error) {
          warnings.push(`Could not load defaults: ${error}`);
        }
      }

      // Parse user TOML config file
      let userKeybinds: Keybind[] = [];
      if (opts.configFile && existsSync(opts.configFile)) {
        try {
          userKeybinds = await this.parseTomlConfig(opts.configFile);
        } catch (error) {
          errors.push(`Failed to parse TOML config: ${error}`);
        }
      }

      // Merge keybindings
      const mergedKeybinds = this.mergeKeybinds(defaultKeybinds, userKeybinds);
      keybinds.push(...mergedKeybinds);

      // Try to get version info
      let version: string | undefined;
      try {
        version = await this.getAeroSpaceVersion();
      } catch (error) {
        warnings.push(`Could not determine AeroSpace version: ${error}`);
      }

      return {
        tool: 'aerospace',
        version,
        keybinds,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Extraction failed: ${error}`);
      return {
        tool: 'aerospace',
        keybinds: [],
        errors,
        warnings,
      };
    }
  }

  /**
   * Get AeroSpace version
   */
  private async getAeroSpaceVersion(): Promise<string> {
    try {
      const { $ } = await import('bun');
      const result = await $`aerospace --version`.quiet();
      return result.stdout.toString().trim();
    } catch {
      throw new Error('AeroSpace not found or not accessible');
    }
  }

  /**
   * Load default keybindings from JSON file
   */
  private async loadDefaults(defaultsFile: string): Promise<Keybind[]> {
    if (!existsSync(defaultsFile)) {
      return this.getBuiltInDefaults();
    }

    try {
      const content = readFileSync(defaultsFile, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.keybinds && Array.isArray(data.keybinds)) {
        return data.keybinds.map((kb: any) => ({
          ...kb,
          source: 'default',
          priority: Priority.TOOL_DEFAULT,
        }));
      }
      
      return this.getBuiltInDefaults();
    } catch (error) {
      throw new Error(`Failed to parse defaults file: ${error}`);
    }
  }

  /**
   * Get built-in AeroSpace defaults (Hyper key strategy from config)
   */
  private getBuiltInDefaults(): Keybind[] {
    return [
      {
        id: 'aerospace-default-focus-left',
        tool: 'aerospace',
        key: 'Cmd+Ctrl+Option+Shift+H',
        modifiers: ['cmd', 'ctrl', 'option', 'shift'],
        action: 'Focus window to the left',
        category: 'Window Focus',
        context: 'aerospace',
        tags: ['focus', 'navigation', 'window', 'default'],
        difficulty: 'intermediate',
        frequency: 'high',
        alternatives: [],
        source: 'default',
        priority: Priority.TOOL_DEFAULT,
      },
      {
        id: 'aerospace-default-focus-right',
        tool: 'aerospace',
        key: 'Cmd+Ctrl+Option+Shift+L',
        modifiers: ['cmd', 'ctrl', 'option', 'shift'],
        action: 'Focus window to the right',
        category: 'Window Focus',
        context: 'aerospace',
        tags: ['focus', 'navigation', 'window', 'default'],
        difficulty: 'intermediate',
        frequency: 'high',
        alternatives: [],
        source: 'default',
        priority: Priority.TOOL_DEFAULT,
      },
      {
        id: 'aerospace-default-focus-up',
        tool: 'aerospace',
        key: 'Cmd+Ctrl+Option+Shift+K',
        modifiers: ['cmd', 'ctrl', 'option', 'shift'],
        action: 'Focus window above',
        category: 'Window Focus',
        context: 'aerospace',
        tags: ['focus', 'navigation', 'window', 'default'],
        difficulty: 'intermediate',
        frequency: 'high',
        alternatives: [],
        source: 'default',
        priority: Priority.TOOL_DEFAULT,
      },
      {
        id: 'aerospace-default-focus-down',
        tool: 'aerospace',
        key: 'Cmd+Ctrl+Option+Shift+J',
        modifiers: ['cmd', 'ctrl', 'option', 'shift'],
        action: 'Focus window below',
        category: 'Window Focus',
        context: 'aerospace',
        tags: ['focus', 'navigation', 'window', 'default'],
        difficulty: 'intermediate',
        frequency: 'high',
        alternatives: [],
        source: 'default',
        priority: Priority.TOOL_DEFAULT,
      },
    ];
  }

  /**
   * Parse AeroSpace TOML configuration file
   */
  private async parseTomlConfig(configFile: string): Promise<Keybind[]> {
    const keybinds: Keybind[] = [];
    
    try {
      const content = readFileSync(configFile, 'utf-8');
      const tomlData = this.parseToml(content);

      // Extract key-mapping sections
      if (tomlData['key-mapping']) {
        const keyMappings = tomlData['key-mapping'];
        for (const [key, action] of Object.entries(keyMappings)) {
          if (typeof action === 'string') {
            const keybind = this.createKeybindFromMapping(
              key,
              action,
              'default',
              configFile
            );
            if (keybind) keybinds.push(keybind);
          }
        }
      }

      // Extract mode-specific bindings
      for (const [sectionName, sectionData] of Object.entries(tomlData)) {
        if (sectionName.startsWith('mode.') && typeof sectionData === 'object') {
          const modeName = sectionName.replace('mode.', '');
          const modeData = sectionData as Record<string, any>;
          
          if (modeData['key-mapping']) {
            const keyMappings = modeData['key-mapping'];
            for (const [key, action] of Object.entries(keyMappings)) {
              if (typeof action === 'string') {
                const keybind = this.createKeybindFromMapping(
                  key,
                  action,
                  modeName,
                  configFile
                );
                if (keybind) keybinds.push(keybind);
              }
            }
          }
        }
      }

    } catch (error) {
      throw new Error(`Failed to parse TOML config: ${error}`);
    }

    return keybinds;
  }

  /**
   * Simple TOML parser (basic implementation for AeroSpace config)
   */
  private parseToml(content: string): TOMLValue {
    const result: TOMLValue = {};
    const lines = content.split('\n');
    let currentSection = '';
    let currentSectionData: TOMLValue = result;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments and empty lines
      if (!line || line.startsWith('#')) {
        continue;
      }

      // Handle section headers [section] or [section.subsection]
      const sectionMatch = line.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        
        // Handle nested sections
        if (currentSection.includes('.')) {
          const parts = currentSection.split('.');
          let current = result;
          let fullPath = '';
          
          for (let j = 0; j < parts.length; j++) {
            fullPath = fullPath ? `${fullPath}.${parts[j]}` : parts[j];
            if (j === parts.length - 1) {
              if (!current[fullPath]) {
                current[fullPath] = {};
              }
              currentSectionData = current[fullPath];
            } else {
              if (!current[parts[j]]) {
                current[parts[j]] = {};
              }
              current = current[parts[j]];
            }
          }
        } else {
          if (!result[currentSection]) {
            result[currentSection] = {};
          }
          currentSectionData = result[currentSection];
        }
        continue;
      }

      // Handle key-value pairs
      const kvMatch = line.match(/^([^=]+)=(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        let value = kvMatch[2].trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Handle arrays (basic)
        if (value.startsWith('[') && value.endsWith(']')) {
          const arrayContent = value.slice(1, -1);
          const items = arrayContent.split(',').map(item => item.trim().replace(/['"]/g, ''));
          currentSectionData[key] = items;
        } else {
          currentSectionData[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Create keybind from key mapping
   */
  private createKeybindFromMapping(
    key: string,
    action: string,
    mode: string,
    configFile: string
  ): Keybind | null {
    try {
      const normalizedKey = this.normalizeAeroSpaceKey(key);
      const modifiers = this.extractModifiers(normalizedKey);
      const category = this.categorizeAction(action);
      const humanAction = this.humanizeAction(action);
      
      const id = `aerospace-${mode}-${normalizedKey.replace(/[+\s]/g, '-')}`;

      return {
        id,
        tool: 'aerospace',
        key: normalizedKey,
        modifiers,
        action: humanAction,
        category,
        context: `aerospace-${mode}`,
        tags: this.generateTags(action, category, mode),
        difficulty: this.assessDifficulty(action, mode),
        frequency: this.assessFrequency(action),
        alternatives: [],
        source: 'user',
        sourceFile: configFile,
        priority: Priority.USER_OVERRIDE,
      };
    } catch (error) {
      console.warn(`Failed to create keybind for ${key}: ${error}`);
      return null;
    }
  }

  /**
   * Normalize AeroSpace key representation
   */
  private normalizeAeroSpaceKey(key: string): string {
    // AeroSpace uses hyper key (cmd+ctrl+option+shift) frequently
    const keyMap = new Map([
      ['cmd', 'Cmd'],
      ['ctrl', 'Ctrl'],
      ['alt', 'Option'],
      ['option', 'Option'],
      ['shift', 'Shift'],
      ['hyper', 'Cmd+Ctrl+Option+Shift'],
    ]);

    // Handle hyper key special case
    if (key.toLowerCase().includes('hyper')) {
      const baseKey = key.toLowerCase().replace('hyper+', '').replace('hyper-', '');
      const normalizedBase = baseKey.charAt(0).toUpperCase() + baseKey.slice(1);
      return `Cmd+Ctrl+Option+Shift+${normalizedBase}`;
    }

    // Split by + or - separators
    const parts = key.toLowerCase().split(/[+\-]/);
    const normalizedParts: string[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      const mapped = keyMap.get(trimmed) || trimmed;
      
      // Capitalize single characters
      if (mapped.length === 1 && /[a-z]/.test(mapped)) {
        normalizedParts.push(mapped.toUpperCase());
      } else {
        normalizedParts.push(mapped);
      }
    }

    return normalizedParts.join('+');
  }

  /**
   * Extract modifiers from normalized key
   */
  private extractModifiers(key: string): string[] {
    const modifiers: string[] = [];
    const parts = key.split('+');

    for (const part of parts) {
      const lower = part.toLowerCase();
      if (['cmd', 'ctrl', 'option', 'shift'].includes(lower)) {
        modifiers.push(lower);
      }
    }

    return modifiers;
  }

  /**
   * Categorize AeroSpace action
   */
  private categorizeAction(action: string): string {
    const categoryMap = new Map([
      // Window Focus
      ['focus', 'Window Focus'],
      ['focus-left', 'Window Focus'],
      ['focus-right', 'Window Focus'],
      ['focus-up', 'Window Focus'],
      ['focus-down', 'Window Focus'],
      
      // Window Movement
      ['move', 'Window Movement'],
      ['move-left', 'Window Movement'],
      ['move-right', 'Window Movement'],
      ['move-up', 'Window Movement'],
      ['move-down', 'Window Movement'],
      ['move-node-to-workspace', 'Window Movement'],
      
      // Layout
      ['layout', 'Layout'],
      ['split', 'Layout'],
      ['resize', 'Layout'],
      ['fullscreen', 'Layout'],
      
      // Workspaces
      ['workspace', 'Workspaces'],
      ['workspace-back-and-forth', 'Workspaces'],
      
      // Mode
      ['mode', 'Mode'],
      
      // System
      ['reload-config', 'System'],
      ['close-all-windows-but-current', 'System'],
    ]);

    // Check for exact matches first
    if (categoryMap.has(action)) {
      return categoryMap.get(action)!;
    }

    // Check for partial matches
    for (const [actionPattern, category] of categoryMap) {
      if (action.includes(actionPattern)) {
        return category;
      }
    }

    return 'Other';
  }

  /**
   * Convert AeroSpace action to human-readable description
   */
  private humanizeAction(action: string): string {
    const actionMap = new Map([
      ['focus-left', 'Focus window to the left'],
      ['focus-right', 'Focus window to the right'],
      ['focus-up', 'Focus window above'],
      ['focus-down', 'Focus window below'],
      ['move-left', 'Move window to the left'],
      ['move-right', 'Move window to the right'],
      ['move-up', 'Move window up'],
      ['move-down', 'Move window down'],
      ['split-horizontal', 'Split window horizontally'],
      ['split-vertical', 'Split window vertically'],
      ['layout-tiles', 'Switch to tiles layout'],
      ['layout-accordion', 'Switch to accordion layout'],
      ['layout-floating', 'Switch to floating layout'],
      ['fullscreen', 'Toggle fullscreen'],
      ['resize', 'Resize window'],
      ['workspace-back-and-forth', 'Switch to previous workspace'],
      ['reload-config', 'Reload AeroSpace configuration'],
      ['close-all-windows-but-current', 'Close all windows except current'],
      ['mode', 'Enter mode'],
    ]);

    // Handle parameterized actions
    if (action.startsWith('workspace ')) {
      const workspace = action.replace('workspace ', '');
      return `Switch to workspace ${workspace}`;
    }
    
    if (action.startsWith('move-node-to-workspace ')) {
      const workspace = action.replace('move-node-to-workspace ', '');
      return `Move window to workspace ${workspace}`;
    }

    if (action.startsWith('resize ')) {
      const direction = action.replace('resize ', '');
      return `Resize window ${direction}`;
    }

    if (action.startsWith('mode ')) {
      const modeName = action.replace('mode ', '');
      return `Enter ${modeName} mode`;
    }

    return actionMap.get(action) || action.replace(/-/g, ' ');
  }

  /**
   * Generate tags for searchability
   */
  private generateTags(action: string, category: string, mode: string): string[] {
    const tags = [category.toLowerCase().replace(/\s+/g, '-'), mode];
    
    if (action.includes('focus')) tags.push('focus', 'navigation');
    if (action.includes('move')) tags.push('move', 'window');
    if (action.includes('workspace')) tags.push('workspace', 'navigation');
    if (action.includes('layout')) tags.push('layout', 'tiling');
    if (action.includes('resize')) tags.push('resize', 'window');
    if (action.includes('fullscreen')) tags.push('fullscreen', 'view');
    if (action.includes('config')) tags.push('config', 'system');
    
    // Mark essential shortcuts
    const essentialActions = ['focus-left', 'focus-right', 'focus-up', 'focus-down', 'workspace'];
    if (essentialActions.some(a => action.includes(a))) {
      tags.push('essential');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Assess difficulty level
   */
  private assessDifficulty(action: string, mode: string): 'beginner' | 'intermediate' | 'advanced' {
    const beginnerActions = [
      'focus-left', 'focus-right', 'focus-up', 'focus-down',
      'workspace', 'fullscreen'
    ];
    
    const advancedActions = [
      'reload-config', 'mode', 'layout', 'resize',
      'close-all-windows-but-current'
    ];

    if (mode !== 'default') return 'advanced'; // Mode-specific bindings
    if (beginnerActions.some(a => action.includes(a))) return 'beginner';
    if (advancedActions.some(a => action.includes(a))) return 'advanced';
    return 'intermediate';
  }

  /**
   * Assess usage frequency
   */
  private assessFrequency(action: string): 'high' | 'medium' | 'low' {
    const highFreq = [
      'focus-left', 'focus-right', 'focus-up', 'focus-down',
      'workspace', 'move-node-to-workspace'
    ];
    
    const lowFreq = [
      'reload-config', 'close-all-windows-but-current', 'mode',
      'layout'
    ];

    if (highFreq.some(a => action.includes(a))) return 'high';
    if (lowFreq.some(a => action.includes(a))) return 'low';
    return 'medium';
  }

  /**
   * Merge default and user keybindings
   */
  private mergeKeybinds(defaults: Keybind[], user: Keybind[]): Keybind[] {
    const merged = new Map<string, Keybind>();

    // Add defaults first
    for (const keybind of defaults) {
      const key = `${keybind.context}-${keybind.key}`;
      merged.set(key, keybind);
    }

    // Override with user keybindings
    for (const keybind of user) {
      const key = `${keybind.context}-${keybind.key}`;
      merged.set(key, keybind);
    }

    return Array.from(merged.values());
  }
}