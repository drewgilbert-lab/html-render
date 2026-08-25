'use strict';

/**
 * HTML output primitives.
 *
 * Everything the renderer emits goes through here so escaping is consistent
 * and the output is byte-for-byte reproducible.
 */

// Matches an already-written character reference (named, decimal, or hex).
// Authors write "&middot;" and "&amp;" in Markdown; both must survive untouched.
const ENTITY = /^&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,31});/;

/** Escape text for a text node, preserving pre-existing character references. */
function escapeText(value) {
  const str = String(value == null ? '' : value);
  let out = '';
  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i];
    if (ch === '&') {
      const rest = str.slice(i);
      const match = ENTITY.exec(rest);
      if (match) {
        out += match[0];
        i += match[0].length - 1;
        continue;
      }
      out += '&amp;';
    } else if (ch === '<') {
      out += '&lt;';
    } else if (ch === '>') {
      out += '&gt;';
    } else {
      out += ch;
    }
  }
  return out;
}

/** Escape a value for use inside a double-quoted attribute. */
function escapeAttr(value) {
  return escapeText(value).replace(/"/g, '&quot;');
}

/**
 * Serialize an attribute map. Insertion order is preserved, so component
 * authors control attribute order and output stays stable.
 */
function attrs(map) {
  if (!map) return '';
  const parts = [];
  for (const key of Object.keys(map)) {
    const value = map[key];
    if (value == null || value === false || value === '') continue;
    if (value === true) {
      parts.push(key);
      continue;
    }
    parts.push(`${key}="${escapeAttr(value)}"`);
  }
  return parts.length ? ` ${parts.join(' ')}` : '';
}

/** Build an element. `children` may be a string or a (possibly nested) array. */
function el(tag, attrMap, children) {
  const inner = flatten(children);
  return `<${tag}${attrs(attrMap)}>${inner}</${tag}>`;
}

/** Flatten nested arrays of HTML strings, dropping empty entries. */
function flatten(children) {
  if (children == null || children === false) return '';
  if (Array.isArray(children)) {
    return children.map(flatten).filter((part) => part !== '').join('');
  }
  return String(children);
}

/** Join HTML fragments with newlines, dropping empties. Used for block flow. */
function lines(...parts) {
  return parts
    .flat(Infinity)
    .filter((part) => part != null && part !== false && part !== '')
    .join('\n');
}

/** Indent every line of an HTML fragment by `depth` two-space levels. */
function indent(html, depth = 1) {
  if (!html) return '';
  const pad = '  '.repeat(depth);
  return html
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n');
}

/** Wrap children in the canonical `.container` content column. */
function container(children, className) {
  return el('div', { class: className ? `container ${className}` : 'container' }, `\n${indent(flatten(children))}\n`);
}

/**
 * Deterministic anchor slug. Truncates on a word boundary so auto-generated
 * anchors stay readable; a section can always set an explicit `id` instead.
 */
function slugify(value, maxLength = 48) {
  const words = String(value == null ? '' : value)
    .toLowerCase()
    .replace(/&[a-z]+;/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u2019'"\u201c\u201d]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const kept = [];
  let length = 0;
  for (const word of words) {
    const next = length === 0 ? word.length : length + 1 + word.length;
    if (kept.length && next > maxLength) break;
    kept.push(word);
    length = next;
  }
  return kept.join('-');
}

/** Initials from a person's name: "Jordan Lee" -> "JL". */
function initials(name) {
  const words = String(name || '')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

module.exports = { escapeText, escapeAttr, el, flatten, lines, indent, container, slugify, initials };
