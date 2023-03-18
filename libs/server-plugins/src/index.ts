import type { CommonSystemGroups } from "@crafts/common-plugins";
import type { Plugin } from "@crafts/game-app";

/**
 * System groups used only on the server side
 */
export type ServerSystemGroups = CommonSystemGroups;

/**
 * Plugin type for server game apps
 */
export type ServerPlugins = Plugin<ServerSystemGroups>;
