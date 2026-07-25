import { defineConfig } from 'astro/config';

// The repo is gborges0727/historic-reference, so Pages serves it from /historic-reference/.
// A repo named <user>.github.io would serve from '/' instead. Every internal link uses
// import.meta.env.BASE_URL, so this line and `site` below are the whole migration if it moves.
const base = '/historic-reference/';

export default defineConfig({
  // The account's user site (gborges0727.github.io) carries the custom domain
  // gabeborges.com, and GitHub redirects the github.io host to it, so the canonical
  // origin for this project's pages is the custom domain rather than github.io.
  site: 'https://gabeborges.com',
  base,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
