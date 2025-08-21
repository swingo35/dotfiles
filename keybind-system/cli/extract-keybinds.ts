#!/usr/bin/env bun
/**
 * CLI tool for extracting keybindings from all configured tools
 */

import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { TmuxExtractor } from '../extractors/tmux-extractor.js';
import { GhosttyExtractor } from '../extractors/ghostty-extractor.js';
import { AeroSpaceExtractor } from '../extractors/aerospace-extractor.js';
import type { CLIOptions, ExtractorResult } from '../types/index.js';

interface ExtractOptions extends CLIOptions {
  tools?: string[];
  includeDefaults?: boolean;
  separateFiles?: boolean;
}

const DEFAULT_OPTIONS: ExtractOptions = {
  output: './extracted-keybinds',
  format: 'json',
  tools: ['tmux', 'ghostty', 'aerospace'],
  includeDefaults: true,
  separateFiles: true,
  verbose: false,
};

/**
 * Main extraction function
 */
async function extractKeybinds(options: ExtractOptions): Promise<void> {
  const results: Record<string, ExtractorResult> = {};
  const errors: string[] = [];

  console.log('🔍 Extracting keybindings...\n');

  // Extract from each tool
  for (const tool of options.tools!) {
    try {
      console.log(`📦 Extracting ${tool} keybindings...`);
      
      let result: ExtractorResult;
      
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
          throw new Error(`Unknown tool: ${tool}`);
      }

      results[tool] = result;

      // Log results
      console.log(`  ✅ Found ${result.keybinds.length} keybindings`);
      if (result.version) {
        console.log(`  📋 Version: ${result.version}`);
      }
      if (result.warnings.length > 0) {
        console.log(`  ⚠️  ${result.warnings.length} warning(s)`);
        if (options.verbose) {
          result.warnings.forEach(w => console.log(`     ${w}`));
        }
      }
      if (result.errors.length > 0) {
        console.log(`  ❌ ${result.errors.length} error(s)`);
        result.errors.forEach(e => console.log(`     ${e}`));
        errors.push(...result.errors);
      }
      console.log();
      
    } catch (error) {
      const errorMsg = `Failed to extract ${tool}: ${error}`;
      console.log(`  ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  // Write output files
  if (options.output) {
    await writeResults(results, options);
  }

  // Summary
  const totalKeybinds = Object.values(results).reduce((sum, r) => sum + r.keybinds.length, 0);
  const totalErrors = errors.length;
  const totalWarnings = Object.values(results).reduce((sum, r) => sum + r.warnings.length, 0);

  console.log('📊 Extraction Summary:');
  console.log(`  Total keybindings: ${totalKeybinds}`);
  console.log(`  Tools processed: ${Object.keys(results).length}/${options.tools!.length}`);
  console.log(`  Warnings: ${totalWarnings}`);
  console.log(`  Errors: ${totalErrors}`);

  if (totalErrors > 0) {
    console.log('\n❌ Extraction completed with errors');
    process.exit(1);
  } else {
    console.log('\n✅ Extraction completed successfully');
  }
}

/**
 * Write extraction results to files
 */
async function writeResults(results: Record<string, ExtractorResult>, options: ExtractOptions): Promise<void> {
  const outputDir = options.output!;
  
  try {
    mkdirSync(outputDir, { recursive: true });
    
    if (options.separateFiles) {
      // Write separate file for each tool
      for (const [tool, result] of Object.entries(results)) {
        const filename = `${tool}-keybinds.${options.format}`;
        const filepath = join(outputDir, filename);
        
        const data = formatOutput(result, options.format!);
        writeFileSync(filepath, data);
        console.log(`📁 Wrote ${tool} keybindings to ${filepath}`);
      }
    } else {
      // Write combined file
      const filename = `all-keybinds.${options.format}`;
      const filepath = join(outputDir, filename);
      
      const combinedData = {
        tools: results,
        summary: {
          extractedAt: new Date().toISOString(),
          totalKeybinds: Object.values(results).reduce((sum, r) => sum + r.keybinds.length, 0),
          tools: Object.keys(results),
        },
      };
      
      const data = formatOutput(combinedData, options.format!);
      writeFileSync(filepath, data);
      console.log(`📁 Wrote combined keybindings to ${filepath}`);
    }
  } catch (error) {
    throw new Error(`Failed to write output files: ${error}`);
  }
}

/**
 * Format output data based on format option
 */
function formatOutput(data: any, format: string): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'markdown':
      return formatAsMarkdown(data);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Format data as Markdown
 */
function formatAsMarkdown(data: any): string {
  if (data.tools) {
    // Combined format
    let md = '# Extracted Keybindings\n\n';
    md += `Generated: ${data.summary.extractedAt}\n`;
    md += `Total Keybindings: ${data.summary.totalKeybinds}\n\n`;
    
    for (const [tool, result] of Object.entries(data.tools)) {
      md += formatToolAsMarkdown(tool, result as ExtractorResult);
    }
    
    return md;
  } else {
    // Single tool format
    return formatToolAsMarkdown(data.tool, data);
  }
}

/**
 * Format single tool as Markdown
 */
function formatToolAsMarkdown(tool: string, result: ExtractorResult): string {
  let md = `## ${tool.charAt(0).toUpperCase() + tool.slice(1)} Keybindings\n\n`;
  
  if (result.version) {
    md += `**Version:** ${result.version}\n\n`;
  }
  
  // Group by category
  const byCategory = new Map<string, typeof result.keybinds>();
  for (const keybind of result.keybinds) {
    if (!byCategory.has(keybind.category)) {
      byCategory.set(keybind.category, []);
    }
    byCategory.get(keybind.category)!.push(keybind);
  }
  
  for (const [category, keybinds] of byCategory) {
    md += `### ${category}\n\n`;
    md += '| Key | Action | Context | Source |\n';
    md += '|-----|--------|---------|--------|\n';
    
    for (const keybind of keybinds) {
      const key = keybind.key.replace(/\|/g, '\\|');
      const action = keybind.action.replace(/\|/g, '\\|');
      const context = keybind.context.replace(/\|/g, '\\|');
      md += `| ${key} | ${action} | ${context} | ${keybind.source} |\n`;
    }
    
    md += '\n';
  }
  
  return md;
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
🔧 Keybind Extractor

Extract keybindings from configured tools (tmux, Ghostty, AeroSpace, etc.)

USAGE:
  bun run extract-keybinds.ts [OPTIONS]

OPTIONS:
  -o, --output <path>       Output directory (default: ./extracted-keybinds)
  -f, --format <format>     Output format: json, markdown (default: json)
  -t, --tools <tools>       Comma-separated list of tools (default: tmux,ghostty,aerospace)
  --no-defaults            Don't extract default keybindings
  --combined               Write single combined file instead of separate files
  -v, --verbose            Verbose output
  -h, --help               Show this help

EXAMPLES:
  # Extract all tools to JSON
  bun run extract-keybinds.ts

  # Extract only tmux to markdown
  bun run extract-keybinds.ts -t tmux -f markdown

  # Extract to specific directory with verbose output
  bun run extract-keybinds.ts -o ./my-keybinds -v

  # Extract without defaults to combined file
  bun run extract-keybinds.ts --no-defaults --combined
`);
}

/**
 * Parse command line arguments
 */
function parseArguments(): ExtractOptions {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      output: { type: 'string', short: 'o' },
      format: { type: 'string', short: 'f' },
      tools: { type: 'string', short: 't' },
      'no-defaults': { type: 'boolean' },
      combined: { type: 'boolean' },
      verbose: { type: 'boolean', short: 'v' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const options: ExtractOptions = { ...DEFAULT_OPTIONS };

  if (values.output) options.output = values.output;
  if (values.format) options.format = values.format as any;
  if (values.tools) options.tools = values.tools.split(',').map(t => t.trim());
  if (values['no-defaults']) options.includeDefaults = false;
  if (values.combined) options.separateFiles = false;
  if (values.verbose) options.verbose = true;

  // Validate format
  if (!['json', 'markdown'].includes(options.format!)) {
    console.error(`❌ Invalid format: ${options.format}. Must be 'json' or 'markdown'`);
    process.exit(1);
  }

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
    await extractKeybinds(options);
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}