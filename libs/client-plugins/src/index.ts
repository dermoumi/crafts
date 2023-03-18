import type { CommonSystemGroups } from "@crafts/common-plugins";
import type { Plugin } from "@crafts/game-app";

/**
 * System groups used only on the client side
 */
export type ClientSystemGroups = CommonSystemGroups | "update";

/**
 * Plugin type for client game apps
 */
export type ClientPlugin = Plugin<ClientSystemGroups>;

// All the plugins go here
export { pluginVariableUpdate, FrameInfo } from "./variable-update";
