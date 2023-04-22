import type { Plugin } from "@crafts/game-app";

import {
  CameraNode,
  MainScene,
  SceneNode,
  MainCamera,
  pluginThree,
  MeshNode,
} from "@crafts/plugin-three";
import { pluginVariableUpdate } from "@crafts/client-plugins";
import { Input, pluginInput } from "@crafts/plugin-input";
import { GameApp, System } from "@crafts/game-app";
import { Component, unique } from "@crafts/ecs";
import {
  pluginPhysics,
  Position,
  Velocity,
  Rotation,
  DynamicRigidBody,
  CuboidCollider,
  pluginFixedUpdate,
} from "@crafts/common-plugins";

@unique
class Controllable extends Component {}

const moveControllable = new System(
  {
    players: [Velocity, Controllable.present()],
    resources: [Input],
  },
  ({ players, resources }) => {
    const [input] = resources;

    const { lx, ly } = input.axes;

    for (const [velocity] of players.asComponents()) {
      velocity.x = lx * 5;

      if (Math.abs(ly) > 0.1) {
        velocity.y = -ly * 5;
      }
    }
  }
);

const setup = new System({}, ({ command }) => {
  command
    // Main camera
    .spawn((e) =>
      e.add(CameraNode).add(Position, { y: 2, z: 20 }).add(MainCamera)
    )
    // Main scene
    .spawn((e) => e.add(SceneNode).add(MainScene))
    // Ground
    .spawn((e) => e.add(Position).addNew(CuboidCollider, 10, 0.1, 10))
    // Main cube
    .spawn((e) =>
      e
        .add(Controllable)
        .add(MeshNode)
        .add(Velocity)
        .add(Position, { x: 0, y: 10, z: 0 })
        .addNew(Rotation, 0, 0, 1, "xyz")
        .addNew(CuboidCollider, 0.5, 0.5, 0.5)
        .addNew(DynamicRigidBody)
    );
});

const pluginTestContent: Plugin = (gameApp) => {
  gameApp.addStartupSystem(setup).addSystem(moveControllable);
};

const game = new GameApp()
  .addPlugin(pluginThree)
  .addPlugin(pluginFixedUpdate)
  .addPlugin(pluginVariableUpdate)
  .addPlugin(pluginInput)
  .addPlugin(pluginPhysics)
  .addPlugin(pluginTestContent);

game.run();
