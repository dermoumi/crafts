import type { ClientPlugin, ClientSystemGroups } from ".";
import { GameApp } from "@crafts/game-app";
import { FrameInfo } from "./variable-update";
import { pluginFixedUpdate } from "./fixed-update";
import { GameConfig } from "@crafts/common-plugins";

// Vitest's fake timers emulate requestAnimationFrame at 60fps
const REFRESH_RATE = 1000 / 60;
const UPDATE_RATE = 1000 / 30; // Less false positives than the default 20tps

const pluginTestConfig: ClientPlugin = ({ onInit }) => {
  onInit(({ resources }) => {
    resources
      .add(GameConfig, { fixedUpdateRateMs: UPDATE_RATE })
      .add(FrameInfo, { delta: REFRESH_RATE / 1000 });
  });
};

describe("Fixed update plugin", () => {
  it("runs updates periodically", () => {
    const updateFunc = vi.fn();

    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add({}, updateFunc);
      });

    game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    game.groupsProxy.update();
    game.groupsProxy.update();
    expect(updateFunc).toHaveBeenCalledTimes(1);

    game.groupsProxy.update();
    game.groupsProxy.update();
    expect(updateFunc).toHaveBeenCalledTimes(2);
  });

  it("runs updates as many times as needed", () => {
    const updateFunc = vi.fn();

    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginFixedUpdate)
      .addPlugin((_, { fixed }) => {
        fixed.add({}, updateFunc);
      });

    game.run();
    expect(updateFunc).not.toHaveBeenCalled();

    for (let i = 0; i < 10; ++i) {
      game.groupsProxy.update();
    }

    expect(updateFunc).toHaveBeenCalledTimes(5);
  });
});
