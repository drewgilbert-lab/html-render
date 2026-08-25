'use strict';

/**
 * Renderer constants. Everything here is the same on every page, so it lives
 * in one place rather than in every Markdown file.
 */

module.exports = {
  rendererVersion: require('../package.json').version,

  // The wrapper class the stylesheet is scoped to.
  pageClass: 'hg-geo-page',

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
