/**
 * tmux Keybinding Extractor
 * Separates default tmux keybindings from user customizations
 */

import { $ } from 'bun';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Keybind, ExtractorResult, Priority, Source } from '../types/index.js';

export interface TmuxExtractionOptions {
  configFile?: string;
  tables?: string[];
  isolatedDefaults?: boolean;
  includeUnbound?: boolean;
}

export class TmuxExtractor {
  private readonly DEFAULT_TABLES = [
    'root',           // Global tmux keys
    'prefix',         // Keys after prefix
    'copy-mode',      // Copy mode keys
    'copy-mode-vi',   // Vi-style copy mode
  ];

  private readonly defaultOptions: TmuxExtractionOptions = {
    configFile: join(homedir(), '.tmux.conf'),
    tables: this.DEFAULT_TABLES,
    isolatedDefaults: true,
    includeUnbound: false,
  };

  /**
   * Extract tmux keybindings with separation of defaults and user customizations
   */
  async extract(options: TmuxExtractionOptions = {}): Promise<ExtractorResult> {
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    const keybinds: Keybind[] = [];

    try {
      // Get tmux version
      const version = await this.getTmuxVersion();
      
      // Extract default keybindings (isolated environment)
      let defaultKeybinds: Keybind[] = [];
      if (opts.isolatedDefaults) {
        try {
          defaultKeybinds = await this.extractDefaults(opts.tables!);
        } catch (error) {
          errors.push(`Failed to extract defaults: ${error}`);
        }
      }

      // Extract current user keybindings
      let userKeybinds: Keybind[] = [];
      try {
        userKeybinds = await this.extractUserKeybinds(opts.tables!);
      } catch (error) {
        errors.push(`Failed to extract user keybinds: ${error}`);
      }

      // Parse config file for additional context
      let configKeybinds: Keybind[] = [];
      if (opts.configFile && existsSync(opts.configFile)) {
        try {
          configKeybinds = await this.parseConfigFile(opts.configFile);
        } catch (error) {
          warnings.push(`Failed to parse config file: ${error}`);
        }
      }

      // Merge and categorize keybindings
      const mergedKeybinds = this.mergeKeybinds(defaultKeybinds, userKeybinds, configKeybinds);
      keybinds.push(...mergedKeybinds);

      return {
        tool: 'tmux',
        version,
        keybinds,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Extraction failed: ${error}`);
      return {
        tool: 'tmux',
        keybinds: [],
        errors,
        warnings,
      };
    }
  }

  /**
   * Get tmux version
   */
  private async getTmuxVersion(): Promise<string> {
    try {
      const result = await $`tmux -V`.quiet();
      return result.stdout.toString().trim().replace('tmux ', '');
    } catch {
      throw new Error('tmux not found or not accessible');
    }
  }

  /**
   * Extract default tmux keybindings using isolated environment
   */
  private async extractDefaults(tables: string[]): Promise<Keybind[]> {
    const keybinds: Keybind[] = [];
    const sessionName = `__kb_defaults_${Date.now()}`;

    try {
      for (const table of tables) {
        try {
          // Start isolated tmux session with no config
          const result = await $`tmux -L ${sessionName} -f /dev/null start-server \\; list-keys -T ${table} \\; kill-server`.quiet();
          const output = result.stdout.toString();
          
          const tableKeybinds = this.parseListKeysOutput(output, table, 'default');
          keybinds.push(...tableKeybinds);
        } catch (error) {
          // Some tables might not exist in all tmux versions
          console.warn(`Warning: Could not extract table '${table}': ${error}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to extract defaults: ${error}`);
    }

    return keybinds;
  }

  /**
   * Extract current user tmux keybindings
   */
  private async extractUserKeybinds(tables: string[]): Promise<Keybind[]> {
    const keybinds: Keybind[] = [];

    // Check if tmux is running
    try {
      await $`tmux list-sessions`.quiet();
    } catch {
      // Start a temporary session if none exists
      try {
        await $`tmux new-session -d -s __temp_extract`.quiet();
      } catch (error) {
        throw new Error(`Cannot start tmux session: ${error}`);
      }
    }

    try {
      for (const table of tables) {
        try {
          const result = await $`tmux list-keys -T ${table}`.quiet();
          const output = result.stdout.toString();
          
          const tableKeybinds = this.parseListKeysOutput(output, table, 'user');
          keybinds.push(...tableKeybinds);
        } catch (error) {
          console.warn(`Warning: Could not extract user table '${table}': ${error}`);
        }
      }
    } finally {
      // Clean up temporary session
      try {
        await $`tmux kill-session -t __temp_extract`.quiet();
      } catch {
        // Ignore cleanup errors
      }
    }

    return keybinds;
  }

  /**
   * Parse tmux list-keys output
   */
  private parseListKeysOutput(output: string, table: string, source: Source): Keybind[] {
    const keybinds: Keybind[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const keybind = this.parseKeyLine(line, table, source);
        if (keybind) {
          keybinds.push(keybind);
        }
      } catch (error) {
        console.warn(`Warning: Could not parse line '${line}': ${error}`);
      }
    }

    return keybinds;
  }

  /**
   * Parse a single key line from tmux list-keys
   */
  private parseKeyLine(line: string, table: string, source: Source): Keybind | null {
    // tmux list-keys format: bind-key [-cnr] [-T key-table] key command [arguments]
    const bindMatch = line.match(/^bind-key\s+(?:\[([^\]]*)\]\s+)?(?:-T\s+(\S+)\s+)?(\S+)\s+(.+)$/);
    
    if (!bindMatch) {
      return null;
    }

    const [, flags, keyTable, key, command] = bindMatch;
    const actualTable = keyTable || table;

    // Parse command and arguments
    const commandParts = command.split(/\s+/);
    const mainCommand = commandParts[0];
    const args = commandParts.slice(1).join(' ');

    // Generate unique ID
    const id = `tmux-${actualTable}-${key}-${source}`;

    // Determine category based on command
    const category = this.categorizeCommand(mainCommand);

    // Create keybind object
    const keybind: Keybind = {
      id,
      tool: 'tmux',
      key: this.formatTmuxKey(key, actualTable),
      modifiers: this.extractModifiers(key),
      keySequence: actualTable === 'prefix' ? ['C-b', key] : undefined,
      action: this.humanizeCommand(mainCommand, args),
      category,
      context: `tmux-${actualTable}`,
      tags: this.generateTags(mainCommand, actualTable),
      difficulty: this.assessDifficulty(actualTable, mainCommand),
      frequency: this.assessFrequency(mainCommand, actualTable),
      alternatives: [],
      source,
      priority: source === 'default' ? Priority.TOOL_DEFAULT : Priority.USER_OVERRIDE,
    };

    return keybind;
  }

  /**
   * Parse tmux config file for additional keybindings
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

        // Look for bind-key commands
        const bindMatch = line.match(/^bind(?:-key)?\s+(?:\[([^\]]*)\]\s+)?(?:-T\s+(\S+)\s+)?(\S+)\s+(.+)$/);
        if (bindMatch) {
          const keybind = this.parseConfigBind(bindMatch, configFile, lineNumber);
          if (keybind) {
            keybinds.push(keybind);
          }
        }

        // Look for unbind-key commands
        const unbindMatch = line.match(/^unbind(?:-key)?\s+(?:-T\s+(\S+)\s+)?(\S+)$/);
        if (unbindMatch) {
          // Mark as disabled/unbound
          const [, table, key] = unbindMatch;
          const id = `tmux-${table || 'prefix'}-${key}-unbound`;
          
          keybinds.push({
            id,
            tool: 'tmux',
            key: this.formatTmuxKey(key, table || 'prefix'),
            modifiers: this.extractModifiers(key),
            action: 'Unbound',
            category: 'Unbound',
            context: `tmux-${table || 'prefix'}`,
            tags: ['unbound', 'disabled'],
            difficulty: 'beginner',
            frequency: 'low',
            alternatives: [],
            source: 'user',
            sourceFile: configFile,
            sourceLine: lineNumber,
            priority: Priority.USER_OVERRIDE,
            disabled: true,
          });
        }
      }
    } catch (error) {
      throw new Error(`Failed to read config file: ${error}`);
    }

    return keybinds;
  }

  /**
   * Parse bind command from config file
   */
  private parseConfigBind(match: RegExpMatchArray, configFile: string, lineNumber: number): Keybind | null {
    const [, flags, table, key, command] = match;
    const actualTable = table || 'prefix';

    const commandParts = command.split(/\s+/);
    const mainCommand = commandParts[0];
    const args = commandParts.slice(1).join(' ');

    const id = `tmux-${actualTable}-${key}-config`;
    const category = this.categorizeCommand(mainCommand);

    return {
      id,
      tool: 'tmux',
      key: this.formatTmuxKey(key, actualTable),
      modifiers: this.extractModifiers(key),
      keySequence: actualTable === 'prefix' ? ['C-b', key] : undefined,
      action: this.humanizeCommand(mainCommand, args),
      category,
      context: `tmux-${actualTable}`,
      tags: this.generateTags(mainCommand, actualTable),
      difficulty: this.assessDifficulty(actualTable, mainCommand),
      frequency: this.assessFrequency(mainCommand, actualTable),
      alternatives: [],
      source: 'user',
      sourceFile: configFile,
      sourceLine: lineNumber,
      priority: Priority.USER_OVERRIDE,
    };
  }

  /**
   * Format tmux key for display
   */
  private formatTmuxKey(key: string, table: string): string {
    if (table === 'prefix') {
      return `C-b ${key}`;
    }
    return key;
  }

  /**
   * Extract modifiers from tmux key
   */
  private extractModifiers(key: string): string[] {
    const modifiers: string[] = [];
    
    if (key.startsWith('C-')) {
      modifiers.push('ctrl');
    }
    if (key.startsWith('M-')) {
      modifiers.push('option');
    }
    if (key.startsWith('S-')) {
      modifiers.push('shift');
    }

    return modifiers;
  }

  /**
   * Categorize tmux command
   */
  private categorizeCommand(command: string): string {
    const categoryMap = new Map([
      // Sessions
      ['new-session', 'Sessions'],
      ['kill-session', 'Sessions'],
      ['detach-client', 'Sessions'],
      ['attach-session', 'Sessions'],
      
      // Windows
      ['new-window', 'Windows'],
      ['kill-window', 'Windows'],
      ['next-window', 'Windows'],
      ['previous-window', 'Windows'],
      ['select-window', 'Windows'],
      ['rename-window', 'Windows'],
      
      // Panes
      ['split-window', 'Panes'],
      ['kill-pane', 'Panes'],
      ['select-pane', 'Panes'],
      ['resize-pane', 'Panes'],
      ['swap-pane', 'Panes'],
      
      // Copy mode
      ['copy-mode', 'Copy & Paste'],
      ['paste-buffer', 'Copy & Paste'],
      ['choose-buffer', 'Copy & Paste'],
      
      // Other
      ['command-prompt', 'Command'],
      ['refresh-client', 'Display'],
      ['source-file', 'Configuration'],
    ]);

    return categoryMap.get(command) || 'Other';
  }

  /**
   * Convert tmux command to human-readable action
   */
  private humanizeCommand(command: string, args: string): string {
    const commandMap = new Map([
      ['new-session', 'Create new session'],
      ['kill-session', 'Kill session'],
      ['detach-client', 'Detach from session'],
      ['new-window', 'Create new window'],
      ['kill-window', 'Kill window'],
      ['next-window', 'Switch to next window'],
      ['previous-window', 'Switch to previous window'],
      ['select-window', 'Select window'],
      ['rename-window', 'Rename window'],
      ['split-window', args.includes('-h') ? 'Split pane horizontally' : 'Split pane vertically'],
      ['kill-pane', 'Kill pane'],
      ['select-pane', 'Select pane'],
      ['resize-pane', 'Resize pane'],
      ['copy-mode', 'Enter copy mode'],
      ['paste-buffer', 'Paste from buffer'],
      ['send-prefix', 'Send prefix key'],
    ]);

    return commandMap.get(command) || `${command} ${args}`.trim();
  }

  /**
   * Generate tags for searchability
   */
  private generateTags(command: string, table: string): string[] {
    const tags = [table];
    
    if (command.includes('window')) tags.push('window');
    if (command.includes('pane')) tags.push('pane');
    if (command.includes('session')) tags.push('session');
    if (command.includes('copy')) tags.push('copy');
    if (['new-window', 'new-session', 'split-window'].includes(command)) tags.push('essential');
    
    return tags;
  }

  /**
   * Assess difficulty level
   */
  private assessDifficulty(table: string, command: string): 'beginner' | 'intermediate' | 'advanced' {
    if (table === 'copy-mode' || table === 'copy-mode-vi') return 'advanced';
    if (['new-window', 'split-window', 'detach-client'].includes(command)) return 'beginner';
    return 'intermediate';
  }

  /**
   * Assess usage frequency
   */
  private assessFrequency(command: string, table: string): 'high' | 'medium' | 'low' {
    const highFreq = ['new-window', 'split-window', 'detach-client', 'next-window', 'previous-window'];
    const lowFreq = ['kill-session', 'source-file', 'command-prompt'];
    
    if (highFreq.includes(command)) return 'high';
    if (lowFreq.includes(command)) return 'low';
    return 'medium';
  }

  /**
   * Merge keybindings from different sources
   */
  private mergeKeybinds(defaults: Keybind[], user: Keybind[], config: Keybind[]): Keybind[] {
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

    // Add config keybindings (might be duplicates, but with source file info)
    for (const keybind of config) {
      const key = `${keybind.context}-${keybind.key}`;
      merged.set(key, keybind);
    }

    return Array.from(merged.values());
  }
}