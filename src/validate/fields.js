'use strict';

/**
 * The declarative input-contract engine.
 *
 * Every component and every page-level slot declares its inputs as a `fields`
 * map. This module does two jobs against that declaration:
 *
 *   validate()  collect human-readable errors for missing / malformed input
 *   normalize() convert raw Markdown values into render-ready HTML
 *
 * Because components never touch raw input, escaping is uniform and a
 * component's contract is the single place its inputs are described.
 *
 * Field types:
 *   plain     escaped text, no Markdown
 *   text      one line of inline Markdown -> HTML
 *   richtext  Markdown split on blank lines -> array of HTML paragraphs
 *   url       a link target (relative, absolute, or #anchor)
 *   enum      one of `values`
 *   bool      true / false
 *   number    a number, or a string that looks like one
 *   object    a nested `fields` map
 *   list      a repeated value: `of` (a field spec) or `fields` (a map)
 */

const { escapeText } = require('../html');
const { renderInline } = require('../parse/markdown');
const { locOf } = require('../parse/yaml');

class Report {
  constructor() {
    this.errors = [];
  }

  add(path, message, line) {
    this.errors.push({ path, message, line: line == null ? null : line });
  }

  get ok() {
    return this.errors.length === 0;
  }
}

function isBlank(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function join(path, key) {
  if (!path) return String(key);
  return typeof key === 'number' ? `${path}[${key}]` : `${path}.${key}`;
}

/** Validate `value` against a `fields` map. Adds errors to `report`. */
function validateFields(fields, value, path, report, parentLine) {
  if (value == null) value = {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    report.add(path, `expected a set of keys but found ${describe(value)}`, parentLine);
    return;
  }

  const known = new Set(Object.keys(fields));
  for (const key of Object.keys(fields)) {
    const spec = fields[key];
    const raw = value[key];
    const line = locOf(value, key) || parentLine;
    if (isBlank(raw)) {
      if (spec.required) {
        report.add(join(path, key), `is required${spec.hint ? ` — ${spec.hint}` : ''}`, parentLine);
      }
      continue;
    }
    validateField(spec, raw, join(path, key), report, line);
  }

  for (const key of Object.keys(value)) {
    if (!known.has(key)) {
      report.add(
        join(path, key),
        `is not a recognized key. Allowed keys: ${[...known].join(', ')}`,
        locOf(value, key) || parentLine,
      );
    }
  }
}

function validateField(spec, raw, path, report, line) {
  switch (spec.type) {
    case 'plain':
    case 'text':
    case 'richtext':
      if (typeof raw === 'object') {
        report.add(path, `expected text but found ${describe(raw)}`, line);
      }
      break;
    case 'url':
      if (typeof raw !== 'string') {
        report.add(path, `expected a URL but found ${describe(raw)}`, line);
      } else if (!/^(https?:\/\/|\/|#|mailto:|tel:)/.test(raw.trim())) {
        report.add(
          path,
          `is not a usable link target: ${JSON.stringify(raw)}. Use an absolute URL, a site-root path starting with "/", or an "#anchor"`,
          line,
        );
      }
      break;
    case 'enum':
      if (!spec.values.includes(String(raw))) {
        report.add(path, `must be one of: ${spec.values.join(', ')} (found ${JSON.stringify(raw)})`, line);
      }
      break;
    case 'bool':
      if (typeof raw !== 'boolean') {
        report.add(path, `must be true or false (found ${JSON.stringify(raw)})`, line);
      }
      break;
    case 'number':
      if (typeof raw !== 'number' && !(typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw)))) {
        report.add(path, `must be a number (found ${JSON.stringify(raw)})`, line);
      }
      break;
    case 'object':
      validateFields(spec.fields, raw, path, report, line);
      break;
    case 'list': {
      if (!Array.isArray(raw)) {
        report.add(
          path,
          `must be a list. Write each entry on its own line starting with "- " (found ${describe(raw)})`,
          line,
        );
        return;
      }
      if (spec.min != null && raw.length < spec.min) {
        report.add(path, `needs at least ${spec.min} ${spec.min === 1 ? 'entry' : 'entries'} (found ${raw.length})`, line);
      }
      if (spec.max != null && raw.length > spec.max) {
        report.add(path, `allows at most ${spec.max} entries (found ${raw.length})`, line);
      }
      raw.forEach((item, index) => {
        const itemLine = locOf(raw, index) || line;
        const itemPath = join(path, index);
        if (spec.fields) {
          if (typeof item !== 'object' || item == null || Array.isArray(item)) {
            // A list may declare `primaryKey` so a bare string is shorthand for
            // a one-key entry (e.g. a meta pill written as just its label).
            if (spec.primaryKey && !Array.isArray(item) && typeof item !== 'object') {
              validateField(spec.fields[spec.primaryKey], item, join(itemPath, spec.primaryKey), report, itemLine);
              return;
            }
            report.add(
              itemPath,
              `is malformed: each entry needs keys (${Object.keys(spec.fields).join(', ')}) but found ${describe(item)}`,
              itemLine,
            );
            return;
          }
          validateFields(spec.fields, item, itemPath, report, itemLine);
          return;
        }
        if (isBlank(item)) {
          report.add(itemPath, 'is empty', itemLine);
          return;
        }
        validateField(spec.of || { type: 'text' }, item, itemPath, report, itemLine);
      });
      break;
    }
    default:
      throw new Error(`Unknown field type "${spec.type}" at ${path}`);
  }
}

/** Convert raw values into render-ready values according to `fields`. */
function normalizeFields(fields, value) {
  const source = value == null ? {} : value;
  const out = {};
  for (const key of Object.keys(fields)) {
    const spec = fields[key];
    const raw = source[key];
    out[key] = isBlank(raw) ? defaultOf(spec) : normalizeField(spec, raw);
  }
  return out;
}

function defaultOf(spec) {
  if (spec.default !== undefined) return normalizeField(spec, spec.default);
  if (spec.type === 'list') return [];
  if (spec.type === 'richtext') return [];
  if (spec.type === 'object') return null;
  if (spec.type === 'bool') return false;
  return null;
}

function normalizeField(spec, raw) {
  switch (spec.type) {
    case 'plain':
      return escapeText(String(raw));
    case 'url':
      return String(raw).trim();
    case 'enum':
      return String(raw);
    case 'bool':
      return Boolean(raw);
    case 'number':
      return typeof raw === 'number' ? raw : Number(raw);
    case 'text':
      return renderInline(String(raw), { citationRefs: new Map() });
    case 'richtext':
      return paragraphsOf(String(raw));
    case 'object':
      return normalizeFields(spec.fields, raw);
    case 'list':
      if (!Array.isArray(raw)) return [];
      return raw.map((item) => {
        if (!spec.fields) return normalizeField(spec.of || { type: 'text' }, item);
        const entry =
          spec.primaryKey && (item == null || typeof item !== 'object') ? { [spec.primaryKey]: item } : item;
        return normalizeFields(spec.fields, entry);
      });
    default:
      throw new Error(`Unknown field type "${spec.type}"`);
  }
}

/** Split a rich-text value on blank lines and inline-render each paragraph. */
function paragraphsOf(text) {
  return String(text)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => renderInline(part.replace(/\n+/g, ' '), { citationRefs: new Map() }));
}

/** Collect `[^n]` citation references from every text-bearing field. */
function collectCitationRefs(fields, value, into) {
  if (value == null) return into;
  for (const key of Object.keys(fields)) {
    const spec = fields[key];
    const raw = value[key];
    if (isBlank(raw)) continue;
    if (spec.type === 'text' || spec.type === 'richtext') {
      for (const match of String(raw).matchAll(/\[\^(\d+)\]/g)) into.set(match[1], true);
    } else if (spec.type === 'object') {
      collectCitationRefs(spec.fields, raw, into);
    } else if (spec.type === 'list' && Array.isArray(raw)) {
      for (const item of raw) {
        if (spec.fields) {
          const entry = spec.primaryKey && (item == null || typeof item !== 'object') ? { [spec.primaryKey]: item } : item;
          collectCitationRefs(spec.fields, entry, into);
        }
        else if ((spec.of || { type: 'text' }).type !== 'plain' && typeof item === 'string') {
          for (const match of item.matchAll(/\[\^(\d+)\]/g)) into.set(match[1], true);
        }
      }
    }
  }
  return into;
}

function describe(value) {
  if (value === null || value === undefined) return 'nothing';
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'object') return 'a set of keys';
  return JSON.stringify(value);
}

/** Strip inline Markdown to plain text (for JSON-LD and meta descriptions). */
function plainText(value) {
  return String(value == null ? '' : value)
    .replace(/\[\^\d+\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/&middot;/g, '·')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsaquo;/g, '›')
    .replace(/&rarr;/g, '→')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  Report,
  validateFields,
  normalizeFields,
  normalizeField,
  collectCitationRefs,
  plainText,
  isBlank,
};
