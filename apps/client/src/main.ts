import type { ClientPlugin, ClientSystemGroups } from "@crafts/client-plugins";
import {
  FrameInfo,
  Input,
  RenderPosition,
  pluginInput,
  pluginVariableUpdate,
  pluginThree,
  MeshNode,
} from "@crafts/client-plugins";
import type { ServerSystemGroups } from "@crafts/server-plugins";
import { pluginFixedUpdate } from "@crafts/common-plugins";
import { GameApp } from "@crafts/game-app";
import { Component } from "@crafts/ecs";

class Controllable extends Component {}

const pluginTestContent: ClientPlugin = ({ onInit }, { update }) => {
  onInit((world) => {
    world.spawn().add(MeshNode).add(RenderPosition).add(Controllable);
  });

  update.add(
    {
      players: [RenderPosition, Controllable.present()],
      resources: [Input, FrameInfo],
    },
    ({ players, resources }) => {
      const [input, frameInfo] = resources;

      for (const [position] of players.asComponents()) {
        position.x += input.axes.lx * 2 * frameInfo.delta;
        position.y -= input.axes.ly * 2 * frameInfo.delta;
      }
    }
  );
};

const game = new GameApp<ClientSystemGroups | ServerSystemGroups>()
  .addPlugin(pluginTestContent)
  .addPlugin(pluginInput)
  .addPlugin(pluginThree)
  .addPlugin(pluginFixedUpdate)
  .addPlugin(pluginVariableUpdate);

game.run();
