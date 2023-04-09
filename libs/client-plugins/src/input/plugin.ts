import type { Plugin } from "@crafts/game-app";
import { setup, updateInput } from "./systems";

/**
 * Plugin to track the input state and expose it as a resource.
 */
export const pluginInput: Plugin = (gameApp) => {
  gameApp.addStartupSystem(setup).addSystem(updateInput);
};
