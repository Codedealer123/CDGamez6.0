// Automatically import all Svelte files in src/routes
const routeFiles = import.meta.glob('./routes/*.svelte', { eager: true });

/**
 * @type {Record<string, unknown>}
 */
const routes = {};

for (const path in routeFiles) {
  // Extract the filename without extension
  const match = path.match(/\.\/routes\/(.*)\.svelte$/);
  if (match) {
    const name = match[1].toLowerCase();
    // Type assertion to satisfy TypeScript/JS tooling
    const component = /** @type {{ default: unknown }} */ (routeFiles[path]).default;
    if (name === 'home') {
      routes['/'] = component;
    } else if (name === 'notfound') {
      routes['*'] = component;
    } else {
      routes[`/${name}`] = component;
    }
  }
}

export default routes;