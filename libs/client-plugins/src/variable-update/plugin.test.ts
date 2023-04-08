import type { ClientSystemGroups } from "..";
import { GameApp } from "@crafts/game-app";
import { pluginVariableUpdate } from "./plugin";
import { VariableUpdate } from "./resources";
import { System } from "@crafts/ecs";

// Vitest's fake timers emulate requestAnimationFrame at 60fps
const REFRESH_RATE = 1000 / 60;

describe("Variable update plugin", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("runs updates periodically", async () => {
    const renderFunc = vi.fn();
    const testSystem = new System({}, renderFunc);

    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginVariableUpdate)
      .addPlugin((_, { update }) => {
        update.addSystem(testSystem);
      });

    await game.run();
    expect(renderFunc).not.toHaveBeenCalled();

    vi.advanceTimersByTime(REFRESH_RATE);
    expect(renderFunc).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(REFRESH_RATE);
    expect(renderFunc).toHaveBeenCalledTimes(2);
  });

  it("stops updates whon the game stops", async () => {
    const renderFunc = vi.fn();
    const testSystem = new System({}, renderFunc);

    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginVariableUpdate)
      .addPlugin((_, { update }) => {
        update.addSystem(testSystem);
      });

    await game.run();
    vi.advanceTimersByTime(REFRESH_RATE);
    expect(renderFunc).toHaveBeenCalledTimes(1);

    await game.stop();
    vi.advanceTimersByTime(REFRESH_RATE * 20);
    expect(renderFunc).toHaveBeenCalledTimes(1);
  });
});

describe("FrameInfo resource", () => {
  beforeAll(() => {
    vi.spyOn(global, "requestAnimationFrame").mockImplementation((cb) => {
      setTimeout(() => {
        cb(performance.now());
      }, REFRESH_RATE);

      return 0;
    });
  });

  afterAll(() => {
    (requestAnimationFrame as any).mockRestore();
  });

  it("caluclates the delta correctly", async () => {
    const renderFunc = vi.fn();
    const testSystem = new System(
      { resources: [VariableUpdate] },
      ({ resources }) => {
        const [update] = resources;
        renderFunc(update.delta);
      }
    );

    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginVariableUpdate)
      .addPlugin((_, { update }) => {
        update.addSystem(testSystem);
      });

    await game.run();

    // First frame has no delta, because the first frametime is undefined
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });

    // Second frame
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });

    expect(renderFunc).toHaveBeenLastCalledWith(
      expect.numberBetween(0.01, 0.03) // Should be 0.016ms on average
    );
  });
});
