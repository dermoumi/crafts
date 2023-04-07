import type { CommonPlugin } from ".";
import { GameConfig } from "./game-config";

/**
 * Plugin to run updates at a fixed rate.
 */
export const pluginFixedUpdate: CommonPlugin = ({ onInit }, { fixed }) => {
  let gameConfig: GameConfig;

  onInit(
    ({ resources }) => {
      gameConfig = resources.get(GameConfig);
      let updateRate = gameConfig.fixedUpdateRateMs;

      let accumulatedTime = 0;
      let lastUpdateTime = performance.now();

      // SetTimeout is not accurate by design, and causes an extra update
      // every 8-9 updates. We circumvent this by calling the update function
      // 5 times per updateRate and relying on a more dense accumalted time.
      let updateTimeoutID = setTimeout(
        updateFunc,
        gameConfig.fixedUpdateRateMs / 5
      );

      function updateFunc() {
        updateTimeoutID = setTimeout(updateFunc, updateRate / 5);

        const now = performance.now();
        accumulatedTime += now - lastUpdateTime;
        lastUpdateTime = now;

        while (accumulatedTime >= updateRate) {
          fixed();
          accumulatedTime -= updateRate;

          // Make sure to only update the update rate if it has changed
          // AFTER the update function has been called.
          //
          // This is to keep the behavior consistent between
          // replacing the GameConfig and just changing it.
          updateRate = gameConfig.fixedUpdateRateMs;
        }
      }

      return () => {
        clearTimeout(updateTimeoutID);
      };
    },
    { deps: ["GameConfig"] }
  );

  fixed.add(
    { resources: [GameConfig, GameConfig.changed()] },
    ({ resources }) => {
      gameConfig = resources[0];
    }
  );
};
