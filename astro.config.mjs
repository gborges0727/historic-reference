import { defineConfig } from 'astro/config';

// Cloudflare Pages serves a project at the root of its own subdomain, so no subpath.
// GitHub Pages would need '/historic-reference/' instead, because a project repo there
// serves from a subpath. Every internal link uses import.meta.env.BASE_URL, so this line
// and `site` below are the whole migration between the two.
const base = '/';

export default defineConfig({
  // `site` is deliberately unset until the first deploy reports the real origin.
  // Workers serves at <name>.<account-subdomain>.workers.dev and the subdomain is not
  // knowable from here, so guessing it would put a wrong canonical URL in the build.
  // Nothing reads Astro.site today and there is no sitemap integration, so unset is
  // harmless and a wrong value would not be.
  base,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
