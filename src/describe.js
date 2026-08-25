'use strict';

/**
 * Human-readable contract printing for `html-render --contract <type>`.
 * Generated from the live contracts, so it can never fall out of date.
 */

function fieldLine(name, spec, depth) {
  const pad = '  '.repeat(depth + 1);
  const flags = [];
  if (spec.required) flags.push('required');
  if (spec.type === 'enum') flags.push(`one of: ${spec.values.join(' | ')}`);
  if (spec.type === 'list') {
    const bounds = [];
    if (spec.min != null) bounds.push(`min ${spec.min}`);
    if (spec.max != null) bounds.push(`max ${spec.max}`);
    flags.push(`list${bounds.length ? ` (${bounds.join(', ')})` : ''}`);
  }
  if (spec.default !== undefined) flags.push(`default: ${JSON.stringify(spec.default)}`);
  if (spec.hint) flags.push(spec.hint);
  const type = spec.type === 'list' || spec.type === 'object' ? '' : ` <${spec.type}>`;
  return `${pad}${name}${type}${flags.length ? `  — ${flags.join('; ')}` : ''}`;
}

function describeFields(fields, depth = 0) {
  const out = [];
  for (const name of Object.keys(fields)) {
    const spec = fields[name];
    out.push(fieldLine(name, spec, depth));
    if (spec.type === 'object' && spec.fields) out.push(...describeFields(spec.fields, depth + 1));
    if (spec.type === 'list' && spec.fields) out.push(...describeFields(spec.fields, depth + 1));
  }
  return out;
}

function describeContract(pageType, contract, layout) {
  const described = layout.describe();
  const out = [`# ${pageType} — Markdown contract`, '', described.summary, ''];
  if (described.order) {
    out.push('Component order:', ...described.order.map((step, index) => `  ${index + 1}. ${step}`), '');
  }
  if (described.variants) {
    out.push('Variants:');
    for (const key of Object.keys(described.variants)) {
      out.push(`  ${key}:`, ...described.variants[key].map((step, index) => `    ${index + 1}. ${step}`));
    }
    out.push('');
  }
  out.push('Frontmatter:', ...describeFields(contract), '');
  return out.join('\n');
}

module.exports = { describeContract };
