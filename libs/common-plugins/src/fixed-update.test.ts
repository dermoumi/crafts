import type { CommonSystemGroups } from ".";
import { GameApp } from "@crafts/game-app";
import { pluginFixedUpdate, UPDATE_RATE } from "./fixed-update";

describe("Fixed update plugin", () => {
  const performanceNow = vi.spyOn(performance, "now");

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
    performanceNow.mockRestore();
  });

  it("runs updates periodically", () => {
    const updateFunc = vi.fn();

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginFixedUpdate)
      .addPlugin(({ fixed }) => {
        fixed.add({}, updateFunc);
      });

    performanceNow.mockReturnValue(0);

    game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    performanceNow.mockReturnValue(UPDATE_RATE);
    vi.advanceTimersByTime(UPDATE_RATE);
    expect(updateFunc).toHaveBeenCalledTimes(1);

    performanceNow.mockReturnValue(UPDATE_RATE * 2);
    vi.advanceTimersByTime(UPDATE_RATE);
    expect(updateFunc).toHaveBeenCalledTimes(2);
  });

  it("runs updates as many times as needed", () => {
    const updateFunc = vi.fn();

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginFixedUpdate)
      .addPlugin(({ fixed }) => {
        fixed.add({}, updateFunc);
      });

    performanceNow.mockReturnValue(0);

    game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    // Even if the setTimeout triggered once (e.g. tab was inactive),
    // the update function should be called 5 times within the timeframe
    performanceNow.mockReturnValue(UPDATE_RATE * 5);
    vi.advanceTimersByTime(UPDATE_RATE);
    expect(updateFunc).toHaveBeenCalledTimes(5);
  });

  it("stops updates whon the game stops", () => {
    const updateFunc = vi.fn();

    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginFixedUpdate)
      .addPlugin(({ fixed }) => {
        fixed.add({}, updateFunc);
      });

    performanceNow.mockReturnValue(0);

    game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    performanceNow.mockReturnValue(UPDATE_RATE);
    vi.advanceTimersByTime(UPDATE_RATE);
    expect(updateFunc).toHaveBeenCalledTimes(1);

    game.stop();

    performanceNow.mockReturnValue(UPDATE_RATE * 20);
    vi.advanceTimersByTime(UPDATE_RATE * 20);
    expect(updateFunc).toHaveBeenCalledTimes(1);
  });
});
