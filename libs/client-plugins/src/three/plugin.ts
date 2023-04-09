import type { Plugin } from "@crafts/game-app";
import { SystemSet } from "@crafts/game-app";
import {
  addInitialPosition,
  addInitialRotation,
  mountRenderer,
  nestNodeToMainScene,
  nestNodeToParent,
  renderScene,
  resizeRenderer,
  setup,
  tweenPosition,
  tweenRotation,
  updateCameraAsepectRatio,
  updatePositionTween,
  updateRotationTween,
} from "./systems";

/**
 * Plugin to manage ThreeJS scenes.
 */
export const pluginThree: Plugin = (gameApp) => {
  gameApp
    .addStartupSystem(setup)
    .addSystem(
      new SystemSet()
        .add(mountRenderer)
        .add(updateCameraAsepectRatio)
        .add(nestNodeToMainScene)
        .add(nestNodeToParent)
        .add(resizeRenderer)
        .add(addInitialPosition)
        .add(updatePositionTween)
        .add(tweenPosition)
        .add(addInitialRotation)
        .add(updateRotationTween)
        .add(tweenRotation)
        .add(renderScene)
    );
};
