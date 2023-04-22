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
        .with(mountRenderer)
        .with(updateCameraAsepectRatio)
        .with(nestNodeToMainScene)
        .with(nestNodeToParent)
        .with(resizeRenderer)
        .with(addInitialPosition)
        .with(updatePositionTween)
        .with(tweenPosition)
        .with(addInitialRotation)
        .with(updateRotationTween)
        .with(tweenRotation)
        .with(renderScene)
    );
};
