'use strict';

/**
 * Renderer configuration.
 *
 * Two kinds of value live here, and the difference is the whole point of this
 * file:
 *
 *   Renderer defaults    A wrapper class, a locale, a webfont. Neutral, safe to
 *                        ship, overridable.
 *   Consumer identity    Who publishes the page. `organization` ends up in every
 *                        page's JSON-LD as the Organization node and as the
 *                        Article's publisher, so a default here would mean every
 *                        consumer who forgot to configure the renderer shipped
 *                        somebody else's identity in their own structured data.
 *                        There is no default. It is supplied or the render fails.
 *
 * Where configuration comes from, highest precedence first:
 *
 *   1. `render(source, { config })` — an object, or a path to a JSON file.
 *   2. `--config <file>` on the CLI (which is 1, with a path).
 *   3. `./html-render.config.json` in the current working directory.
 *   4. The defaults below — for everything except `organization`.
 *
 * The file is plain JSON read with `fs`: this repo has no dependencies and no
 * build step by design, and configuration is not a reason to acquire either.
 */

const fs = require('fs');
const path = require('path');

/** Auto-detected in the working directory when no config is passed explicitly. */
const CONFIG_FILENAME = 'html-render.config.json';

/**
 * The placeholder `styles.css` and `script.js` carry wherever the wrapper class
 * belongs. Both assets are scoped to a class that is configurable, so neither
 * may spell it out; the renderer substitutes `pageClass` for every occurrence of
 * this token before emitting them. See `stylesheet()` in `index.js`.
 */
const PAGE_CLASS_TOKEN = '__page_class__';

/**
 * Defaults for everything that is a renderer choice rather than an identity.
 *
 * `fontHref` is null: a webfont is a brand decision, and the stylesheet already
 * falls back to a system stack, so the neutral default is to link nothing.
 * `language` defaults rather than being required — a locale is not an identity,
 * and a page that declares the wrong one is wrong in a way anyone can see.
 */
const DEFAULTS = Object.freeze({
  pageClass: 'render-page',
  language: 'en-US',
  fontHref: null,
});

const KEYS = ['organization', 'pageClass', 'language', 'fontHref'];
const ORGANIZATION_KEYS = ['name', 'url', 'id', 'logo', 'sameAs'];
const ORGANIZATION_REQUIRED = ['name', 'url'];

/** Marks a config that has already been through `normalize`, so it is not re-validated. */
const RESOLVED = Symbol('html-render config');

/** A valid CSS class name. Enforced: `pageClass` is interpolated into CSS, JS, and HTML. */
const CLASS_NAME = /^-?[A-Za-z_][A-Za-z0-9_-]*$/;

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

const SAMPLE = `  {
    "organization": {
      "name": "Example Corp",
      "url": "https://example.com/",
      "logo": "https://example.com/logo.png",
      "sameAs": ["https://www.linkedin.com/company/example/"]
    }
  }`;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value, where) {
  if (typeof value !== 'string' || !value.trim()) throw new ConfigError(`${where} must be a non-empty string`);
  return value;
}

function requireUrl(value, where) {
  requireString(value, where);
  if (!/^https?:\/\//.test(value)) throw new ConfigError(`${where} must be an http(s) URL, got "${value}"`);
  return value;
}

function rejectUnknown(object, known, where) {
  const unknown = Object.keys(object).filter((key) => !known.includes(key));
  if (unknown.length) {
    throw new ConfigError(
      `unknown ${where} key${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}\n` +
        `Accepted: ${known.join(', ')}. A typo here would be silently ignored, so it is an error instead.`,
    );
  }
}

/**
 * The organization block, or null when none was supplied.
 *
 * `id` defaults to a conventional fragment on the organization's own URL — that
 * is a JSON-LD convention, not an identity, so deriving it invents nothing.
 * `logo` and `sameAs` are optional and are simply absent from the graph.
 */
function normalizeOrganization(raw, source) {
  if (raw === undefined) return null;
  if (!isPlainObject(raw)) throw new ConfigError('organization must be an object');
  rejectUnknown(raw, ORGANIZATION_KEYS, 'organization');

  const missing = ORGANIZATION_REQUIRED.filter((key) => raw[key] === undefined);
  if (missing.length) throw missingOrganization(missing, { source });

  const organization = {
    name: requireString(raw.name, 'organization.name'),
    url: requireUrl(raw.url, 'organization.url'),
    id: raw.id === undefined ? `${String(raw.url).replace(/\/+$/, '')}/#organization` : requireString(raw.id, 'organization.id'),
  };
  if (raw.logo !== undefined) organization.logo = requireUrl(raw.logo, 'organization.logo');
  if (raw.sameAs !== undefined) {
    if (!Array.isArray(raw.sameAs)) throw new ConfigError('organization.sameAs must be an array of URLs');
    organization.sameAs = raw.sameAs.map((entry, index) => requireUrl(entry, `organization.sameAs[${index}]`));
  }
  return Object.freeze(organization);
}

/**
 * The error raised when a render needs organization data and has none —
 * either because no config was found at all (`searched`), or because the one
 * that was found does not carry it (`source`).
 */
function missingOrganization(missing, { source = null, searched = null } = {}) {
  const names = missing.map((key) => `organization.${key}`).join(', ');
  const lead = source
    ? `${source} is missing required configuration: ${names}`
    : `no configuration file found — looked for ${searched}\nMissing required configuration: ${names}`;
  return new ConfigError(
    `${lead}\n\n` +
      'Every rendered page carries a JSON-LD Organization node naming its publisher,\n' +
      'and the renderer will not invent or inherit one. Supply it with:\n\n' +
      '  html-render <input.md> --config <file>\n\n' +
      `or put ${CONFIG_FILENAME} in the working directory:\n\n${SAMPLE}\n\n` +
      'Render with --no-schema to emit no structured data at all.',
  );
}

function normalize(raw, source) {
  if (raw === null) return Object.freeze({ ...DEFAULTS, organization: null, source: null, [RESOLVED]: true });
  if (!isPlainObject(raw)) throw new ConfigError(`${source} must contain a JSON object`);

  // `$schema` is editor tooling, never renderer input.
  const { $schema, ...input } = raw;
  rejectUnknown(input, KEYS, 'config');

  const config = {
    ...DEFAULTS,
    organization: normalizeOrganization(input.organization, source),
    source,
    [RESOLVED]: true,
  };
  if (input.pageClass !== undefined) {
    config.pageClass = requireString(input.pageClass, 'pageClass');
    if (!CLASS_NAME.test(config.pageClass)) {
      throw new ConfigError(`pageClass must be a valid CSS class name, got "${config.pageClass}"`);
    }
  }
  if (input.language !== undefined) config.language = requireString(input.language, 'language');
  if (input.fontHref !== undefined) {
    config.fontHref = input.fontHref === null ? null : requireUrl(input.fontHref, 'fontHref');
  }
  return Object.freeze(config);
}

function readConfigFile(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    throw new ConfigError(`cannot read config file ${file}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ConfigError(`${file} is not valid JSON: ${error.message}`);
  }
}

/** `./html-render.config.json`, if the working directory has one. */
function discoverConfigFile(cwd) {
  const candidate = path.join(cwd, CONFIG_FILENAME);
  return fs.existsSync(candidate) ? candidate : null;
}

/**
 * Resolve configuration from an object, a path, or the working directory.
 * Returns a frozen config; `organization` is null when none was supplied.
 */
function resolveConfig(input, { cwd = process.cwd() } = {}) {
  if (input && typeof input === 'object') {
    return input[RESOLVED] ? input : normalize(input, '<config object>');
  }
  const file = input ? path.resolve(String(input)) : discoverConfigFile(cwd);
  return file ? normalize(readConfigFile(file), file) : normalize(null, null);
}

/**
 * Assert the config carries an organization, and say exactly what is missing if
 * it does not. Called before rendering anything that names the publisher.
 */
function requireOrganization(config) {
  if (config.organization) return config.organization;
  throw missingOrganization(ORGANIZATION_REQUIRED, {
    source: config.source,
    searched: path.join(process.cwd(), CONFIG_FILENAME),
  });
}

module.exports = {
  rendererVersion: require('../package.json').version,
  CONFIG_FILENAME,
  PAGE_CLASS_TOKEN,
  DEFAULTS,
  ConfigError,
  resolveConfig,
  requireOrganization,
};
