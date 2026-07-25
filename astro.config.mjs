import { defineConfig } from 'astro/config';

// The repo is gborges0727/historic-reference, so Pages serves it from /historic-reference/.
// A repo named <user>.github.io would serve from '/' instead. Every internal link uses
// import.meta.env.BASE_URL, so this line and `site` below are the whole migration if it moves.
const base = '/historic-reference/';

export default defineConfig({
  site: 'https://gborges0727.github.io',
  base,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
