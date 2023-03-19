import type { ClientSystemGroups } from "@crafts/client-plugins";
import type { ServerSystemGroups } from "@crafts/server-plugins";
import { pluginVariableUpdate, pluginThree } from "@crafts/client-plugins";
import { pluginFixedUpdate } from "@crafts/common-plugins";
import { GameApp } from "@crafts/game-app";

const game = new GameApp<ClientSystemGroups | ServerSystemGroups>()
  .addPlugin(pluginVariableUpdate)
  .addPlugin(pluginFixedUpdate)
  .addPlugin(pluginThree);

game.run();
