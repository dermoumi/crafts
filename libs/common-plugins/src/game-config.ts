import type { CommonPlugin } from ".";
import { Resource } from "@crafts/ecs";

/**
 * Global config for the game.
 */
export class GameConfig extends Resource {
  public fixedUpdateRateMs = 1000 / 20;
}

/**
 * Manages the game config.
 */
export const pluginGameConfig: CommonPlugin = ({ onInit }) => {
  onInit(({ resources }) => {
    resources.add(GameConfig);
  });
};
