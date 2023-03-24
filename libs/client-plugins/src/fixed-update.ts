import { GameConfig } from "@crafts/common-plugins";
import type { ClientPlugin } from ".";
import { FrameInfo } from "./variable-update";

export const pluginFixedUpdate: ClientPlugin = (_, { fixed, update }) => {
  let accumulatedTime = 0;

  update.add({ resources: [FrameInfo, GameConfig] }, ({ resources }) => {
    const [frameInfo, gameConfig] = resources;

    accumulatedTime += frameInfo.delta * 1000;

    while (accumulatedTime >= gameConfig.fixedUpdateRateMs) {
      fixed();
      accumulatedTime -= gameConfig.fixedUpdateRateMs;
    }
  });
};
