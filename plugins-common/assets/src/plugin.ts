import type { Plugin } from "@crafts/game-app";
import { setup } from "./systems";

export const pluginAssets: Plugin = (gameApp) => {
  gameApp.addSystem(setup);
};
