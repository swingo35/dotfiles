#!/usr/bin/env bun
/**
 * CLI tool for validating keybinding configurations
 */

import { parseArgs } from 'node:util';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CollisionDetector } from '../collision-detector/detector.js';
import { KeybindMerger } from '../merger/merger.js';
import type { Keybind, ValidationResult, CLIOptions } from '../types/index.js';

interface ValidateOptions extends CLIOptions {
  configFiles?: string[];
  rules?: string;
  strict?: boolean;
  exitOnError?: boolean;
  reportFormat?: 'text' | 'json' | 'junit';
}

const DEFAULT_OPTIONS: ValidateOptions = {
  configFiles: [],
  rules: './validation-rules.json',
  strict: false,
  exitOnError: true,
  reportFormat: 'text',
  verbose: false,
};

/**
 * Main validation function
 */
async function validateConfiguration(options: ValidateOptions): Promise<void> {
  const detector = new CollisionDetector();
  const merger = new KeybindMerger();
  const errors: string[] = [];
  const allKeybinds: Keybind[] = [];

  console.log('🔍 Validating keybinding configuration...\n');

  // Load keybindings from all config files
  for (const configFile of options.configFiles!) {
    try {
      if (!existsSync(configFile)) {
        errors.push(`Configuration file not found: ${configFile}`);
        continue;
      }

      console.log(`📁 Loading ${configFile}...`);
      const keybinds = await loadKeybindsFromFile(configFile);
      allKeybinds.push(...keybinds);
      
      if (options.verbose) {
        console.log(`  ✅ Loaded ${keybinds.length} keybindings`);
      }
    } catch (error) {
      const errorMsg = `Failed to load ${configFile}: ${error}`;
      console.log(`  ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  if (errors.length > 0 && options.exitOnError) {
    console.log('\n❌ Configuration loading failed');
    displayErrors(errors, options);
    process.exit(1);
  }

  // Run validation
  console.log(`\n🔎 Analyzing ${allKeybinds.length} keybindings...`);
  const validation = detector.validateConfiguration(allKeybinds);

  // Load and apply custom validation rules
  const customValidation = await applyCustomRules(allKeybinds, options.rules!);
  mergeValidationResults(validation, customValidation);

  // Perform merger analysis
  console.log('🔧 Analyzing merge scenarios...');
  const mergeAnalysis = analyzeMergeScenarios(allKeybinds, merger);

  // Display results
  await displayValidationResults(validation, mergeAnalysis, options);

  // Exit with appropriate code
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  
  if (hasErrors && options.exitOnError) {
    console.log('\n❌ Validation failed with errors');
    process.exit(1);
  } else if (hasWarnings && options.strict) {
    console.log('\n⚠️  Validation failed in strict mode due to warnings');
    process.exit(1);
  } else {
    console.log('\n✅ Validation completed successfully');
    process.exit(0);
  }
}

/**
 * Load keybindings from a configuration file
 */
async function loadKeybindsFromFile(filePath: string): Promise<Keybind[]> {
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  if (data.keybinds && Array.isArray(data.keybinds)) {
    return data.keybinds;
  }

  if (data.tools) {
    // Handle merged configuration format
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
 * Apply custom validation rules
 */
async function applyCustomRules(keybinds: Keybind[], rulesFile: string): Promise<ValidationResult> {
  const validation: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
    suggestions: [],
  };

  if (!existsSync(rulesFile)) {
    return validation;
  }

  try {
    const rulesContent = readFileSync(rulesFile, 'utf-8');
    const rules = JSON.parse(rulesContent);

    // Apply each rule
    for (const rule of rules.rules || []) {
      const ruleResults = await applyRule(keybinds, rule);
      validation.errors.push(...ruleResults.errors);
      validation.warnings.push(...ruleResults.warnings);
      validation.info.push(...ruleResults.info);
    }

    validation.valid = validation.errors.length === 0;
  } catch (error) {
    validation.errors.push({
      id: 'custom-rules-error',
      severity: 'error',
      type: 'VALIDATION_ERROR' as any,
      key: '',
      keybinds: [],
      contexts: [],
      tools: [],
      message: `Failed to apply custom rules: ${error}`,
      suggestions: [],
    });
    validation.valid = false;
  }

  return validation;
}

/**
 * Apply a single validation rule
 */
async function applyRule(keybinds: Keybind[], rule: any): Promise<ValidationResult> {
  const validation: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
    suggestions: [],
  };

  switch (rule.type) {
    case 'required-modifiers':
      validateRequiredModifiers(keybinds, rule, validation);
      break;
    case 'forbidden-keys':
      validateForbiddenKeys(keybinds, rule, validation);
      break;
    case 'context-isolation':
      validateContextIsolation(keybinds, rule, validation);
      break;
    case 'ergonomic-checks':
      validateErgonomics(keybinds, rule, validation);
      break;
    default:
      validation.warnings.push({
        id: `unknown-rule-${rule.type}`,
        severity: 'warning',
        type: 'VALIDATION_ERROR' as any,
        key: '',
        keybinds: [],
        contexts: [],
        tools: [],
        message: `Unknown validation rule type: ${rule.type}`,
        suggestions: [],
      });
  }

  return validation;
}

/**
 * Validate required modifiers rule
 */
function validateRequiredModifiers(keybinds: Keybind[], rule: any, validation: ValidationResult): void {
  const requiredModifiers = rule.modifiers || [];
  const contexts = rule.contexts || ['global'];

  for (const keybind of keybinds) {
    if (!contexts.includes(keybind.context)) continue;

    const hasRequired = requiredModifiers.every((mod: string) => 
      keybind.modifiers.includes(mod)
    );

    if (!hasRequired) {
      validation.errors.push({
        id: `required-modifiers-${keybind.id}`,
        severity: 'error',
        type: 'VALIDATION_ERROR' as any,
        key: keybind.key,
        keybinds: [keybind.id],
        contexts: [keybind.context],
        tools: [keybind.tool],
        message: `Keybinding must include required modifiers: ${requiredModifiers.join(', ')}`,
        suggestions: [`Add ${requiredModifiers.join(' + ')} to the key combination`],
      });
    }
  }
}

/**
 * Validate forbidden keys rule
 */
function validateForbiddenKeys(keybinds: Keybind[], rule: any, validation: ValidationResult): void {
  const forbiddenKeys = rule.keys || [];
  const severity = rule.severity || 'error';

  for (const keybind of keybinds) {
    const baseKey = keybind.key.split('+').pop()?.toLowerCase();
    
    if (forbiddenKeys.includes(baseKey)) {
      const conflict = {
        id: `forbidden-key-${keybind.id}`,
        severity: severity as any,
        type: 'VALIDATION_ERROR' as any,
        key: keybind.key,
        keybinds: [keybind.id],
        contexts: [keybind.context],
        tools: [keybind.tool],
        message: `Key "${baseKey}" is forbidden in this context`,
        suggestions: ['Use a different base key', 'Add more specific modifiers'],
      };

      if (severity === 'error') {
        validation.errors.push(conflict);
      } else {
        validation.warnings.push(conflict);
      }
    }
  }
}

/**
 * Validate context isolation rule
 */
function validateContextIsolation(keybinds: Keybind[], rule: any, validation: ValidationResult): void {
  const isolatedContexts = rule.contexts || [];
  
  for (const context of isolatedContexts) {
    const contextKeybinds = keybinds.filter(kb => kb.context === context);
    const externalConflicts = keybinds.filter(kb => 
      kb.context !== context && 
      contextKeybinds.some(ckb => ckb.key === kb.key)
    );

    for (const conflict of externalConflicts) {
      validation.warnings.push({
        id: `context-isolation-${conflict.id}`,
        severity: 'warning',
        type: 'VALIDATION_ERROR' as any,
        key: conflict.key,
        keybinds: [conflict.id],
        contexts: [conflict.context],
        tools: [conflict.tool],
        message: `Key conflicts with isolated context "${context}"`,
        suggestions: ['Use different key for this context', 'Remove context isolation rule'],
      });
    }
  }
}

/**
 * Validate ergonomics rule
 */
function validateErgonomics(keybinds: Keybind[], rule: any, validation: ValidationResult): void {
  const maxModifiers = rule.maxModifiers || 3;
  const difficultKeys = rule.difficultKeys || ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];

  for (const keybind of keybinds) {
    // Check modifier count
    if (keybind.modifiers.length > maxModifiers) {
      validation.warnings.push({
        id: `too-many-modifiers-${keybind.id}`,
        severity: 'warning',
        type: 'VALIDATION_ERROR' as any,
        key: keybind.key,
        keybinds: [keybind.id],
        contexts: [keybind.context],
        tools: [keybind.tool],
        message: `Too many modifier keys (${keybind.modifiers.length} > ${maxModifiers})`,
        suggestions: ['Use fewer modifiers', 'Use sequential key combination'],
      });
    }

    // Check difficult keys
    const baseKey = keybind.key.split('+').pop()?.toLowerCase();
    if (difficultKeys.some(dk => dk.toLowerCase() === baseKey)) {
      validation.info.push({
        id: `difficult-key-${keybind.id}`,
        severity: 'info',
        type: 'VALIDATION_ERROR' as any,
        key: keybind.key,
        keybinds: [keybind.id],
        contexts: [keybind.context],
        tools: [keybind.tool],
        message: `Uses difficult-to-reach key: ${baseKey}`,
        suggestions: ['Consider using home row keys', 'Use more accessible key combination'],
      });
    }
  }
}

/**
 * Merge custom validation results with main validation
 */
function mergeValidationResults(main: ValidationResult, custom: ValidationResult): void {
  main.errors.push(...custom.errors);
  main.warnings.push(...custom.warnings);
  main.info.push(...custom.info);
  main.suggestions.push(...custom.suggestions);
  main.valid = main.valid && custom.valid;
}

/**
 * Analyze merge scenarios to identify potential issues
 */
function analyzeMergeScenarios(keybinds: Keybind[], merger: KeybindMerger): any {
  // Group keybindings by tool
  const toolGroups = new Map<string, Keybind[]>();
  for (const keybind of keybinds) {
    if (!toolGroups.has(keybind.tool)) {
      toolGroups.set(keybind.tool, []);
    }
    toolGroups.get(keybind.tool)!.push(keybind);
  }

  // Create tool layers
  const toolLayers: Record<string, any> = {};
  for (const [tool, toolKeybinds] of toolGroups) {
    const defaults = toolKeybinds.filter(kb => kb.source === 'default');
    const user = toolKeybinds.filter(kb => kb.source === 'user');
    const generated = toolKeybinds.filter(kb => kb.source === 'generated');

    toolLayers[tool] = { defaults, user, generated };
  }

  // Perform merge analysis
  const mergeResult = merger.merge(toolLayers, {
    resolveConflicts: false, // Don't resolve, just analyze
    generateSuggestions: true,
  });

  return {
    totalConflicts: Object.keys(mergeResult.collisions.global).length + 
                   Object.keys(mergeResult.collisions.contextual).length,
    hardCollisions: mergeResult.collisions.global.filter((c: any) => c.severity === 'error').length,
    crossToolConflicts: mergeResult.collisions.global.filter((c: any) => c.tools.length > 1).length,
    toolSuggestions: Object.entries(mergeResult.tools).reduce((acc, [tool, config]) => {
      acc[tool] = (config as any).suggestions.length;
      return acc;
    }, {} as Record<string, number>),
  };
}

/**
 * Display validation results
 */
async function displayValidationResults(
  validation: ValidationResult, 
  mergeAnalysis: any, 
  options: ValidateOptions
): Promise<void> {
  if (options.reportFormat === 'json') {
    console.log(JSON.stringify({
      validation,
      mergeAnalysis,
      timestamp: new Date().toISOString(),
    }, null, 2));
    return;
  }

  if (options.reportFormat === 'junit') {
    await generateJUnitReport(validation, options);
    return;
  }

  // Text format
  console.log('\n📊 Validation Results:');
  console.log(`  Valid: ${validation.valid ? '✅' : '❌'}`);
  console.log(`  Errors: ${validation.errors.length}`);
  console.log(`  Warnings: ${validation.warnings.length}`);
  console.log(`  Info: ${validation.info.length}`);

  console.log('\n🔀 Merge Analysis:');
  console.log(`  Total Conflicts: ${mergeAnalysis.totalConflicts}`);
  console.log(`  Hard Collisions: ${mergeAnalysis.hardCollisions}`);
  console.log(`  Cross-Tool Conflicts: ${mergeAnalysis.crossToolConflicts}`);

  // Display errors
  if (validation.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const error of validation.errors) {
      console.log(`  • ${error.message}`);
      if (options.verbose && error.suggestions.length > 0) {
        console.log(`    Suggestions: ${error.suggestions.join(', ')}`);
      }
    }
  }

  // Display warnings
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    for (const warning of validation.warnings) {
      console.log(`  • ${warning.message}`);
      if (options.verbose && warning.suggestions.length > 0) {
        console.log(`    Suggestions: ${warning.suggestions.join(', ')}`);
      }
    }
  }

  // Display suggestions
  if (validation.suggestions.length > 0) {
    console.log('\n💡 Suggestions:');
    for (const suggestion of validation.suggestions) {
      console.log(`  • ${suggestion.action}: ${suggestion.reason}`);
    }
  }
}

/**
 * Generate JUnit XML report
 */
async function generateJUnitReport(validation: ValidationResult, options: ValidateOptions): Promise<void> {
  const totalTests = validation.errors.length + validation.warnings.length + validation.info.length;
  const failures = validation.errors.length;
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuite name="keybinding-validation" tests="${totalTests}" failures="${failures}" errors="0">\n`;

  // Add error tests
  for (const error of validation.errors) {
    xml += `  <testcase name="${error.id}" classname="validation.errors">\n`;
    xml += `    <failure message="${error.message}"/>\n`;
    xml += `  </testcase>\n`;
  }

  // Add warning tests
  for (const warning of validation.warnings) {
    xml += `  <testcase name="${warning.id}" classname="validation.warnings"/>\n`;
  }

  // Add info tests
  for (const info of validation.info) {
    xml += `  <testcase name="${info.id}" classname="validation.info"/>\n`;
  }

  xml += `</testsuite>\n`;

  console.log(xml);
}

/**
 * Display error messages
 */
function displayErrors(errors: string[], options: ValidateOptions): void {
  if (options.reportFormat === 'json') {
    console.log(JSON.stringify({ errors }, null, 2));
    return;
  }

  console.log('\nErrors:');
  for (const error of errors) {
    console.log(`  • ${error}`);
  }
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
🔧 Keybinding Configuration Validator

Validate keybinding configurations for conflicts and compliance

USAGE:
  bun run validate-config.ts [OPTIONS] <config-files...>

OPTIONS:
  -r, --rules <file>        Custom validation rules file (default: ./validation-rules.json)
  -s, --strict             Treat warnings as errors
  -f, --format <format>    Report format: text, json, junit (default: text)
  --no-exit-on-error       Don't exit with error code on validation failure
  -v, --verbose            Verbose output
  -h, --help               Show this help

EXAMPLES:
  # Validate single config file
  bun run validate-config.ts ./keybind-config.json

  # Validate multiple files with custom rules
  bun run validate-config.ts -r ./my-rules.json ./config1.json ./config2.json

  # Generate JSON report
  bun run validate-config.ts -f json ./config.json > report.json

  # Strict validation (warnings as errors)
  bun run validate-config.ts --strict ./config.json
`);
}

/**
 * Parse command line arguments
 */
function parseArguments(): ValidateOptions {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      rules: { type: 'string', short: 'r' },
      strict: { type: 'boolean', short: 's' },
      format: { type: 'string', short: 'f' },
      'no-exit-on-error': { type: 'boolean' },
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

  const options: ValidateOptions = { ...DEFAULT_OPTIONS };

  options.configFiles = positionals;
  if (values.rules) options.rules = values.rules;
  if (values.strict) options.strict = true;
  if (values.format) options.reportFormat = values.format as any;
  if (values['no-exit-on-error']) options.exitOnError = false;
  if (values.verbose) options.verbose = true;

  // Validate format
  if (!['text', 'json', 'junit'].includes(options.reportFormat!)) {
    console.error(`❌ Invalid format: ${options.reportFormat}. Must be 'text', 'json', or 'junit'`);
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
    await validateConfiguration(options);
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}