import type { CommonPlugin } from "..";
import { GameConfig } from "./resources";

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
