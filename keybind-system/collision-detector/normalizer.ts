/**
 * Key Normalizer for Consistent Collision Detection
 * Handles multiple key formats and normalizes them for comparison
 */

import type { NormalizedKey } from '../types/index.js';

/**
 * Normalizes key representations for consistent collision detection
 * Handles various formats like "Cmd+Space", "⌘ Space", "cmd+space", etc.
 */
export class KeyNormalizer {
  private static readonly MODIFIER_ALIASES = new Map([
    // Command/Meta
    ['cmd', 'meta'],
    ['command', 'meta'],
    ['⌘', 'meta'],
    ['meta', 'meta'],
    
    // Control
    ['ctrl', 'ctrl'],
    ['control', 'ctrl'],
    ['⌃', 'ctrl'],
    ['c', 'ctrl'],     // tmux style
    
    // Option/Alt
    ['opt', 'option'],
    ['option', 'option'],
    ['alt', 'option'],
    ['⌥', 'option'],
    ['m', 'option'],   // tmux style
    
    // Shift
    ['shift', 'shift'],
    ['⇧', 'shift'],
    ['s', 'shift'],    // tmux style
  ]);

  private static readonly SPECIAL_KEYS = new Map([
    // Arrow keys
    ['up', 'ArrowUp'],
    ['down', 'ArrowDown'],
    ['left', 'ArrowLeft'],
    ['right', 'ArrowRight'],
    ['↑', 'ArrowUp'],
    ['↓', 'ArrowDown'],
    ['←', 'ArrowLeft'],
    ['→', 'ArrowRight'],
    
    // Function keys
    ['return', 'Enter'],
    ['enter', 'Enter'],
    ['↩', 'Enter'],
    ['ret', 'Enter'],
    
    ['escape', 'Escape'],
    ['esc', 'Escape'],
    
    ['backspace', 'Backspace'],
    ['bspace', 'Backspace'],
    ['⌫', 'Backspace'],
    
    ['delete', 'Delete'],
    ['del', 'Delete'],
    ['⌦', 'Delete'],
    
    ['tab', 'Tab'],
    ['⇥', 'Tab'],
    
    ['space', 'Space'],
    [' ', 'Space'],
    
    ['home', 'Home'],
    ['end', 'End'],
    ['pageup', 'PageUp'],
    ['pagedown', 'PageDown'],
    ['page_up', 'PageUp'],
    ['page_down', 'PageDown'],
    
    // Punctuation
    ['semicolon', ';'],
    ['comma', ','],
    ['period', '.'],
    ['slash', '/'],
    ['backslash', '\\'],
    ['quote', "'"],
    ['doublequote', '"'],
    ['backtick', '`'],
    ['tilde', '~'],
    ['exclamation', '!'],
    ['at', '@'],
    ['hash', '#'],
    ['dollar', '$'],
    ['percent', '%'],
    ['caret', '^'],
    ['ampersand', '&'],
    ['asterisk', '*'],
    ['parenthesis_left', '('],
    ['parenthesis_right', ')'],
    ['bracket_left', '['],
    ['bracket_right', ']'],
    ['brace_left', '{'],
    ['brace_right', '}'],
    ['pipe', '|'],
    ['minus', '-'],
    ['underscore', '_'],
    ['plus', '+'],
    ['equal', '='],
  ]);

  /**
   * Normalize a key string into a consistent format
   */
  static normalize(keyString: string): NormalizedKey {
    // Handle tmux-style sequences (e.g., "C-b c")
    if (this.isTmuxSequence(keyString)) {
      return this.normalizeTmuxSequence(keyString);
    }

    // Handle multi-key sequences (e.g., ["C-b", "c"])
    if (this.isSequence(keyString)) {
      return this.normalizeSequence(keyString);
    }

    // Handle single key combinations
    return this.normalizeSingleKey(keyString);
  }

  /**
   * Check if key string represents a tmux-style sequence
   */
  private static isTmuxSequence(keyString: string): boolean {
    return /^[CMS]-\w+\s+\w+/.test(keyString) || keyString.includes(' ');
  }

  /**
   * Check if key string represents a sequence
   */
  private static isSequence(keyString: string): boolean {
    return keyString.includes(',') || keyString.includes('then') || 
           (keyString.includes(' ') && !keyString.includes('+'));
  }

  /**
   * Normalize tmux-style sequences like "C-b c"
   */
  private static normalizeTmuxSequence(keyString: string): NormalizedKey {
    const parts = keyString.split(/\s+/);
    const sequence = parts.map(part => this.normalizeSingleKey(part).normalized);
    
    return {
      key: '',
      modifiers: new Set(),
      sequence,
      normalized: sequence.join(' → ')
    };
  }

  /**
   * Normalize key sequences
   */
  private static normalizeSequence(keyString: string): NormalizedKey {
    const separators = [',', 'then', ' then ', ' → '];
    let parts = [keyString];
    
    for (const sep of separators) {
      if (keyString.includes(sep)) {
        parts = keyString.split(sep).map(p => p.trim());
        break;
      }
    }

    const sequence = parts.map(part => this.normalizeSingleKey(part).normalized);
    
    return {
      key: '',
      modifiers: new Set(),
      sequence,
      normalized: sequence.join(' → ')
    };
  }

  /**
   * Normalize a single key combination like "Cmd+Shift+A"
   */
  private static normalizeSingleKey(keyString: string): NormalizedKey {
    // Clean and split the key string
    const cleaned = keyString.trim().toLowerCase();
    
    // Handle different separators
    const parts = this.splitKeyString(cleaned);
    
    const modifiers = new Set<string>();
    let baseKey = '';

    for (const part of parts) {
      const normalizedModifier = this.MODIFIER_ALIASES.get(part);
      if (normalizedModifier) {
        modifiers.add(normalizedModifier);
      } else {
        // This is the base key
        baseKey = this.normalizeBaseKey(part);
      }
    }

    // Create normalized string
    const sortedModifiers = Array.from(modifiers).sort();
    const normalized = sortedModifiers.length > 0 
      ? `${sortedModifiers.join('+')}+${baseKey}`
      : baseKey;

    return {
      key: baseKey,
      modifiers,
      normalized
    };
  }

  /**
   * Split key string by various separators
   */
  private static splitKeyString(keyString: string): string[] {
    // Handle different formats:
    // "cmd+shift+a", "cmd + shift + a", "⌘⇧A", "C-M-a", etc.
    
    // First, handle symbolic modifiers (⌘⇧A)
    if (/[⌘⌃⌥⇧]/.test(keyString)) {
      return this.splitSymbolicKey(keyString);
    }
    
    // Handle hyphen-separated (C-M-a, ctrl-shift-a)
    if (keyString.includes('-') && !keyString.includes('+')) {
      return keyString.split('-').map(p => p.trim());
    }
    
    // Handle plus-separated (cmd+shift+a)
    if (keyString.includes('+')) {
      return keyString.split('+').map(p => p.trim());
    }
    
    // Handle space-separated (cmd shift a)
    if (keyString.includes(' ')) {
      return keyString.split(/\s+/);
    }
    
    // Single key
    return [keyString];
  }

  /**
   * Split symbolic key combinations like "⌘⇧A"
   */
  private static splitSymbolicKey(keyString: string): string[] {
    const parts: string[] = [];
    const symbols = ['⌘', '⌃', '⌥', '⇧'];
    
    let remaining = keyString;
    for (const symbol of symbols) {
      if (remaining.includes(symbol)) {
        parts.push(symbol);
        remaining = remaining.replace(symbol, '');
      }
    }
    
    // Add the remaining base key
    if (remaining) {
      parts.push(remaining.trim());
    }
    
    return parts;
  }

  /**
   * Normalize the base key (non-modifier key)
   */
  private static normalizeBaseKey(key: string): string {
    // Check special keys first
    const specialKey = this.SPECIAL_KEYS.get(key.toLowerCase());
    if (specialKey) {
      return specialKey;
    }

    // Handle function keys
    if (/^f\d+$/i.test(key)) {
      return key.toUpperCase();
    }

    // Handle single characters
    if (key.length === 1) {
      return key.toUpperCase();
    }

    // Handle numbers
    if (/^\d+$/.test(key)) {
      return key;
    }

    // Default: capitalize first letter
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  /**
   * Compare two normalized keys for equality
   */
  static areEqual(key1: NormalizedKey, key2: NormalizedKey): boolean {
    return key1.normalized === key2.normalized;
  }

  /**
   * Check if two keys would conflict in the same context
   */
  static wouldConflict(key1: NormalizedKey, key2: NormalizedKey): boolean {
    // Exact match is always a conflict
    if (this.areEqual(key1, key2)) {
      return true;
    }

    // Check for subset conflicts (one key is subset of another)
    if (key1.sequence && key2.sequence) {
      // Sequence conflicts
      const seq1 = key1.sequence;
      const seq2 = key2.sequence;
      
      // If one sequence is a prefix of another, it's a conflict
      const minLength = Math.min(seq1.length, seq2.length);
      for (let i = 0; i < minLength; i++) {
        if (seq1[i] !== seq2[i]) {
          return false;
        }
      }
      return true; // One is prefix of the other
    }

    return false;
  }

  /**
   * Generate a human-readable representation
   */
  static toHumanReadable(normalizedKey: NormalizedKey): string {
    if (normalizedKey.sequence) {
      return normalizedKey.sequence
        .map(seq => this.formatSingleKey(seq))
        .join(' then ');
    }

    return this.formatSingleKey(normalizedKey.normalized);
  }

  /**
   * Format a single key for display
   */
  private static formatSingleKey(normalized: string): string {
    const symbolMap = new Map([
      ['meta', '⌘'],
      ['ctrl', '⌃'],
      ['option', '⌥'],
      ['shift', '⇧'],
    ]);

    return normalized.replace(/(\w+)\+/g, (match, modifier) => {
      const symbol = symbolMap.get(modifier);
      return symbol ? symbol : match;
    });
  }

  /**
   * Check if a key is a system reserved key that should not be overridden
   */
  static isSystemReserved(normalizedKey: NormalizedKey): boolean {
    const reservedKeys = [
      'meta+Space',        // Spotlight
      'meta+Tab',          // App Switcher
      'meta+`',            // Window Switcher
      'meta+Q',            // Quit App
      'meta+shift+3',      // Screenshot
      'meta+shift+4',      // Screenshot selection
      'meta+shift+5',      // Screenshot options
      'ctrl+meta+Q',       // Lock screen
      'meta+option+Escape', // Force quit
    ];

    return reservedKeys.includes(normalizedKey.normalized);
  }

  /**
   * Batch normalize multiple key strings
   */
  static normalizeAll(keyStrings: string[]): NormalizedKey[] {
    return keyStrings.map(key => this.normalize(key));
  }
}