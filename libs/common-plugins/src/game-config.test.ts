import type { CommonSystemGroups } from ".";
import { GameApp } from "@crafts/game-app";
import { GameConfig, pluginGameConfig } from "./game-config";

describe("GameConfig plugin", () => {
  it("adds a GameConfig resource", () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginGameConfig);

    game.run();

    const resource = game.world.resources.get(GameConfig);
    expect(resource).toBeInstanceOf(GameConfig);
  });
});
