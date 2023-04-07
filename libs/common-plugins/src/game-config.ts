import type { CommonPlugin } from ".";
import { Resource } from "@crafts/ecs";

/**
 * Global config for the game.
 */
export class GameConfig extends Resource {
  public fixedUpdateRateMs = 1000 / 30;

  public get fixedUpdateRate() {
    return this.fixedUpdateRateMs / 1000;
  }
}

/**
 * Manages the game config.
 */
export const pluginGameConfig: CommonPlugin = ({ onInit }) => {
  onInit(
    ({ resources }) => {
      resources.add(GameConfig);
    },
    { name: "GameConfig" }
  );
};
