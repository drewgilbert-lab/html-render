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
}

/** Render one ```name block. Assumes validation already passed. */
function renderBlock(node) {
  const component = components.get(node.name);
  if (!component) throw new Error(`Unresolved component "${node.name}"`);
  return component.render(normalizeFields(component.fields, node.data), RENDER_CTX);
}

module.exports = { components, validateBlock, renderBlock };
