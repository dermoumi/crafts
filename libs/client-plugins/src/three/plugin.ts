import type { ClientPlugin } from "..";
import { Position } from "@crafts/common-plugins";
import { CameraNode, MainCamera, MainScene, SceneNode } from "./components";
import { WindowResized } from "./events";
import { Renderer } from "./resources";
import {
  addInitialPosition,
  addInitialRotation,
  mountRenderer,
  nestNodeToMainScene,
  nestNodeToParent,
  renderScene,
  resizeRenderer,
  tweenPosition,
  tweenRotation,
  updateCameraAsepectRatio,
  updatePositionTween,
  updateRotationTween,
} from "./systems";

/**
 * Plugin to manage ThreeJS scenes.
 */
export const pluginThree: ClientPlugin = (
  { onInit },
  { update, postupdate }
) => {
  // Listen for window resize events
  onInit((world) => {
    const resizeListener = () => {
      world.dispatch(WindowResized);
    };

    window.addEventListener("resize", resizeListener, { passive: true });

    return () => {
      window.removeEventListener("resize", resizeListener);
    };
  });

  // Spawn the initial scene and camera
  onInit((world) => {
    world.spawn().add(CameraNode).add(Position, { z: 5 }).add(MainCamera);

    world.spawn().add(SceneNode).add(MainScene);
  });

  // Add the main renderer
  onInit(({ resources }) => {
    resources.addNew(Renderer, document.body);

    return () => {
      const { renderer } = resources.get(Renderer);
      renderer.domElement.remove();
      renderer.dispose();
    };
  });

  update
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
    .add(tweenRotation);

  postupdate.add(renderScene);
};
