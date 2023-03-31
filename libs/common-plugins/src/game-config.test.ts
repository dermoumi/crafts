import type { CommonSystemGroups } from ".";
import { GameApp } from "@crafts/game-app";
import { GameConfig, pluginGameConfig } from "./game-config";

describe("GameConfig plugin", () => {
  it("adds a GameConfig resource", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginGameConfig);

    await game.run();

    const resource = game.world.resources.get(GameConfig);
    expect(resource).toBeInstanceOf(GameConfig);
  });
});

describe("GameConfig resource", () => {
  it("retrieves the fixed update rate", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginGameConfig);

    await game.run();

    const resource = game.world.resources.get(GameConfig);

    resource.fixedUpdateRateMs = 1000 / 60;
    expect(resource.fixedUpdateRate).toBe(1 / 60);

    resource.fixedUpdateRateMs = 1000 / 30;
    expect(resource.fixedUpdateRate).toBe(1 / 30);
  });
});
