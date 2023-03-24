import type { ClientPlugin } from ".";
import { FrameInfo } from "./variable-update";

export const UPDATE_RATE = 1000 / 20;

export const pluginFixedUpdate: ClientPlugin = (_, { fixed, update }) => {
  let accumulatedTime = 0;

  update.add({ resources: [FrameInfo] }, ({ resources }) => {
    const [frameInfo] = resources;

    accumulatedTime += frameInfo.delta * 1000;

    while (accumulatedTime >= UPDATE_RATE) {
      fixed();
      accumulatedTime -= UPDATE_RATE;
    }
  });
};
