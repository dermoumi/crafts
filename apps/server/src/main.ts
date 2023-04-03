import type { CommonSystemGroups } from "@crafts/common-plugins";
import { pluginPhysics } from "@crafts/common-plugins";
import { GameApp } from "@crafts/game-app";

const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);

await game.run();

// Clean up when the script is reloaded for dev mode
if (import.meta.hot) {
  import.meta.hot.on("vite:beforeFullReload", async () => {
    await game.stop();
  });
}
