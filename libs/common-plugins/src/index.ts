import type { Plugin } from "@crafts/game-app";

/**
 * System groups used for both the client and the server
 */
export type CommonSystemGroups = "startup" | "fixed" | "cleanup";

/**
 * Plugin type for both the server and client.
 */
export type CommonPlugin = Plugin<CommonSystemGroups>;

// All the plugins go here:
export { pluginFixedUpdate } from "./fixed-update";
