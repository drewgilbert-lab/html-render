'use strict';

/**
 * The layout registry. Exactly three page classes are supported; a layout
 * chooses which approved components appear and in what order, and nothing else.
 */

const pillar = require('./pillar');
const cluster = require('./cluster');
const spoke = require('./spoke');

const layouts = new Map([
  [pillar.pageType, pillar],
  [cluster.pageType, cluster],
  [spoke.pageType, spoke],
]);

function layoutFor(pageType) {
  const layout = layouts.get(pageType);
  if (!layout) throw new Error(`No layout registered for page type "${pageType}"`);
  return layout;
}

module.exports = { layouts, layoutFor };
