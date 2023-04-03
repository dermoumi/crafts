import type { ClientPlugin, ClientSystemGroups } from ".";
import { pluginWorldEntities, RenderPosition } from ".";
import { GameApp } from "@crafts/game-app";
import { FrameInfo } from "./variable-update";
import { GameConfig, Position, Rotation } from "@crafts/common-plugins";
import { RenderRotation } from "./world-entities";

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

describe("RenderPosition animation", () => {
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

describe("RenderRotation animation", () => {
  it("matches the original rotation when a Rotation is added", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginWorldEntities);

    await game.run();

    const entity = game.world
      .spawn()
      .add(RenderRotation)
      .add(Rotation, { x: 1, y: 2, z: 3, w: 4 });

    game.groupsProxy.preupdate();

    const renderRotation = entity.get(RenderRotation);
    expect(renderRotation).toEqual({
      x: 1,
      y: 2,
      z: 3,
      w: 4,
      lastX: 1,
      lastY: 2,
      lastZ: 3,
      lastW: 4,
      progress: 1,
    });
  });

  it("resets the animation when the rotation changes", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginWorldEntities);

    await game.run();

    const entity = game.world
      .spawn()
      .add(RenderRotation)
      .add(Rotation, { x: 1, y: 2, z: 3, w: 4 });

    game.groupsProxy.preupdate();

    const rotation = entity.get(Rotation);
    Object.assign(rotation, { x: 2, y: 3, z: 4, w: 5 });

    game.groupsProxy.preupdate();

    const renderRotation = entity.get(RenderRotation);
    expect(renderRotation).toEqual({
      x: 1.5,
      y: 2.5,
      z: 3.5,
      w: 4.5,
      lastX: 1,
      lastY: 2,
      lastZ: 3,
      lastW: 4,
      progress: 0.5,
    });
  });

  it("animates rotation correctly", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginWorldEntities);

    const entity = game.world.spawn().add(Rotation).add(RenderRotation);

    await game.run();

    // We need to set the value after the initialization
    const rotation = entity.get(Rotation);
    Object.assign(rotation, { x: 10, y: 100, z: 1000, w: 2 });

    game.groupsProxy.preupdate();

    const renderRotation = entity.get(RenderRotation);
    expect(renderRotation).toEqual({
      x: 5,
      y: 50,
      z: 500,
      w: 1.5,
      lastX: 0,
      lastY: 0,
      lastZ: 0,
      lastW: 1,
      progress: 0.5,
    });
  });
});
