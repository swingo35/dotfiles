#!/usr/bin/env bun
/**
 * Complete Keybinding Workflow CLI
 * Orchestrates the entire keybinding extraction, validation, merging, and export process
 */

import { parseArgs } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { TmuxExtractor } from '../extractors/tmux-extractor.js';
import { GhosttyExtractor } from '../extractors/ghostty-extractor.js';
import { AeroSpaceExtractor } from '../extractors/aerospace-extractor.js';
import { CollisionDetector } from '../collision-detector/detector.js';
import { KeybindMerger } from '../merger/merger.js';
import { PWAExporter } from '../export/pwa-exporter.js';
import type { Keybind, KeybindingLayer, CLIOptions } from '../types/index.js';

interface WorkflowOptions extends CLIOptions {
  tools?: string[];
  outputDir?: string;
  includeDefaults?: boolean;
  resolveConflicts?: boolean;
  generateSuggestions?: boolean;
  exportToPWA?: boolean;
  validationRules?: string;
  skipValidation?: boolean;
  dryRun?: boolean;
}

const DEFAULT_OPTIONS: WorkflowOptions = {
  tools: ['tmux', 'ghostty', 'aerospace'],
  outputDir: './keybind-output',
  includeDefaults: true,
  resolveConflicts: true,
  generateSuggestions: true,
  exportToPWA: true,
  validationRules: './data/validation-rules.json',
  skipValidation: false,
  dryRun: false,
  verbose: false,
};

/**
 * Main workflow orchestration
 */
async function runWorkflow(options: WorkflowOptions): Promise<void> {
  const startTime = Date.now();
  
  console.log('🚀 Starting keybinding workflow...\n');
  
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be written\n');
  }

  // Step 1: Extract keybindings from all tools
  console.log('📦 Step 1: Extracting keybindings...');
  const toolLayers = await extractFromAllTools(options);
  
  const totalKeybinds = Object.values(toolLayers).reduce((sum, layer) => {
    return sum + (layer.defaults?.length || 0) + (layer.user?.length || 0) + (layer.generated?.length || 0);
  }, 0);
  console.log(`✅ Extracted ${totalKeybinds} keybindings from ${Object.keys(toolLayers).length} tools\n`);

  // Step 2: Validate individual tool configurations
  if (!options.skipValidation) {
    console.log('🔍 Step 2: Validating configurations...');
    const validationResults = await validateConfigurations(toolLayers, options);
    displayValidationSummary(validationResults);
  } else {
    console.log('⏭️  Step 2: Skipping validation (--skip-validation)\n');
  }

  // Step 3: Merge configurations with conflict resolution
  console.log('🔧 Step 3: Merging configurations...');
  const mergedConfig = await mergeConfigurations(toolLayers, options);
  console.log(`✅ Merged configuration with ${Object.keys(mergedConfig.collisions.global).length + Object.keys(mergedConfig.collisions.contextual).length} conflicts detected\n`);

  // Step 4: Generate final validation report
  console.log('📊 Step 4: Final validation...');
  const finalValidation = await performFinalValidation(mergedConfig, options);
  
  if (!finalValidation.valid && !options.dryRun) {
    console.log('❌ Final validation failed. Consider using --resolve-conflicts or fixing issues manually.');
    if (!options.verbose) {
      console.log('💡 Use --verbose for detailed error information.');
    }
  }

  // Step 5: Export results
  console.log('📤 Step 5: Exporting results...');
  await exportResults(mergedConfig, finalValidation, options);

  // Summary
  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n🎉 Workflow completed in ${duration.toFixed(2)}s`);
  
  if (!options.dryRun) {
    console.log(`📁 Output written to: ${options.outputDir}`);
  }
  
  // Display final statistics
  displayFinalStatistics(mergedConfig, finalValidation);
}

/**
 * Extract keybindings from all configured tools
 */
async function extractFromAllTools(options: WorkflowOptions): Promise<Record<string, KeybindingLayer>> {
  const toolLayers: Record<string, KeybindingLayer> = {};

  for (const tool of options.tools!) {
    if (options.verbose) {
      console.log(`  📦 Extracting from ${tool}...`);
    }

    try {
      let result;
      
      switch (tool) {
        case 'tmux':
          const tmuxExtractor = new TmuxExtractor();
          result = await tmuxExtractor.extract({
            isolatedDefaults: options.includeDefaults,
          });
          break;
          
        case 'ghostty':
          const ghosttyExtractor = new GhosttyExtractor();
          result = await ghosttyExtractor.extract({
            includePlatformDefaults: options.includeDefaults,
          });
          break;
          
        case 'aerospace':
          const aerospaceExtractor = new AeroSpaceExtractor();
          result = await aerospaceExtractor.extract({
            includePlatformDefaults: options.includeDefaults,
          });
          break;
          
        default:
          console.log(`  ⚠️  Unknown tool: ${tool}, skipping`);
          continue;
      }

      // Categorize keybindings by source
      const defaults = result.keybinds.filter(kb => kb.source === 'default');
      const user = result.keybinds.filter(kb => kb.source === 'user');
      const generated = result.keybinds.filter(kb => kb.source === 'generated');

      toolLayers[tool] = { defaults, user, generated };

      if (options.verbose) {
        console.log(`    ✅ ${result.keybinds.length} keybindings (${defaults.length} defaults, ${user.length} user, ${generated.length} generated)`);
        if (result.warnings.length > 0) {
          console.log(`    ⚠️  ${result.warnings.length} warning(s)`);
        }
        if (result.errors.length > 0) {
          console.log(`    ❌ ${result.errors.length} error(s)`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Failed to extract from ${tool}: ${error}`);
      if (options.verbose) {
        console.error(error);
      }
    }
  }

  return toolLayers;
}

/**
 * Validate individual tool configurations
 */
async function validateConfigurations(
  toolLayers: Record<string, KeybindingLayer>,
  options: WorkflowOptions
): Promise<Record<string, any>> {
  const detector = new CollisionDetector();
  const validationResults: Record<string, any> = {};

  for (const [tool, layers] of Object.entries(toolLayers)) {
    const allKeybinds = [...(layers.defaults || []), ...(layers.user || []), ...(layers.generated || [])];
    const validation = detector.validateConfiguration(allKeybinds);
    
    validationResults[tool] = validation;

    if (options.verbose) {
      console.log(`  🔍 ${tool}: ${validation.valid ? '✅' : '❌'} (${validation.errors.length} errors, ${validation.warnings.length} warnings)`);
    }
  }

  return validationResults;
}

/**
 * Display validation summary
 */
function displayValidationSummary(validationResults: Record<string, any>): void {
  const totalErrors = Object.values(validationResults).reduce((sum: number, v: any) => sum + v.errors.length, 0);
  const totalWarnings = Object.values(validationResults).reduce((sum: number, v: any) => sum + v.warnings.length, 0);
  const validTools = Object.values(validationResults).filter((v: any) => v.valid).length;
  const totalTools = Object.keys(validationResults).length;

  console.log(`✅ Validation complete: ${validTools}/${totalTools} tools valid`);
  if (totalErrors > 0) {
    console.log(`❌ ${totalErrors} error(s) found`);
  }
  if (totalWarnings > 0) {
    console.log(`⚠️  ${totalWarnings} warning(s) found`);
  }
  console.log();
}

/**
 * Merge configurations with conflict resolution
 */
async function mergeConfigurations(
  toolLayers: Record<string, KeybindingLayer>,
  options: WorkflowOptions
): Promise<any> {
  const merger = new KeybindMerger();

  const mergeOptions = {
    resolveConflicts: options.resolveConflicts!,
    generateSuggestions: options.generateSuggestions!,
    prioritizeUserConfig: true,
    allowSystemOverrides: false,
    preserveDisabled: true,
  };

  if (options.verbose) {
    console.log(`  🔧 Merge options:`, mergeOptions);
  }

  return merger.merge(toolLayers, mergeOptions);
}

/**
 * Perform final validation on merged configuration
 */
async function performFinalValidation(mergedConfig: any, options: WorkflowOptions): Promise<any> {
  const detector = new CollisionDetector();
  
  // Collect all keybindings from merged config
  const allKeybinds: Keybind[] = [];
  for (const [tool, toolConfig] of Object.entries(mergedConfig.tools)) {
    const config = toolConfig as any;
    allKeybinds.push(...config.defaults);
    allKeybinds.push(...config.user);
    allKeybinds.push(...config.generated);
  }

  const validation = detector.validateConfiguration(allKeybinds);

  if (options.verbose) {
    console.log(`  📊 Final validation: ${validation.valid ? '✅' : '❌'}`);
    console.log(`      Errors: ${validation.errors.length}`);
    console.log(`      Warnings: ${validation.warnings.length}`);
    console.log(`      Info: ${validation.info.length}`);
  } else {
    const status = validation.valid ? '✅ Valid' : '❌ Issues found';
    console.log(`✅ ${status} (${validation.errors.length} errors, ${validation.warnings.length} warnings)\n`);
  }

  return validation;
}

/**
 * Export all results
 */
async function exportResults(
  mergedConfig: any,
  validation: any,
  options: WorkflowOptions
): Promise<void> {
  if (options.dryRun) {
    console.log('📁 Would export to:', options.outputDir);
    return;
  }

  // Create output directory
  mkdirSync(options.outputDir!, { recursive: true });

  // Export merged configuration
  const { writeFileSync } = await import('node:fs');
  writeFileSync(
    join(options.outputDir!, 'merged-config.json'),
    JSON.stringify(mergedConfig, null, 2)
  );

  // Export validation report
  writeFileSync(
    join(options.outputDir!, 'validation-report.json'),
    JSON.stringify(validation, null, 2)
  );

  // Export to PWA format if requested
  if (options.exportToPWA) {
    const exporter = new PWAExporter();
    const pwaOutputDir = join(options.outputDir!, 'pwa');
    
    await exporter.exportToPWA(mergedConfig, validation, {
      outputDir: pwaOutputDir,
      includeDefaults: options.includeDefaults!,
      generateLearningPaths: true,
      includeCategories: true,
      includeRelationships: true,
      minifyOutput: false,
    });

    console.log(`  📱 PWA export: ${pwaOutputDir}/`);
  }

  // Export summary statistics
  const stats = generateStatistics(mergedConfig, validation);
  writeFileSync(
    join(options.outputDir!, 'statistics.json'),
    JSON.stringify(stats, null, 2)
  );

  console.log(`  📊 Merged config: merged-config.json`);
  console.log(`  📋 Validation: validation-report.json`);
  console.log(`  📈 Statistics: statistics.json`);
}

/**
 * Generate comprehensive statistics
 */
function generateStatistics(mergedConfig: any, validation: any): any {
  const stats = {
    generated: new Date().toISOString(),
    tools: Object.keys(mergedConfig.tools),
    totalKeybinds: 0,
    byTool: {} as Record<string, any>,
    bySource: { default: 0, user: 0, generated: 0 },
    conflicts: {
      global: mergedConfig.collisions.global.length,
      contextual: mergedConfig.collisions.contextual.length,
      resolved: mergedConfig.collisions.resolved.length,
    },
    validation: {
      valid: validation.valid,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
      info: validation.info.length,
    },
    suggestions: validation.suggestions.length,
  };

  // Calculate detailed statistics
  for (const [tool, toolConfig] of Object.entries(mergedConfig.tools)) {
    const config = toolConfig as any;
    const toolTotal = config.defaults.length + config.user.length + config.generated.length;
    
    stats.byTool[tool] = {
      total: toolTotal,
      defaults: config.defaults.length,
      user: config.user.length,
      generated: config.generated.length,
      conflicts: config.conflicts.length,
      suggestions: config.suggestions.length,
    };

    stats.totalKeybinds += toolTotal;
    stats.bySource.default += config.defaults.length;
    stats.bySource.user += config.user.length;
    stats.bySource.generated += config.generated.length;
  }

  return stats;
}

/**
 * Display final statistics
 */
function displayFinalStatistics(mergedConfig: any, validation: any): void {
  const stats = generateStatistics(mergedConfig, validation);

  console.log('\n📈 Final Statistics:');
  console.log(`   Total Keybindings: ${stats.totalKeybinds}`);
  console.log(`   Tools: ${stats.tools.join(', ')}`);
  console.log(`   Sources: ${stats.bySource.default} defaults, ${stats.bySource.user} user, ${stats.bySource.generated} generated`);
  console.log(`   Conflicts: ${stats.conflicts.global} global, ${stats.conflicts.contextual} contextual, ${stats.conflicts.resolved} resolved`);
  console.log(`   Validation: ${stats.validation.errors} errors, ${stats.validation.warnings} warnings`);
  
  if (stats.suggestions > 0) {
    console.log(`   Suggestions: ${stats.suggestions} optimization opportunities`);
  }
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
🚀 Keybinding Workflow CLI

Complete workflow for keybinding extraction, validation, merging, and export

USAGE:
  bun run keybind-workflow.ts [OPTIONS]

OPTIONS:
  -t, --tools <tools>           Comma-separated tools to process (default: tmux,ghostty,aerospace)
  -o, --output <dir>           Output directory (default: ./keybind-output)
  --no-defaults                Don't include default keybindings
  --no-resolve-conflicts       Don't automatically resolve conflicts
  --no-suggestions             Don't generate optimization suggestions
  --no-pwa-export             Don't export to PWA format
  --validation-rules <file>    Custom validation rules file
  --skip-validation           Skip validation steps
  --dry-run                   Show what would be done without writing files
  -v, --verbose               Verbose output
  -h, --help                  Show this help

WORKFLOW STEPS:
  1. Extract keybindings from all configured tools
  2. Validate individual tool configurations
  3. Merge configurations with conflict resolution
  4. Perform final validation on merged result
  5. Export results in multiple formats

EXAMPLES:
  # Run complete workflow with defaults
  bun run keybind-workflow.ts

  # Process only tmux and ghostty
  bun run keybind-workflow.ts -t tmux,ghostty

  # Dry run to see what would happen
  bun run keybind-workflow.ts --dry-run --verbose

  # Skip validation and export to custom directory
  bun run keybind-workflow.ts --skip-validation -o ./my-output

  # Generate PWA export only
  bun run keybind-workflow.ts --no-resolve-conflicts -o ./pwa-output
`);
}

/**
 * Parse command line arguments
 */
function parseArguments(): WorkflowOptions {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      tools: { type: 'string', short: 't' },
      output: { type: 'string', short: 'o' },
      'no-defaults': { type: 'boolean' },
      'no-resolve-conflicts': { type: 'boolean' },
      'no-suggestions': { type: 'boolean' },
      'no-pwa-export': { type: 'boolean' },
      'validation-rules': { type: 'string' },
      'skip-validation': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      verbose: { type: 'boolean', short: 'v' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const options: WorkflowOptions = { ...DEFAULT_OPTIONS };

  if (values.tools) options.tools = values.tools.split(',').map(t => t.trim());
  if (values.output) options.outputDir = values.output;
  if (values['no-defaults']) options.includeDefaults = false;
  if (values['no-resolve-conflicts']) options.resolveConflicts = false;
  if (values['no-suggestions']) options.generateSuggestions = false;
  if (values['no-pwa-export']) options.exportToPWA = false;
  if (values['validation-rules']) options.validationRules = values['validation-rules'];
  if (values['skip-validation']) options.skipValidation = true;
  if (values['dry-run']) options.dryRun = true;
  if (values.verbose) options.verbose = true;

  // Validate tools
  const validTools = ['tmux', 'ghostty', 'aerospace'];
  for (const tool of options.tools!) {
    if (!validTools.includes(tool)) {
      console.error(`❌ Invalid tool: ${tool}. Valid tools: ${validTools.join(', ')}`);
      process.exit(1);
    }
  }

  return options;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const options = parseArguments();
    await runWorkflow(options);
  } catch (error) {
    console.error(`❌ Workflow failed: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}