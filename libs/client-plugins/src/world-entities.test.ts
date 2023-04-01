import type { ClientPlugin, ClientSystemGroups } from ".";
import { pluginWorldEntities, RenderPosition } from ".";
import { GameApp } from "@crafts/game-app";
import { FrameInfo } from "./variable-update";
import { GameConfig, Position } from "@crafts/common-plugins";

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

describe("World entities render position animation", () => {
  it("matches the original position when a Position is added", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginWorldEntities);

    await game.run();

    const entity = game.world
      .spawn()
      .add(RenderPosition)
      .add(Position, { x: 10, y: 100, z: 1000 });

    game.groupsProxy.preupdate();

    const renderPosition = entity.get(RenderPosition);
    expect(renderPosition).toEqual({
      x: 10,
      y: 100,
      z: 1000,
      lastX: 10,
      lastY: 100,
      lastZ: 1000,
      progress: 1,
    });
  });

  it("resets the animation when the position changes", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginWorldEntities);

    await game.run();

    const entity = game.world
      .spawn()
      .add(RenderPosition)
      .add(Position, { x: 10, y: 100, z: 1000 });

    game.groupsProxy.preupdate();

    const position = entity.get(Position);
    Object.assign(position, { x: 20, y: 200, z: 2000 });

    game.groupsProxy.preupdate();

    const renderPosition = entity.get(RenderPosition);
    expect(renderPosition).toEqual({
      x: 15,
      y: 150,
      z: 1500,
      lastX: 10,
      lastY: 100,
      lastZ: 1000,
      progress: 0.5,
    });
  });

  it("animates position correctly", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginWorldEntities);

    const entity = game.world.spawn().add(Position).add(RenderPosition);

    await game.run();

    // We need to set the value after the initialization
    const position = entity.get(Position);
    Object.assign(position, { x: 10, y: 100, z: 1000 });

    game.groupsProxy.preupdate();

    const renderPosition = entity.get(RenderPosition);
    expect(renderPosition).toEqual({
      x: 5,
      y: 50,
      z: 500,
      lastX: 0,
      lastY: 0,
      lastZ: 0,
      progress: 0.5,
    });
  });
});
