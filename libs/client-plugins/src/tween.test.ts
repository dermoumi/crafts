import type { ClientPlugin, ClientSystemGroups } from ".";
import { GameApp } from "@crafts/game-app";
import { FrameInfo } from "./variable-update";
import { GameConfig, Position, Rotation } from "@crafts/common-plugins";
import { TweenPosition, TweenRotation, pluginTween } from "./tween";
import { SceneNode } from "./three";

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
      .addPlugin(pluginTween);

    await game.run();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Position, { x: 10, y: 100, z: 1000 });
    game.groupsProxy.preupdate();

    const { node } = entity.get(SceneNode);
    expect(node.position).toEqual({ x: 10, y: 100, z: 1000 });
    expect(entity.has(TweenPosition)).toBe(false);
  });

  it("resets the animation when the position changes", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginTween);

    await game.run();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Position, { x: 10, y: 100, z: 1000 });

    game.groupsProxy.preupdate();

    const position = entity.get(Position);
    Object.assign(position, { x: 20, y: 200, z: 2000 });

    game.groupsProxy.preupdate();

    const tween = entity.tryGet(TweenPosition);
    expect(tween).toBeDefined();
    expect(tween).toEqual({
      fromX: 10,
      fromY: 100,
      fromZ: 1000,
      progress: 0.5,
    });
  });

  it("animates position correctly", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginTween);

    const entity = game.world.spawn().add(Position).add(SceneNode);

    await game.run();

    // We need to set the value after the initialization
    const position = entity.get(Position);
    Object.assign(position, { x: 10, y: 100, z: 1000 });

    game.groupsProxy.preupdate();

    const { node } = entity.get(SceneNode);
    const tween = entity.get(TweenPosition);
    expect(node.position).toEqual({ x: 5, y: 50, z: 500 });
    expect(tween).toEqual({ fromX: 0, fromY: 0, fromZ: 0, progress: 0.5 });
  });
});

describe("RenderRotation animation", () => {
  it("matches the original rotation when a Rotation is added", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginTween);

    await game.run();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Rotation, { x: 1, y: 2, z: 3, w: 4 });

    game.groupsProxy.preupdate();

    const { node } = entity.get(SceneNode);
    expect(node.quaternion.toArray()).toEqual([1, 2, 3, 4]);
    expect(entity.has(TweenRotation)).toBe(false);
  });

  it("resets the animation when the rotation changes", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginTween);

    await game.run();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Rotation, { x: 1, y: 2, z: 3, w: 4 });

    game.groupsProxy.preupdate();

    const rotation = entity.get(Rotation);
    Object.assign(rotation, { x: 2, y: 3, z: 4, w: 5 });

    game.groupsProxy.preupdate();

    const tween = entity.get(TweenRotation);
    expect(tween).toBeDefined();
    expect(tween).toEqual({
      fromX: 1,
      fromY: 2,
      fromZ: 3,
      fromW: 4,
      progress: 0.5,
    });
  });

  it("animates rotation correctly", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginTween);

    const entity = game.world.spawn().add(Rotation).add(SceneNode);

    await game.run();

    // We need to set the value after the initialization
    const rotation = entity.get(Rotation);
    Object.assign(rotation, { x: 10, y: 100, z: 1000, w: 2 });

    game.groupsProxy.preupdate();

    const { node } = entity.get(SceneNode);
    const tween = entity.get(TweenRotation);
    expect(node.quaternion.toArray()).toEqual([5, 50, 500, 1.5]);
    expect(tween).toEqual({
      fromX: 0,
      fromY: 0,
      fromZ: 0,
      fromW: 1,
      progress: 0.5,
    });
  });
});
