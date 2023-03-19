import type { ClientPlugin, ClientSystemGroups } from "@crafts/client-plugins";
import {
  FrameInfo,
  KeyboardInput,
  RenderPosition,
  pluginKeyboardInput,
  pluginVariableUpdate,
  pluginThree,
  MeshNode,
} from "@crafts/client-plugins";
import type { ServerSystemGroups } from "@crafts/server-plugins";
import { pluginFixedUpdate } from "@crafts/common-plugins";
import { GameApp } from "@crafts/game-app";
import { Component } from "@crafts/ecs";

class Controllable extends Component {}

const pluginTestContent: ClientPlugin = ({ startup, update }) => {
  startup.add({}, ({ command }) => {
    command(({ spawn }) => {
      spawn().add(MeshNode).add(RenderPosition).add(Controllable);
    });
  });

  update.add(
    {
      players: [RenderPosition, Controllable.present()],
      resources: [KeyboardInput, FrameInfo],
    },
    ({ players, resources }) => {
      const [keyboard, frameInfo] = resources;

      for (const [position] of players.asComponents()) {
        if (keyboard.isDown("ArrowUp")) {
          position.y += 2 * frameInfo.delta;
        }

        if (keyboard.isDown("ArrowDown")) {
          position.y -= 2 * frameInfo.delta;
        }

        if (keyboard.isDown("ArrowLeft")) {
          position.x -= 2 * frameInfo.delta;
        }

        if (keyboard.isDown("ArrowRight")) {
          position.x += 2 * frameInfo.delta;
        }
      }
    }
  );
};

const game = new GameApp<ClientSystemGroups | ServerSystemGroups>()
  .addPlugin(pluginTestContent)
  .addPlugin(pluginKeyboardInput)
  .addPlugin(pluginThree)
  .addPlugin(pluginFixedUpdate)
  .addPlugin(pluginVariableUpdate);

game.run();
