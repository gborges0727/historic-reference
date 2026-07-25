import { defineConfig } from 'astro/config';

// Cloudflare Pages serves a project at the root of its own subdomain, so no subpath.
// GitHub Pages would need '/historic-reference/' instead, because a project repo there
// serves from a subpath. Every internal link uses import.meta.env.BASE_URL, so this line
// and `site` below are the whole migration between the two.
const base = '/';

export default defineConfig({
  // The deployed origin. Workers serves at <name>.<account-subdomain>.workers.dev, and
  // the account subdomain is gbborges. Only canonical URLs and any future sitemap read
  // this; the base above is what actually shapes the links in the build.
  site: 'https://historic-reference.gbborges.workers.dev',
  base,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
