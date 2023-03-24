import type { ClientPlugin, ClientSystemGroups } from ".";
import { GameApp } from "@crafts/game-app";
import { pluginVariableUpdate } from "./variable-update";
import { pluginFixedUpdate } from "./fixed-update";
import { GameConfig } from "@crafts/common-plugins";

// Vitest's fake timers emulate requestAnimationFrame at 60fps
const REFRESH_RATE = 1000 / 60;
const UPDATE_RATE = 1000 / 30; // Less false positives than the default 20tps

function advanceTimeBy(ms: number) {
  const duration = ms / REFRESH_RATE < ms ? ms + REFRESH_RATE : ms;

  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

const pluginTestConfig: ClientPlugin = ({ onInit }) => {
  onInit(({ resources }) => {
    resources.add(GameConfig, { fixedUpdateRateMs: UPDATE_RATE });
  });
};

describe("Fixed update plugin", () => {
  beforeAll(() => {
    vi.spyOn(global, "requestAnimationFrame").mockImplementation((cb) => {
      const handle = setTimeout(() => {
        cb(performance.now());
      }, REFRESH_RATE);

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
      .addPlugin(pluginTestConfig)
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
      .addPlugin(pluginTestConfig)
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
      .addPlugin(pluginTestConfig)
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
