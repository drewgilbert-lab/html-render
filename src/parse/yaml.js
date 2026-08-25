'use strict';

/**
 * A deliberately small YAML-subset parser for renderer frontmatter.
 *
 * Supported, and nothing else:
 *   key: value                      scalars (string / number / boolean / null)
 *   key:                            nested mapping (by indentation)
 *   key:                            sequence of scalars or of mappings
 *     - item
 *     - key: value
 *   key: [a, b, c]                  inline flow sequence of scalars
 *   key: |  /  |-  /  >  /  >-      block scalars
 *   'single' / "double" quoting
 *   # comments, blank lines
 *
 * Anything outside this subset raises a `YamlError` naming the line, which is
 * exactly what we want: the frontmatter contract should stay small enough that
 * an upstream content generator can hit it every time.
 *
 * Every mapping and sequence carries a non-enumerable `__loc` map of
 * key/index -> 1-based source line, so validation errors can point at a line.
 */

class YamlError extends Error {
  constructor(message, line) {
    super(line ? `${message} (frontmatter line ${line})` : message);
    this.name = 'YamlError';
    this.line = line || null;
  }
}

const LOC = '__loc';

function withLoc(target) {
  Object.defineProperty(target, LOC, { value: Object.create(null), enumerable: false, writable: true });
  return target;
}

/** Line number recorded for `key` on a parsed object/array, or null. */
function locOf(node, key) {
  if (!node || typeof node !== 'object') return null;
  const loc = node[LOC];
  if (!loc) return null;
  const value = loc[key];
  return value == null ? null : value;
}

function parseYaml(source, lineOffset = 0) {
  const rawLines = String(source == null ? '' : source).replace(/\r\n?/g, '\n').split('\n');

  // Tokenize into { indent, text, line } skipping blanks and comment-only lines,
  // but keeping raw lines available for block scalars.
  const items = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const raw = rawLines[i];
    if (raw.includes('\t')) {
      throw new YamlError('Tabs are not allowed for indentation; use spaces', i + 1 + lineOffset);
    }
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    items.push({ indent: raw.length - raw.replace(/^ +/, '').length, text: trimmed, line: i + 1 + lineOffset, index: i });
  }

  const state = { items, pos: 0, rawLines, lineOffset };
  if (!items.length) return withLoc({});
  const root = parseBlock(state, items[0].indent);
  if (state.pos < items.length) {
    throw new YamlError(`Unexpected indentation`, items[state.pos].line);
  }
  return root;
}

function parseBlock(state, indent) {
  const first = state.items[state.pos];
  if (first.text.startsWith('- ') || first.text === '-') return parseSequence(state, indent);
  return parseMapping(state, indent);
}

function parseSequence(state, indent) {
  const out = withLoc([]);
  while (state.pos < state.items.length) {
    const item = state.items[state.pos];
    if (item.indent < indent) break;
    if (item.indent > indent) throw new YamlError('Unexpected indentation in list', item.line);
    if (!(item.text === '-' || item.text.startsWith('- '))) break;

    const inline = item.text === '-' ? '' : item.text.slice(2).trim();
    out[LOC][out.length] = item.line;
    state.pos += 1;

    if (inline === '') {
      // Value lives on the following, more-indented lines.
      const next = state.items[state.pos];
      if (!next || next.indent <= indent) {
        out.push(null);
        continue;
      }
      out.push(parseBlock(state, next.indent));
      continue;
    }

    const kv = splitKeyValue(inline);
    if (kv) {
      // "- key: value" starts a mapping whose remaining keys are indented to
      // the column where `key` begins.
      const childIndent = indent + 2 + (item.text.slice(2).length - item.text.slice(2).trimStart().length);
      const mapping = withLoc({});
      applyKeyValue(state, mapping, kv, item, childIndent);
      collectMappingKeys(state, mapping, childIndent);
      out.push(mapping);
      continue;
    }

    out.push(parseScalar(inline, item.line));
  }
  return out;
}

function parseMapping(state, indent) {
  const out = withLoc({});
  collectMappingKeys(state, out, indent, true);
  return out;
}

function collectMappingKeys(state, out, indent, requireFirst = false) {
  let sawAny = false;
  while (state.pos < state.items.length) {
    const item = state.items[state.pos];
    if (item.indent < indent) break;
    if (item.indent > indent) {
      if (!sawAny && requireFirst) throw new YamlError('Unexpected indentation', item.line);
      break;
    }
    if (item.text.startsWith('- ') || item.text === '-') break;
    const kv = splitKeyValue(item.text);
    if (!kv) throw new YamlError(`Expected "key: value" but found ${JSON.stringify(item.text)}`, item.line);
    state.pos += 1;
    sawAny = true;
    applyKeyValue(state, out, kv, item, indent);
  }
  return out;
}

function applyKeyValue(state, out, kv, item, indent) {
  const { key, value } = kv;
  if (Object.prototype.hasOwnProperty.call(out, key)) {
    throw new YamlError(`Duplicate key "${key}"`, item.line);
  }
  out[LOC][key] = item.line;

  if (value === '|' || value === '|-' || value === '>' || value === '>-') {
    out[key] = readBlockScalar(state, item, indent, value);
    return;
  }
  if (value !== '') {
    out[key] = parseScalar(value, item.line);
    return;
  }

  // Empty value: either a nested block or an explicit null.
  const next = state.items[state.pos];
  if (!next || next.indent < indent) {
    out[key] = null;
    return;
  }
  if (next.indent === indent) {
    // A sequence may sit at the parent's indentation ("key:" then "- item").
    if (next.text === '-' || next.text.startsWith('- ')) {
      out[key] = parseSequence(state, indent);
      return;
    }
    out[key] = null;
    return;
  }
  out[key] = parseBlock(state, next.indent);
}

/**
 * Block scalars are read from the raw lines so blank lines and inner
 * indentation survive. Content is every following raw line indented deeper
 * than the key.
 */
function readBlockScalar(state, item, indent, marker) {
  const folded = marker.startsWith('>');
  const strip = marker.endsWith('-');
  const collected = [];
  let cursor = item.index + 1;
  let blockIndent = null;

  while (cursor < state.rawLines.length) {
    const raw = state.rawLines[cursor];
    if (raw.trim() === '') {
      collected.push('');
      cursor += 1;
      continue;
    }
    const lineIndent = raw.length - raw.replace(/^ +/, '').length;
    if (lineIndent <= indent) break;
    if (blockIndent == null) blockIndent = lineIndent;
    collected.push(raw.slice(Math.min(blockIndent, lineIndent)));
    cursor += 1;
  }

  // Advance the token cursor past every token consumed by the block.
  while (state.pos < state.items.length && state.items[state.pos].index < cursor) state.pos += 1;

  while (collected.length && collected[collected.length - 1] === '') collected.pop();

  let text;
  if (folded) {
    const paragraphs = [];
    let current = [];
    for (const line of collected) {
      if (line === '') {
        if (current.length) paragraphs.push(current.join(' '));
        current = [];
      } else {
        current.push(line.trim());
      }
    }
    if (current.length) paragraphs.push(current.join(' '));
    text = paragraphs.join('\n\n');
  } else {
    text = collected.join('\n');
  }
  return strip ? text : text;
}

/** Split "key: value" / "key:" respecting quotes. Returns null when not a pair. */
function splitKeyValue(text) {
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ':' && (i + 1 === text.length || text[i + 1] === ' ')) {
      const key = text.slice(0, i).trim();
      if (!key) return null;
      return { key: unquote(key), value: text.slice(i + 1).trim() };
    }
  }
  return null;
}

function unquote(text) {
  if (text.length >= 2) {
    const first = text[0];
    const last = text[text.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      const inner = text.slice(1, -1);
      return first === '"' ? inner.replace(/\\"/g, '"').replace(/\\n/g, '\n') : inner.replace(/''/g, "'");
    }
  }
  return text;
}

function stripComment(text) {
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#' && (i === 0 || text[i - 1] === ' ')) return text.slice(0, i).trimEnd();
  }
  return text;
}

function parseScalar(rawValue, line) {
  const quoted = rawValue.length >= 2 && (rawValue[0] === '"' || rawValue[0] === "'");
  const value = quoted ? rawValue : stripComment(rawValue).trim();

  if (value.startsWith('[')) {
    if (!value.endsWith(']')) throw new YamlError('Unterminated inline list', line);
    const inner = value.slice(1, -1).trim();
    const list = withLoc([]);
    if (inner === '') return list;
    for (const part of splitFlow(inner, line)) {
      list[LOC][list.length] = line;
      list.push(parseScalar(part.trim(), line));
    }
    return list;
  }
  if (value.startsWith('{')) {
    throw new YamlError('Inline maps ({ ... }) are not supported; use indented keys', line);
  }
  if (quoted) return unquote(value);
  if (value === '' || value === '~' || value === 'null') return null;
  if (value === 'true' || value === 'yes') return true;
  if (value === 'false' || value === 'no') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d*\.\d+$/.test(value)) return Number(value);
  return value;
}

function splitFlow(inner, line) {
  const parts = [];
  let quote = null;
  let depth = 0;
  let current = '';
  for (const ch of inner) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '[') depth += 1;
    if (ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (quote) throw new YamlError('Unterminated quoted string in inline list', line);
  parts.push(current);
  return parts;
}

module.exports = { parseYaml, YamlError, locOf, LOC };
