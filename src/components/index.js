'use strict';

/**
 * The component registry.
 *
 * `blocks`  — components an author may place in a section with ```name.
 * `page`    — components a layout composes from frontmatter slots.
 *
 * A layout never re-implements a component; it only chooses which components
 * appear and in what order. Changing an implementation here changes every page
 * that uses it.
 */

const { blocks: blockList } = require('./blocks');
const { pageComponents } = require('./page');
const { validateFields, normalizeFields } = require('../validate/fields');
const { initials } = require('../html');

const blocks = new Map(blockList.map((component) => [component.name, component]));
const page = new Map(pageComponents.map((component) => [component.name, component]));

const RENDER_CTX = { helpers: { initialsOf: initials } };

/** Validate one ```name block from the body. */
function validateBlock(node, path, report) {
  const component = blocks.get(node.name);
  if (!component) {
    report.add(
      path,
      `"${node.name}" is not a known component. Available components: ${[...blocks.keys()].sort().join(', ')}`,
      node.line,
    );
    return;
  }
  validateFields(component.fields, node.data, path, report, node.line);
}

/** Render one ```name block. Assumes validation already passed. */
function renderBlock(node) {
  const component = blocks.get(node.name);
  if (!component) throw new Error(`Unresolved component "${node.name}"`);
  return component.render(normalizeFields(component.fields, node.data), RENDER_CTX);
}

/** Validate a page-level slot against its component contract. */
function validateSlot(name, value, path, report, line) {
  const component = page.get(name);
  if (!component) throw new Error(`Unresolved page component "${name}"`);
  validateFields(component.fields, value, path, report, line);
}

/** Render a page-level slot. Assumes validation already passed. */
function renderSlot(name, value) {
  const component = page.get(name);
  if (!component) throw new Error(`Unresolved page component "${name}"`);
  return component.render(normalizeFields(component.fields, value), RENDER_CTX);
}

function slotFields(name) {
  const component = page.get(name);
  if (!component) throw new Error(`Unresolved page component "${name}"`);
  return component.fields;
}

module.exports = { blocks, page, validateBlock, renderBlock, validateSlot, renderSlot, slotFields };
