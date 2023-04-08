import type { CommonSystemGroups } from "..";
import { FixedUpdate } from "./resources";
import { GameApp, System } from "@crafts/game-app";
import { pluginFixedUpdate } from "./plugin";

const UPDATE_RATE = 1000 / 30;

async function nextUpdate(times = 1, deviation = 0.25) {
  await new Promise((resolve) => {
    setTimeout(resolve, UPDATE_RATE * (times + deviation));
  });
}

describe("Fixed update plugin", () => {
  it("runs updates periodically", async () => {
    const updateFunc = vi.fn();
    const testSystem = new System({}, updateFunc);

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add(testSystem);
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
    const testSystem = new System({}, updateFunc);

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add(testSystem);
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
    const testSystem = new System({}, updateFunc);

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add(testSystem);
      });

    await game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    await nextUpdate();
    expect(updateFunc).toHaveBeenCalledTimes(1);

    game.stop();

    await nextUpdate(2);
    expect(updateFunc).toHaveBeenCalledTimes(1);
  });

  it("updates depending on the update rate", async () => {
    const updateFunc = vi.fn();
    const testSystem = new System({}, updateFunc);

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add(testSystem);
      });

    await game.run();
    await nextUpdate();

    const fixedUpdate = game.world.resources.get(FixedUpdate);
    fixedUpdate.rateMs *= 2;
    updateFunc.mockClear();

    await nextUpdate(2); // It takes twice as long to trigger one update
    expect(updateFunc).toHaveBeenCalledTimes(1);
  });
});
