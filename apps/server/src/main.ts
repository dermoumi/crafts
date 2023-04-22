import { pluginPhysics } from "@crafts/plugin-physics";
import { GameApp } from "@crafts/game-app";

const game = new GameApp().addPlugin(pluginPhysics);

await game.run();

// Clean up when the script is reloaded for dev mode
if (import.meta.hot) {
  import.meta.hot.on("vite:beforeFullReload", async () => {
    await game.stop();
  });
}
