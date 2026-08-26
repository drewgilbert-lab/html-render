'use strict';

/**
 * html-render — renderer-ready Markdown in, an approved design-system page
 * body out.
 *
 * The pipeline, in order:
 *   parse Markdown -> identify page class -> validate against that class's
 *   contract -> map structured content to approved components -> assemble the
 *   approved layout -> emit deterministic HTML.
 *
 * No language model runs at render time. Given the same Markdown and the same
 * renderer version, the output bytes are identical.
 */

const fs = require('fs');
const path = require('path');

const { splitFrontmatter, parseBody, MarkdownError } = require('./parse/markdown');
const { parseYaml, YamlError } = require('./parse/yaml');
const { validateDocument, ValidationError } = require('./validate/validate');
const { plainText } = require('./validate/fields');
const { layoutFor } = require('./layouts');
const { renderSchema } = require('./schema');
const { escapeText, indent, lines } = require('./html');
const { resolveConfig, requireOrganization, rendererVersion, PAGE_CLASS_TOKEN, DEFAULTS } = require('./config');

const STYLES_TEMPLATE = fs.readFileSync(path.join(__dirname, 'assets', 'styles.css'), 'utf8').trimEnd();
const SCRIPT_TEMPLATE = fs.readFileSync(path.join(__dirname, 'assets', 'script.js'), 'utf8').trimEnd();

const RENDER_DEFAULTS = { styles: true, script: true, schema: true, font: true };

/**
 * Both assets are scoped to the page wrapper class, and that class is
 * configurable, so neither may contain it literally: each carries
 * `PAGE_CLASS_TOKEN` where the class name belongs and is substituted
 * here. A build step is the usual answer to this; the repo deliberately has
 * none, and a literal string swap needs no toolchain to stay true.
 */
function withPageClass(template, pageClass) {
  return template.split(PAGE_CLASS_TOKEN).join(pageClass);
}

/** The scoped stylesheet, ready to emit. */
function stylesheet(pageClass = DEFAULTS.pageClass) {
  return withPageClass(STYLES_TEMPLATE, pageClass);
}

/** The scoped behaviour script, ready to emit. */
function behaviourScript(pageClass = DEFAULTS.pageClass) {
  return withPageClass(SCRIPT_TEMPLATE, pageClass);
}

/**
 * Parse and validate without rendering. Throws on invalid input.
 * Useful on its own for a `--check` pass.
 */
function parseDocument(source, { file } = {}) {
  let split;
  try {
    split = splitFrontmatter(source);
  } catch (error) {
    if (error instanceof MarkdownError) throw new ValidationError([{ path: '', message: error.message, line: error.line }], file);
    throw error;
  }

  let frontmatter;
  try {
    frontmatter = parseYaml(split.frontmatter, split.frontmatterLine - 1);
  } catch (error) {
    if (error instanceof YamlError) throw new ValidationError([{ path: 'frontmatter', message: error.message, line: error.line }], file);
    throw error;
  }

  let body;
  try {
    body = parseBody(split.body, split.bodyLine);
  } catch (error) {
    if (error instanceof MarkdownError) throw new ValidationError([{ path: '', message: error.message, line: error.line }], file);
    throw error;
  }

  const parsed = { frontmatter, body, bodyLine: split.bodyLine };
  const { report, pageType, layout, sections } = validateDocument(parsed);
  if (!report.ok) throw new ValidationError(report.errors, file);

  return { frontmatter, pageType, layout, sections, preamble: body.preamble };
}

/**
 * Render renderer-ready Markdown to a finished page body.
 *
 * `options.config` is a config object or a path to one; without it the working
 * directory's config file is used. See `config.js` for the precedence rules.
 */
function render(source, options = {}) {
  const settings = { ...RENDER_DEFAULTS, ...options };
  const config = resolveConfig(settings.config);
  // Fail on missing identity before doing the work, not once the graph is reached.
  if (settings.schema) requireOrganization(config);
  const doc = parseDocument(source, settings);
  const layout = layoutFor(doc.pageType);
  const bodyHtml = layout.render(doc);

  const parts = [];
  if (settings.styles) {
    const styles = stylesheet(config.pageClass);
    const css = settings.font && config.fontHref ? `@import url('${config.fontHref}');\n\n${styles}` : styles;
    parts.push(`<style>\n${css}\n</style>`);
  }
  parts.push(bodyHtml);
  if (settings.schema) {
    parts.push(renderSchema(doc.frontmatter, { pageType: doc.pageType, sections: doc.sections, config }));
  }
  if (settings.script) {
    parts.push(`<script>\n${behaviourScript(config.pageClass)}\n</script>`);
  }

  const wrapped = `<div class="${config.pageClass}" data-page-type="${escapeText(doc.pageType)}">\n${indent(lines(parts))}\n</div>`;
  const meta = buildMeta(doc, bodyHtml);
  return { html: `${header(meta, config)}\n${wrapped}\n`, meta, config, pageType: doc.pageType, layout: doc.layout };
}

function buildMeta(doc, bodyHtml) {
  const fm = doc.frontmatter;
  const text = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    pageType: doc.pageType,
    layout: doc.layout,
    title: plainText(fm.title),
    description: plainText(fm.description),
    url: fm.url,
    published: String(fm.published),
    updated: String(fm.updated || fm.published),
    sections: doc.sections.length,
    words: text ? text.split(' ').length : 0,
  };
}

/**
 * A comment header carrying the values the publishing site needs in its own
 * fields (title, meta description, canonical URL) plus a QA line for whoever
 * places the page. The organization name comes from config; there is no
 * default, so a page never carries somebody else's.
 */
function header(meta, config) {
  const rule = '='.repeat(76);
  // A hyphen pair would close the comment; the rows are sanitized the same way.
  const owner = config.organization ? `${config.organization.name.replace(/--/g, '-')} ` : '';
  const rows = [
    `Page type        ${meta.pageType}${meta.layout ? ` (${meta.layout} layout)` : ''}`,
    `Title            ${meta.title}`,
    `Meta description ${meta.description}`,
    `Canonical URL    ${meta.url}`,
    `Published        ${meta.published}    Updated  ${meta.updated}`,
    `Body             ${meta.sections} sections, ~${meta.words} words`,
  ];
  return [
    `<!-- ${rule}`,
    `     ${owner}page body - html-render v${rendererVersion}`,
    '',
    ...rows.map((row) => `     ${row.replace(/--/g, '-')}`),
    '',
    '     Paste this whole block into the target page container. It contains no',
    '     <html>, <head>, site navigation, or footer - page body only.',
    `     ${rule} -->`,
  ].join('\n');
}

/** Render a file to a string. */
function renderFile(file, options = {}) {
  const source = fs.readFileSync(file, 'utf8');
  return render(source, { ...options, file });
}

/**
 * Wrap a rendered body in a minimal standalone document, purely so the output
 * can be opened in a browser and compared against the supplied design. This is
 * a review aid — it is never what the web team receives.
 */
function previewDocument(result) {
  const config = result.config || resolveConfig(null);
  const siteName = config.organization ? ` | ${escapeText(config.organization.name)}` : '';
  return [
    '<!DOCTYPE html>',
    `<html lang="${escapeText(config.language)}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeText(result.meta.title)}${siteName}</title>`,
    `<meta name="description" content="${escapeText(result.meta.description).replace(/"/g, '&quot;')}">`,
    '<style>body{margin:0}.preview-note{font:600 12px/1.4 system-ui,sans-serif;background:#212121;color:#fff;padding:10px 16px;letter-spacing:.04em}</style>',
    '</head>',
    '<body>',
    `<div class="preview-note">PREVIEW ONLY — visual review wrapper. The deliverable is the page body inside, page type: ${escapeText(result.meta.pageType)}.</div>`,
    result.html.trimEnd(),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

module.exports = { render, renderFile, parseDocument, previewDocument, ValidationError, stylesheet, behaviourScript };
