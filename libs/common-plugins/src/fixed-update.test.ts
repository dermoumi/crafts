import type { CommonSystemGroups, CommonPlugin } from ".";
import { GameApp } from "@crafts/game-app";
import { pluginFixedUpdate } from "./fixed-update";
import { GameConfig } from "./game-config";

const UPDATE_RATE = 1000 / 30;

const pluginTestConfig: CommonPlugin = ({ onInit }) => {
  onInit(
    ({ resources }) => {
      resources.add(GameConfig, { fixedUpdateRateMs: UPDATE_RATE });
    },
    { name: "GameConfig" }
  );
};

async function nextUpdate(times = 1, deviation = 0.25) {
  await new Promise((resolve) => {
    setTimeout(resolve, UPDATE_RATE * (times + deviation));
  });
}

describe("Fixed update plugin", () => {
  it("runs updates periodically", async () => {
    const updateFunc = vi.fn();

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add({}, updateFunc);
      });

    await game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    await nextUpdate();
    expect(updateFunc).toHaveBeenCalledTimes(1);

    await nextUpdate();
    expect(updateFunc).toHaveBeenCalledTimes(2);
  });

  it("runs updates as many times as needed", async () => {
    const updateFunc = vi.fn();

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add({}, updateFunc);
      });

    await game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    // Even if the setTimeout triggered once (e.g. tab was inactive),
    // the update function should be called 5 times within the timeframe
    await nextUpdate(5);
    expect(updateFunc).toHaveBeenCalledTimes(5);
  });

  it("stops updates whon the game stops", async () => {
    const updateFunc = vi.fn();

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add({}, updateFunc);
      });

    await game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    await nextUpdate();
    expect(updateFunc).toHaveBeenCalledTimes(1);

    game.stop();

    await nextUpdate(2);
    expect(updateFunc).toHaveBeenCalledTimes(1);
  });

  it("updates update rate when the GameConfig is replaced", async () => {
    const updateFunc = vi.fn();

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add({}, updateFunc);
      });

    await game.run();
    await nextUpdate();

    game.world.resources.add(GameConfig, {
      fixedUpdateRateMs: UPDATE_RATE * 2,
    });
    updateFunc.mockClear();

    // The update rate should be updated after the next update
    await nextUpdate();
    expect(updateFunc).toHaveBeenCalledTimes(1);

    await nextUpdate(2); // It takes twice as long to trigger one update
    expect(updateFunc).toHaveBeenCalledTimes(2);
  });

  it("updates update rate when the GameConfig is changed", async () => {
    const updateFunc = vi.fn();

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add({}, updateFunc);
      });

    await game.run();
    await nextUpdate();

    game.world.resources.get(GameConfig).fixedUpdateRateMs = UPDATE_RATE * 2;
    updateFunc.mockClear();

    // The update rate should be updated after the next update
    await nextUpdate();
    expect(updateFunc).toHaveBeenCalledTimes(1);

    await nextUpdate(2); // It takes twice as long to trigger one update
    expect(updateFunc).toHaveBeenCalledTimes(2);
  });
});
