import { defineConfig } from 'astro/config';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  site: 'https://hotthoughts.github.io',
  base: isGitHubPages ? '/brew-recipes' : '/',
  output: 'static',
});
