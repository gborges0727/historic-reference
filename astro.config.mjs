import { defineConfig } from 'astro/config';

// Cloudflare Pages serves a project at the root of its own subdomain, so no subpath.
// GitHub Pages would need '/historic-reference/' instead, because a project repo there
// serves from a subpath. Every internal link uses import.meta.env.BASE_URL, so this line
// and `site` below are the whole migration between the two.
const base = '/';

export default defineConfig({
  site: 'https://historic-reference.pages.dev',
  base,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
