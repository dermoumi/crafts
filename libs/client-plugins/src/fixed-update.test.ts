import type { ClientSystemGroups } from ".";
import { GameApp } from "@crafts/game-app";
import { pluginVariableUpdate } from "./variable-update";
import { pluginFixedUpdate, UPDATE_RATE } from "./fixed-update";

// Vitest's fake timers emulate requestAnimationFrame at 60fps
const REFRESH_RATE = 1000 / 60;

function advanceTimeBy(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, nearestMultipleOf(ms, REFRESH_RATE));
  });
}

function nearestMultipleOf(num: number, multiple: number) {
  return Math.ceil(Math.floor(num) / Math.floor(multiple)) * multiple;
}

describe("Fixed update plugin", () => {
  beforeAll(() => {
    vi.spyOn(global, "requestAnimationFrame").mockImplementation((cb) => {
      const handle = setTimeout(() => {
        cb(performance.now());
      }, Math.floor(REFRESH_RATE));

      return handle as unknown as number;
    });

    vi.spyOn(global, "cancelAnimationFrame").mockImplementation(clearTimeout);
  });

  afterAll(() => {
    (requestAnimationFrame as any).mockRestore();
  });

  it("runs updates periodically", async () => {
    const updateFunc = vi.fn();

    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginFixedUpdate)
      .addPlugin(pluginVariableUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add({}, updateFunc);
      });

    game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    await advanceTimeBy(UPDATE_RATE);
    expect(updateFunc).toHaveBeenCalledTimes(1);

    await advanceTimeBy(UPDATE_RATE);
    expect(updateFunc).toHaveBeenCalledTimes(2);
  });

  it("runs updates as many times as needed", async () => {
    const updateFunc = vi.fn();

    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginVariableUpdate)
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add({}, updateFunc);
      });

    game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    // Even if the setTimeout triggered once (e.g. tab was inactive),
    // the update function should be called 5 times within the timeframe
    await advanceTimeBy(UPDATE_RATE * 5);
    expect(updateFunc).toHaveBeenCalledTimes(5);
  });

  it("stops updates whon the game stops", async () => {
    const updateFunc = vi.fn();

    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginVariableUpdate)
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add({}, updateFunc);
      });

    game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    await advanceTimeBy(UPDATE_RATE);
    expect(updateFunc).toHaveBeenCalledTimes(1);

    game.stop();

    await advanceTimeBy(UPDATE_RATE * 2);
    expect(updateFunc).toHaveBeenCalledTimes(1);
  });
});
