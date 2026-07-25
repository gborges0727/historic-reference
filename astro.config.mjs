import { defineConfig } from 'astro/config';

// TODO: settle the repo name. This is the one place a path is configured.
// Repo named <user>.github.io -> '/'. Any other repo name -> '/<repo-name>/'.
// Every internal link uses import.meta.env.BASE_URL, so changing this line is the whole migration.
const base = '/historical-context/';

export default defineConfig({
  base,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
