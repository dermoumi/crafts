import type { ClientPlugin, ClientSystemGroups } from "@crafts/client-plugins";
import {
  pluginWorldEntities,
  Input,
  RenderPosition,
  pluginInput,
  pluginVariableUpdate,
  pluginThree,
  MeshNode,
  pluginFixedUpdate,
} from "@crafts/client-plugins";
import type { ServerSystemGroups } from "@crafts/server-plugins";
import { GameApp } from "@crafts/game-app";
import { Component } from "@crafts/ecs";
import {
  GameConfig,
  pluginGameConfig,
  pluginPhysics,
  Position,
} from "@crafts/common-plugins";

class Controllable extends Component {}

class Velocity extends Component {
  public x = 0;
  public y = 0;
  public z = 0;
}

const pluginTestContent: ClientPlugin = ({ onInit }, { update, fixed }) => {
  onInit((world) => {
    world
      .spawn()
      .add(MeshNode)
      .add(RenderPosition)
      .add(Position)
      .add(Velocity)
      .add(Controllable);
  });

  update.add(
    {
      players: [Velocity, Controllable.present()],
      resources: [Input],
    },
    ({ players, resources }) => {
      const [input] = resources;

      for (const [velocity] of players.asComponents()) {
        velocity.x = input.axes.lx * 2;
        velocity.y = -input.axes.ly * 2;
      }
    }
  );

  fixed.add(
    { positions: [Position, Velocity], resources: [GameConfig] },
    ({ positions, resources }) => {
      const [gameConfig] = resources;

      for (const [position, velocity] of positions.asComponents()) {
        position.x += velocity.x * gameConfig.fixedUpdateRate;
        position.y += velocity.y * gameConfig.fixedUpdateRate;
        position.z += velocity.z * gameConfig.fixedUpdateRate;
      }
    }
  );
};

const game = new GameApp<ClientSystemGroups | ServerSystemGroups>()
  .addPlugin(pluginThree)
  .addPlugin(pluginFixedUpdate)
  .addPlugin(pluginVariableUpdate)
  .addPlugin(pluginInput)
  .addPlugin(pluginGameConfig)
  .addPlugin(pluginWorldEntities)
  .addPlugin(pluginPhysics)
  .addPlugin(pluginTestContent);

game.run();
