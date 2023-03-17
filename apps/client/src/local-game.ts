import type { Plugin } from "./game-app";
import { GameApp } from "./game-app";
import { testPlugin } from "./client-plugins/test";

export type LocalGameGroups = "startup" | "update" | "render";

export type ClientPlugin = Plugin<LocalGameGroups>;

export default class LocalGame extends GameApp<LocalGameGroups> {
  public constructor() {
    super();

    this.addPlugin(testPlugin);
  }

  public run() {
    const startupGroup = this.getSystemGroup("startup");
    startupGroup();
  }
}
