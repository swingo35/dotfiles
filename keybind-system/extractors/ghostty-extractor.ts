/**
 * Ghostty Keybinding Extractor
 * Parses Ghostty config files and extracts keybinding information
 */

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Keybind, ExtractorResult, Priority } from '../types/index.js';

export interface GhosttyExtractionOptions {
  configFile?: string;
  defaultsFile?: string;
  includePlatformDefaults?: boolean;
}

export class GhosttyExtractor {
  private readonly defaultOptions: GhosttyExtractionOptions = {
    configFile: join(homedir(), '.config', 'ghostty', 'config'),
    defaultsFile: join(import.meta.dir, '../data/ghostty-defaults.json'),
    includePlatformDefaults: true,
  };

  /**
   * Extract Ghostty keybindings from config file and defaults
   */
  async extract(options: GhosttyExtractionOptions = {}): Promise<ExtractorResult> {
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

      // Parse user config file
      let userKeybinds: Keybind[] = [];
      if (opts.configFile && existsSync(opts.configFile)) {
        try {
          userKeybinds = await this.parseConfigFile(opts.configFile);
        } catch (error) {
          errors.push(`Failed to parse config file: ${error}`);
        }
      }

      // Merge keybindings
      const mergedKeybinds = this.mergeKeybinds(defaultKeybinds, userKeybinds);
      keybinds.push(...mergedKeybinds);

      // Try to get version info
      let version: string | undefined;
      try {
        version = await this.getGhosttyVersion();
      } catch (error) {
        warnings.push(`Could not determine Ghostty version: ${error}`);
      }

      return {
        tool: 'ghostty',
        version,
        keybinds,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Extraction failed: ${error}`);
      return {
        tool: 'ghostty',
        keybinds: [],
        errors,
        warnings,
      };
    }
  }

  /**
   * Get Ghostty version
   */
  private async getGhosttyVersion(): Promise<string> {
    try {
      const { $ } = await import('bun');
      const result = await $`ghostty --version`.quiet();
      return result.stdout.toString().trim();
    } catch {
      throw new Error('Ghostty not found or not accessible');
    }
  }

  /**
   * Load default keybindings from JSON file
   */
  private async loadDefaults(defaultsFile: string): Promise<Keybind[]> {
    if (!existsSync(defaultsFile)) {
      // Return built-in macOS defaults if file doesn't exist
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
   * Get built-in macOS Ghostty defaults
   */
  private getBuiltInDefaults(): Keybind[] {
    return [
      {
        id: 'ghostty-default-new-window',
        tool: 'ghostty',
        key: 'Cmd+N',
        modifiers: ['cmd'],
        action: 'New window',
        category: 'Windows',
        context: 'ghostty',
        tags: ['window', 'new', 'default'],
        difficulty: 'beginner',
        frequency: 'medium',
        alternatives: [],
        source: 'default',
        priority: Priority.TOOL_DEFAULT,
      },
      {
        id: 'ghostty-default-new-tab',
        tool: 'ghostty',
        key: 'Cmd+T',
        modifiers: ['cmd'],
        action: 'New tab',
        category: 'Tabs',
        context: 'ghostty',
        tags: ['tab', 'new', 'default', 'essential'],
        difficulty: 'beginner',
        frequency: 'high',
        alternatives: [],
        source: 'default',
        priority: Priority.TOOL_DEFAULT,
      },
      {
        id: 'ghostty-default-close-tab',
        tool: 'ghostty',
        key: 'Cmd+W',
        modifiers: ['cmd'],
        action: 'Close tab',
        category: 'Tabs',
        context: 'ghostty',
        tags: ['tab', 'close', 'default', 'essential'],
        difficulty: 'beginner',
        frequency: 'high',
        alternatives: [],
        source: 'default',
        priority: Priority.TOOL_DEFAULT,
      },
      {
        id: 'ghostty-default-copy',
        tool: 'ghostty',
        key: 'Cmd+C',
        modifiers: ['cmd'],
        action: 'Copy selection',
        category: 'Copy & Paste',
        context: 'ghostty',
        tags: ['copy', 'clipboard', 'default', 'essential'],
        difficulty: 'beginner',
        frequency: 'high',
        alternatives: [],
        source: 'default',
        priority: Priority.TOOL_DEFAULT,
      },
      {
        id: 'ghostty-default-paste',
        tool: 'ghostty',
        key: 'Cmd+V',
        modifiers: ['cmd'],
        action: 'Paste from clipboard',
        category: 'Copy & Paste',
        context: 'ghostty',
        tags: ['paste', 'clipboard', 'default', 'essential'],
        difficulty: 'beginner',
        frequency: 'high',
        alternatives: [],
        source: 'default',
        priority: Priority.TOOL_DEFAULT,
      },
      {
        id: 'ghostty-default-quit',
        tool: 'ghostty',
        key: 'Cmd+Q',
        modifiers: ['cmd'],
        action: 'Quit application',
        category: 'Application',
        context: 'ghostty',
        tags: ['quit', 'exit', 'default'],
        difficulty: 'beginner',
        frequency: 'medium',
        alternatives: [],
        source: 'default',
        priority: Priority.TOOL_DEFAULT,
      },
    ];
  }

  /**
   * Parse Ghostty config file
   */
  private async parseConfigFile(configFile: string): Promise<Keybind[]> {
    const keybinds: Keybind[] = [];
    
    try {
      const content = readFileSync(configFile, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;

        // Skip comments and empty lines
        if (!line || line.startsWith('#')) {
          continue;
        }

        // Look for keybind directives
        const keybind = this.parseKeybindLine(line, configFile, lineNumber);
        if (keybind) {
          keybinds.push(keybind);
        }
      }
    } catch (error) {
      throw new Error(`Failed to read config file: ${error}`);
    }

    return keybinds;
  }

  /**
   * Parse a single keybind line from config
   */
  private parseKeybindLine(line: string, configFile: string, lineNumber: number): Keybind | null {
    // Ghostty keybind formats:
    // keybind = key=action
    // keybind = key:action  
    // keybind key action

    // Format 1: keybind = key=action
    let match = line.match(/^keybind\s*=\s*([^=]+)=(.+)$/);
    if (match) {
      const [, key, action] = match;
      return this.createKeybind(key.trim(), action.trim(), configFile, lineNumber);
    }

    // Format 2: keybind = key:action
    match = line.match(/^keybind\s*=\s*([^:]+):(.+)$/);
    if (match) {
      const [, key, action] = match;
      return this.createKeybind(key.trim(), action.trim(), configFile, lineNumber);
    }

    // Format 3: keybind key action
    match = line.match(/^keybind\s+(\S+)\s+(.+)$/);
    if (match) {
      const [, key, action] = match;
      return this.createKeybind(key.trim(), action.trim(), configFile, lineNumber);
    }

    return null;
  }

  /**
   * Create a keybind object from parsed data
   */
  private createKeybind(key: string, action: string, configFile: string, lineNumber: number): Keybind {
    const normalizedKey = this.normalizeGhosttyKey(key);
    const modifiers = this.extractModifiers(normalizedKey);
    const category = this.categorizeAction(action);
    const humanAction = this.humanizeAction(action);
    
    const id = `ghostty-user-${normalizedKey.replace(/[+\s]/g, '-')}-${lineNumber}`;

    return {
      id,
      tool: 'ghostty',
      key: normalizedKey,
      modifiers,
      action: humanAction,
      category,
      context: 'ghostty',
      tags: this.generateTags(action, category),
      difficulty: this.assessDifficulty(action),
      frequency: this.assessFrequency(action),
      alternatives: [],
      source: 'user',
      sourceFile: configFile,
      sourceLine: lineNumber,
      priority: Priority.USER_OVERRIDE,
    };
  }

  /**
   * Normalize Ghostty key representation
   */
  private normalizeGhosttyKey(key: string): string {
    // Convert Ghostty key format to consistent format
    const keyMap = new Map([
      ['ctrl', 'Ctrl'],
      ['control', 'Ctrl'],
      ['cmd', 'Cmd'],
      ['command', 'Cmd'],
      ['opt', 'Option'],
      ['option', 'Option'],
      ['alt', 'Option'],
      ['shift', 'Shift'],
      ['enter', 'Enter'],
      ['return', 'Enter'],
      ['space', 'Space'],
      ['tab', 'Tab'],
      ['escape', 'Escape'],
      ['esc', 'Escape'],
      ['backspace', 'Backspace'],
      ['delete', 'Delete'],
      ['up', 'Up'],
      ['down', 'Down'],
      ['left', 'Left'],
      ['right', 'Right'],
    ]);

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
   * Categorize Ghostty action
   */
  private categorizeAction(action: string): string {
    const categoryMap = new Map([
      // Windows
      ['new_window', 'Windows'],
      ['close_window', 'Windows'],
      ['toggle_fullscreen', 'Windows'],
      
      // Tabs
      ['new_tab', 'Tabs'],
      ['close_surface', 'Tabs'],
      ['previous_tab', 'Tabs'],
      ['next_tab', 'Tabs'],
      ['goto_tab', 'Tabs'],
      
      // Splits
      ['new_split', 'Splits'],
      ['goto_split', 'Splits'],
      ['resize_split', 'Splits'],
      ['toggle_split_zoom', 'Splits'],
      ['equalize_splits', 'Splits'],
      
      // Copy & Paste
      ['copy_to_clipboard', 'Copy & Paste'],
      ['paste_from_clipboard', 'Copy & Paste'],
      ['paste_from_selection', 'Copy & Paste'],
      
      // Navigation
      ['scroll_page_up', 'Navigation'],
      ['scroll_page_down', 'Navigation'],
      ['scroll_to_top', 'Navigation'],
      ['scroll_to_bottom', 'Navigation'],
      ['jump_to_prompt', 'Navigation'],
      
      // Font
      ['increase_font_size', 'Font'],
      ['decrease_font_size', 'Font'],
      ['reset_font_size', 'Font'],
      
      // Config
      ['reload_config', 'Configuration'],
      ['open_config', 'Configuration'],
      
      // Other
      ['clear_screen', 'Terminal'],
      ['quit', 'Application'],
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
   * Convert Ghostty action to human-readable description
   */
  private humanizeAction(action: string): string {
    const actionMap = new Map([
      ['new_window', 'Create new window'],
      ['close_window', 'Close current window'],
      ['new_tab', 'Create new tab'],
      ['close_surface', 'Close current tab or split'],
      ['previous_tab', 'Switch to previous tab'],
      ['next_tab', 'Switch to next tab'],
      ['goto_tab:1', 'Go to tab 1'],
      ['goto_tab:2', 'Go to tab 2'],
      ['goto_tab:3', 'Go to tab 3'],
      ['goto_tab:4', 'Go to tab 4'],
      ['goto_tab:5', 'Go to tab 5'],
      ['goto_tab:6', 'Go to tab 6'],
      ['goto_tab:7', 'Go to tab 7'],
      ['goto_tab:8', 'Go to tab 8'],
      ['goto_tab:9', 'Go to tab 9'],
      ['new_split:right', 'Create new split to the right'],
      ['new_split:down', 'Create new split below'],
      ['goto_split:left', 'Move to left split'],
      ['goto_split:right', 'Move to right split'],
      ['goto_split:top', 'Move to top split'],
      ['goto_split:bottom', 'Move to bottom split'],
      ['resize_split:left', 'Resize split left'],
      ['resize_split:right', 'Resize split right'],
      ['resize_split:up', 'Resize split up'],
      ['resize_split:down', 'Resize split down'],
      ['toggle_split_zoom', 'Toggle split zoom'],
      ['equalize_splits', 'Equalize all splits'],
      ['copy_to_clipboard', 'Copy selection to clipboard'],
      ['paste_from_clipboard', 'Paste from clipboard'],
      ['scroll_page_up', 'Scroll page up'],
      ['scroll_page_down', 'Scroll page down'],
      ['scroll_to_top', 'Scroll to top'],
      ['scroll_to_bottom', 'Scroll to bottom'],
      ['jump_to_prompt:previous', 'Jump to previous prompt'],
      ['jump_to_prompt:next', 'Jump to next prompt'],
      ['increase_font_size:1', 'Increase font size'],
      ['decrease_font_size:1', 'Decrease font size'],
      ['reset_font_size', 'Reset font size to default'],
      ['clear_screen', 'Clear screen'],
      ['reload_config', 'Reload configuration'],
      ['open_config', 'Open configuration file'],
      ['toggle_fullscreen', 'Toggle fullscreen mode'],
      ['quit', 'Quit application'],
    ]);

    return actionMap.get(action) || action.replace(/_/g, ' ').replace(/:/g, ' ');
  }

  /**
   * Generate tags for searchability
   */
  private generateTags(action: string, category: string): string[] {
    const tags = [category.toLowerCase().replace(/\s+/g, '-')];
    
    if (action.includes('new')) tags.push('create', 'new');
    if (action.includes('close')) tags.push('close', 'exit');
    if (action.includes('tab')) tags.push('tab');
    if (action.includes('split')) tags.push('split', 'pane');
    if (action.includes('window')) tags.push('window');
    if (action.includes('copy') || action.includes('paste')) tags.push('clipboard');
    if (action.includes('scroll')) tags.push('navigation', 'scroll');
    if (action.includes('font')) tags.push('font', 'size');
    if (['new_tab', 'close_surface', 'copy_to_clipboard', 'paste_from_clipboard'].includes(action)) {
      tags.push('essential');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Assess difficulty level
   */
  private assessDifficulty(action: string): 'beginner' | 'intermediate' | 'advanced' {
    const beginnerActions = [
      'new_tab', 'close_surface', 'new_window', 'copy_to_clipboard', 
      'paste_from_clipboard', 'quit', 'toggle_fullscreen'
    ];
    
    const advancedActions = [
      'reload_config', 'open_config', 'equalize_splits', 'toggle_split_zoom'
    ];

    if (beginnerActions.some(a => action.includes(a))) return 'beginner';
    if (advancedActions.some(a => action.includes(a))) return 'advanced';
    return 'intermediate';
  }

  /**
   * Assess usage frequency
   */
  private assessFrequency(action: string): 'high' | 'medium' | 'low' {
    const highFreq = [
      'new_tab', 'close_surface', 'copy_to_clipboard', 'paste_from_clipboard',
      'next_tab', 'previous_tab', 'new_split'
    ];
    
    const lowFreq = [
      'quit', 'reload_config', 'open_config', 'reset_font_size', 'toggle_fullscreen'
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