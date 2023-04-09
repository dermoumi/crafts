import type { Plugin } from "@crafts/game-app";
import { setup } from "./systems";

/**
 * Plugin to run updates at a variable, framerate.
 */
export const pluginVariableUpdate: Plugin = (gameApp) => {
  gameApp.addStartupSystem(setup);
};
