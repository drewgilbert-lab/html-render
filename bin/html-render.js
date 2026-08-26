#!/usr/bin/env node
'use strict';

/**
 * html-render CLI.
 *
 *   html-render <input.md> [more.md ...] [options]
 *
 *       --config <file>    organization and renderer settings (JSON)
 *   -o, --out <file>       write a single input to this file
 *       --out-dir <dir>    write each input to <dir>/<name>.html
 *       --check            validate only; write nothing
 *       --stdout           print the HTML instead of writing a file
 *       --preview          also write <name>.preview.html for browser review
 *       --no-styles        omit the <style> block (CSS loaded site-wide instead)
 *       --no-script        omit the FAQ / side-nav behaviour script
 *       --no-schema        omit the JSON-LD block
 *       --no-font          omit the configured webfont @import
 *       --contract <type>  print the Markdown contract for pillar|cluster|spoke
 *       --components       list every available component
 *       --audit <dir>      classify a Claude Design export against this registry
 *   -h, --help
 */

const fs = require('fs');
const path = require('path');

const { renderFile, parseDocument, previewDocument, ValidationError } = require('../src/index');
const { resolveConfig, ConfigError, CONFIG_FILENAME } = require('../src/config');
const { layouts, layoutFor } = require('../src/layouts');
const { blocks } = require('../src/components');
const { contractFor, PAGE_TYPES } = require('../src/validate/document-contract');
const { describeContract } = require('../src/describe');
const { auditCatalog, formatAudit } = require('../src/audit');

function parseArgs(argv) {
  const options = { inputs: [], config: null, out: null, outDir: null, check: false, stdout: false, preview: false, styles: true, script: true, schema: true, font: true, help: false, contract: null, components: false, audit: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--config':
        options.config = argv[++i];
        break;
      case '-o':
      case '--out':
        options.out = argv[++i];
        break;
      case '--out-dir':
        options.outDir = argv[++i];
        break;
      case '--check':
        options.check = true;
        break;
      case '--stdout':
        options.stdout = true;
        break;
      case '--preview':
        options.preview = true;
        break;
      case '--no-styles':
        options.styles = false;
        break;
      case '--no-script':
        options.script = false;
        break;
      case '--no-schema':
        options.schema = false;
        break;
      case '--no-font':
        options.font = false;
        break;
      case '--contract':
        options.contract = argv[++i];
        break;
      case '--components':
        options.components = true;
        break;
      case '--audit':
        options.audit = argv[++i];
        break;
      default:
        if (arg.startsWith('-')) {
          fail(`Unknown option "${arg}". Run html-render --help.`);
        }
        options.inputs.push(arg);
    }
  }
  return options;
}

function fail(message) {
  process.stderr.write(`html-render: ${message}\n`);
  process.exit(1);
}

function usage() {
  process.stdout.write(
    [
      'html-render — renderer-ready Markdown to a design-system HTML page body',
      '',
      'Usage:',
      '  html-render <input.md> [more.md ...] [options]',
      '',
      'Options:',
      `      --config <file>   organization and renderer settings (default: ./${CONFIG_FILENAME})`,
      '  -o, --out <file>      write a single input to this file',
      '      --out-dir <dir>   write each input to <dir>/<name>.html',
      '      --check           validate only; write nothing',
      '      --stdout          print HTML instead of writing a file',
      '      --preview         also write <name>.preview.html for browser review',
      '      --no-styles       omit the <style> block',
      '      --no-script       omit the behaviour script',
      '      --no-schema       omit the JSON-LD block',
      '      --no-font         omit the configured webfont @import',
      `      --contract <type> print the Markdown contract (${PAGE_TYPES.join('|')})`,
      '      --components      list every available component',
      '      --audit <dir>     classify a Claude Design export against this registry',
      '  -h, --help            show this message',
      '',
      `Page classes: ${[...layouts.keys()].join(', ')}`,
      '',
    ].join('\n'),
  );
}

function listComponents() {
  const rows = [...blocks.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((component) => `  \`\`\`${component.name}\n      ${component.summary}\n      design source: ${component.source}`);
  process.stdout.write(`Author-invokable components (use inside a page section):\n\n${rows.join('\n\n')}\n\n`);
  for (const [name, layout] of layouts) {
    const described = layout.describe();
    process.stdout.write(`${name} layout — ${described.summary}\n`);
    if (described.order) process.stdout.write(`  order: ${described.order.join(' -> ')}\n`);
    if (described.variants) {
      for (const key of Object.keys(described.variants)) {
        process.stdout.write(`  ${key}: ${described.variants[key].join(' -> ')}\n`);
      }
    }
    process.stdout.write('\n');
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    usage();
    return;
  }
  if (options.components) {
    listComponents();
    return;
  }
  if (options.contract) {
    if (!PAGE_TYPES.includes(options.contract)) fail(`--contract expects one of: ${PAGE_TYPES.join(', ')}`);
    process.stdout.write(`${describeContract(options.contract, contractFor(options.contract), layoutFor(options.contract))}\n`);
    return;
  }
  if (options.audit) {
    try {
      process.stdout.write(`${formatAudit(auditCatalog(path.resolve(options.audit)))}\n`);
    } catch (error) {
      fail(`--audit: ${error.message}`);
    }
    return;
  }
  if (!options.inputs.length) {
    usage();
    fail('no input file given');
  }
  if (options.out && options.inputs.length > 1) {
    fail('--out takes a single input file; use --out-dir for several');
  }

  // Resolved once, up front: a missing or malformed config is one error, not one per input.
  let config;
  try {
    config = resolveConfig(options.config);
  } catch (error) {
    if (error instanceof ConfigError) fail(error.message);
    throw error;
  }

  let failures = 0;
  for (const input of options.inputs) {
    const resolved = path.resolve(input);
    if (!fs.existsSync(resolved)) {
      process.stderr.write(`html-render: no such file: ${input}\n`);
      failures += 1;
      continue;
    }
    try {
      if (options.check) {
        const doc = parseDocument(fs.readFileSync(resolved, 'utf8'), { file: input });
        process.stdout.write(`ok    ${input} — ${doc.pageType}${doc.layout ? ` (${doc.layout})` : ''}, ${doc.sections.length} sections\n`);
        continue;
      }

      const result = renderFile(resolved, {
        config,
        styles: options.styles,
        script: options.script,
        schema: options.schema,
        font: options.font,
        file: input,
      });

      if (options.stdout) {
        process.stdout.write(result.html);
        continue;
      }

      const target = options.out
        ? path.resolve(options.out)
        : path.resolve(options.outDir || path.dirname(resolved), `${path.basename(resolved).replace(/\.mdx?$/i, '')}.html`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, result.html, 'utf8');
      if (options.preview) {
        fs.writeFileSync(target.replace(/\.html$/, '.preview.html'), previewDocument(result), 'utf8');
      }
      process.stdout.write(
        `wrote ${path.relative(process.cwd(), target)} — ${result.meta.pageType}${result.layout ? ` (${result.layout})` : ''}, ${result.meta.sections} sections, ~${result.meta.words} words\n`,
      );
    } catch (error) {
      failures += 1;
      if (error instanceof ValidationError) {
        process.stderr.write(`\n${error.message}\n\nFix the Markdown and run again.\n`);
      } else if (error instanceof ConfigError) {
        process.stderr.write(`\nhtml-render: ${error.message}\n`);
      } else {
        process.stderr.write(`\nhtml-render: ${input}: ${error.message}\n`);
        if (process.env.HTML_RENDER_DEBUG) process.stderr.write(`${error.stack}\n`);
      }
    }
  }

  if (failures) process.exit(1);
}

main();
