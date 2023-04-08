import type { ClientPlugin, ClientSystemGroups } from "@crafts/client-plugins";
import type { ServerSystemGroups } from "@crafts/server-plugins";
import {
  MainCamera,
  Input,
  pluginInput,
  pluginVariableUpdate,
  pluginThree,
  MeshNode,
} from "@crafts/client-plugins";
import { GameApp } from "@crafts/game-app";
import { Component, System, unique } from "@crafts/ecs";
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

const pluginTestContent: ClientPlugin = ({ onInit }, { update }) => {
  onInit((world) => {
    // Ground
    world.spawn().add(Position).addNew(CuboidCollider, 10, 0.1, 10);

    // Main cube
    world
      .spawn()
      .add(Controllable)
      .add(MeshNode)
      .add(Velocity)
      .add(Position, { x: 0, y: 10, z: 0 })
      .addNew(Rotation, 0, 0, 1, "xyz")
      .addNew(CuboidCollider, 0.5, 0.5, 0.5)
      .addNew(DynamicRigidBody);

    const [cameraPosition] = world
      .query(Position, MainCamera.present())
      .getOneAsComponents();
    cameraPosition.y = 2;
    cameraPosition.z = 20;
  });

  update.addSystem(moveControllable);
};

const game = new GameApp<ClientSystemGroups | ServerSystemGroups>()
  .addPlugin(pluginThree)
  .addPlugin(pluginFixedUpdate)
  .addPlugin(pluginVariableUpdate)
  .addPlugin(pluginInput)
  .addPlugin(pluginPhysics)
  .addPlugin(pluginTestContent);

game.run();
