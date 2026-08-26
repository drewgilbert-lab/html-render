'use strict';

/**
 * Renderer constants. Everything here is the same on every page, so it lives
 * in one place rather than in every Markdown file.
 */

/**
 * The placeholder `styles.css` and `script.js` carry wherever the wrapper class
 * belongs. Both assets are scoped to a class that is configurable, so neither
 * may spell it out; the renderer substitutes `pageClass` for every occurrence of
 * this token before emitting them. See `stylesheet()` in `index.js`.
 */
const PAGE_CLASS_TOKEN = '__page_class__';

module.exports = {
  rendererVersion: require('../package.json').version,

  PAGE_CLASS_TOKEN,

  // The wrapper class the stylesheet and behaviour script are scoped to. This is
  // the only place the class name is written: the assets carry PAGE_CLASS_TOKEN.
  pageClass: 'render-page',

  organization: {
    name: 'HG Insights',
    url: 'https://hginsights.com/',
    id: 'https://hginsights.com/#organization',
    logo: 'https://hginsights.com/assets/hg-insights-logo.png',
    sameAs: ['https://www.linkedin.com/company/hg-insights/'],
  },

  language: 'en-US',

  // Google Fonts stylesheet for Nunito Sans. The web team may already load this
  // site-wide; `--no-font` leaves it out.
  fontHref: 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800;900&display=swap',
};
