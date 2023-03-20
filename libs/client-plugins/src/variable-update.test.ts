import type { ClientSystemGroups } from ".";
import { GameApp } from "@crafts/game-app";
import { pluginVariableUpdate, FrameInfo } from "./variable-update";

// Vitest's fake timers emulate requestAnimationFrame at 60fps
const REFRESH_RATE = 1000 / 60;

describe("Variable update plugin", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("runs updates periodically", () => {
    const renderFunc = vi.fn();

    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginVariableUpdate)
      .addPlugin(({ update }) => {
        update.add({}, renderFunc);
      });

    expect(renderFunc).not.toHaveBeenCalled();

    game.run();
    expect(renderFunc).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(REFRESH_RATE);
    expect(renderFunc).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(REFRESH_RATE);
    expect(renderFunc).toHaveBeenCalledTimes(3);
  });

  it("stops updates whon the game stops", () => {
    const renderFunc = vi.fn();

    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginVariableUpdate)
      .addPlugin(({ update }) => {
        update.add({}, renderFunc);
      });

    game.run();
    vi.advanceTimersByTime(REFRESH_RATE);
    expect(renderFunc).toHaveBeenCalledTimes(2);

    game.stop();
    vi.advanceTimersByTime(REFRESH_RATE * 20);
    expect(renderFunc).toHaveBeenCalledTimes(2);
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

    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginVariableUpdate)
      .addPlugin(({ update }) => {
        update.add({ resources: [FrameInfo] }, ({ resources }) => {
          const [frameInfo] = resources;

          renderFunc(frameInfo.delta);
        });
      });

    game.run();

    // First frame has no delta, because the first frametime is undefined
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });

    // Second frame
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });

    expect(renderFunc).toHaveBeenLastCalledWith(
      expect.numberBetween(0.01, 0.02) // Should be 0.016ms on average
    );
  });
});