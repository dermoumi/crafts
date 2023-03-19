import type { ClientPlugin, ClientSystemGroups } from "@crafts/client-plugins";
import type { ServerSystemGroups } from "@crafts/server-plugins";
import {
  pluginVariableUpdate,
  pluginThree,
  MeshNode,
} from "@crafts/client-plugins";
import { pluginFixedUpdate } from "@crafts/common-plugins";
import { GameApp } from "@crafts/game-app";

const pluginTestContent: ClientPlugin = ({ startup }) => {
  startup.add({}, ({ command }) => {
    command(({ spawn }) => {
      spawn().add(MeshNode);
    });
  });
};

const game = new GameApp<ClientSystemGroups | ServerSystemGroups>()
  .addPlugin(pluginVariableUpdate)
  .addPlugin(pluginFixedUpdate)
  .addPlugin(pluginTestContent)
  .addPlugin(pluginThree); // <-- Try to keep this one last

game.run();
