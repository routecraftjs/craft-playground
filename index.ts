export { default as craftConfig } from './craft.config.js';
import helloWorldRoute from './routes/hello-world.route.js';

// Export all routes as default for craft run
export default [helloWorldRoute];