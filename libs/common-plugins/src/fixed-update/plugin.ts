import type { Plugin } from "@crafts/game-app";
import { setup } from "./systems";

export const pluginFixedUpdate: Plugin = (app) => {
  app.addStartupSystem(setup);
};
