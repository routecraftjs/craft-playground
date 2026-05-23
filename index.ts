export { craftConfig } from "./craft.config.js";
import helloWorldRoute from "./capabilities/hello-world.js";

// Export all capabilities as default for craft run
export default [helloWorldRoute];
