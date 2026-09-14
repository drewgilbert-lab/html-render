'use strict';

/**
 * The component registry.
 *
 * One registry, one kind of component. Every component is invokable from the
 * body with a ```name block — the renderer does not distinguish "chrome a
 * layout composes" from "content an author places", because it no longer owns
 * composition. The `.md` decides what appears and in what order.
 *
 * A component renders what it is given and omits what it is not. It states no
 * requirement about what a page should contain; that belongs to the skills
 * that author the Markdown.
 *
 * Changing an implementation here changes every page that uses it.
 */

const { blocks: blockList } = require('./blocks');
const { pageComponents } = require('./page');
const { validateFields, normalizeFields } = require('../validate/fields');
const { initials } = require('../html');

const components = new Map([...blockList, ...pageComponents].map((component) => [component.name, component]));

/**
 * Transitional aliases. `layouts/` and `validate/document-contract.js` still
 * address components as "page slots"; both are removed in a later step, and
 * these go with them. They are the same registry, not two.
 */
const blocks = components;
const page = components;

const RENDER_CTX = { helpers: { initialsOf: initials } };

/** Validate one ```name block from the body. */
function validateBlock(node, path, report) {
  const component = components.get(node.name);
  if (!component) {
    report.add(
      path,
      `"${node.name}" is not a known component. Available components: ${[...components.keys()].sort().join(', ')}`,
      node.line,
    );
    return;
  }
  validateFields(component.fields, node.data, path, report, node.line);
  // Cross-field rules a `fields` map cannot express. Removed with the rest of
  // the content requirements in the next commit.
  if (typeof component.validate === 'function') {
    const scoped = { add: (subpath, message, line) => report.add(subpath, message, line == null ? node.line : line) };
    component.validate(node.data, path, scoped);
  }
}

/** Render one ```name block. Assumes validation already passed. */
function renderBlock(node) {
  const component = components.get(node.name);
  if (!component) throw new Error(`Unresolved component "${node.name}"`);
  return component.render(normalizeFields(component.fields, node.data), RENDER_CTX);
}

/** Validate a component's input by name. */
function validateSlot(name, value, path, report, line) {
  const component = components.get(name);
  if (!component) throw new Error(`Unresolved component "${name}"`);
  validateFields(component.fields, value, path, report, line);
}

/** Render a component by name. Assumes validation already passed. */
function renderSlot(name, value) {
  const component = components.get(name);
  if (!component) throw new Error(`Unresolved component "${name}"`);
  return component.render(normalizeFields(component.fields, value), RENDER_CTX);
}

function slotFields(name) {
  const component = components.get(name);
  if (!component) throw new Error(`Unresolved component "${name}"`);
  return component.fields;
}

module.exports = { components, blocks, page, validateBlock, renderBlock, validateSlot, renderSlot, slotFields };
