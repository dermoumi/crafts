import type { PerspectiveCamera, Renderer as ThreeJsRenderer } from "three";
import { System } from "@crafts/game-app";
import { Renderer, WindowResizeHandler } from "./resources";
import {
  CameraNode,
  ChildNode,
  MainCamera,
  MainScene,
  Node,
  SceneNode,
  TweenPosition,
  TweenRotation,
} from "./components";
import { FixedUpdate, Position, Rotation } from "@crafts/common-plugins";
import { VariableUpdate } from "@crafts/plugin-variable-update";
import { WindowResized } from "./events";

/**
 * Sets up the plugin.
 */
export const setup = new System({}, ({ command }) => {
  command(({ addNewResource, emit }) => {
    addNewResource(Renderer, document.body);
    addNewResource(WindowResizeHandler, () => emit(WindowResized));
  });
});

/**
 * Fit a renderer inside its container.
 *
 * @param renderer - The renderer to fit
 * @param container - The renderer's container
 */
function fitContainer(renderer: ThreeJsRenderer, container: HTMLElement): void {
  const { clientWidth, clientHeight } = container;

  renderer.setSize(clientWidth, clientHeight);
}

/**
 * Fix the aspect ratio of a perspective camera.
 *
 * @param renderer - The renderer to fit the camera to
 * @param camera - The camera to fix
 */
function fitCameraAsepectRatio(
  renderer: ThreeJsRenderer,
  camera: PerspectiveCamera
): void {
  const { width, height } = renderer.domElement;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

/**
 * When a MainRenderer is added, create a new ThreeJS renderer and
 * mount it to its element.
 */
export const mountRenderer = new System(
  { resources: [Renderer, Renderer.added()] },
  ({ resources }) => {
    const [{ renderer, element }] = resources;

    element.append(renderer.domElement);
    fitContainer(renderer, element);
  }
);

/**
 * When the window is resized, update the renderer size to fit.
 */
export const resizeRenderer = new System(
  {
    resources: [Renderer],
    camera: [CameraNode, MainCamera.present()],
    event: WindowResized,
  },
  ({ resources, camera }) => {
    const [{ renderer, element }] = resources;
    const [{ node: cameraNode }] = camera.getOneAsComponents();

    fitContainer(renderer, element);
    fitCameraAsepectRatio(renderer, cameraNode);
  }
);

/**
 * When a camera is set as main camera, update its aspect ratio.
 */
export const updateCameraAsepectRatio = new System(
  {
    resources: [Renderer],
    camera: [CameraNode, MainCamera.added()],
  },
  ({ resources, camera }) => {
    const [{ renderer }] = resources;
    const [{ node: cameraNode }] = camera.getOneAsComponents();

    fitCameraAsepectRatio(renderer, cameraNode);
  }
);

/**
 * When a node is added nest it to the main scene.
 */
export const nestNodeToMainScene = new System(
  {
    nodes: [Node, Node.added(), ChildNode.notPresent()],
    scene: [SceneNode, MainScene.present()],
  },
  ({ nodes, scene }) => {
    const [{ node: sceneNode }] = scene.getOneAsComponents();

    for (const [{ node }] of nodes.asComponents()) {
      if (sceneNode === node) continue;
      sceneNode.add(node);
    }
  }
);

/**
 * When a Node is added, and it has a ChildNode, nest it to its parent.
 */
export const nestNodeToParent = new System(
  { models: [Node, ChildNode, Node.added().or(ChildNode.added())] },
  ({ models }) => {
    for (const [{ node }, { parent }] of models.asComponents()) {
      const parentNode = parent.get(Node).node;
      parentNode?.add(node);
    }
  }
);

/**
 * Render the scene.
 */
export const renderScene = new System(
  {
    resources: [Renderer],
    camera: [CameraNode, MainCamera.present()],
    scene: [SceneNode, MainScene.present()],
  },
  ({ resources, camera, scene }) => {
    const [{ renderer }] = resources;
    const [{ node: cameraNode }] = camera.getOneAsComponents();
    const [{ node: sceneNode }] = scene.getOneAsComponents();

    renderer.render(sceneNode, cameraNode);
  }
);

/**
 * Set node position when the position is first added.
 */
export const addInitialPosition = new System(
  { positions: [Node, Position, Position.added()] },
  ({ positions }) => {
    for (const [{ node }, { x, y, z }] of positions.asComponents()) {
      node.position.set(x, y, z);
    }
  }
);

/**
 * Add position tweening when position changes.
 */
export const updatePositionTween = new System(
  { positions: [Node, Position.changed()] },
  ({ positions }) => {
    for (const [entity, { node }] of positions.withComponents()) {
      const { x, y, z } = node.position;

      entity.add(TweenPosition, {
        fromX: x,
        fromY: y,
        fromZ: z,
        progress: 0,
      });
    }
  }
);

/**
 * Tween position.
 */
export const tweenPosition = new System(
  {
    positions: [Position, TweenPosition, Node],
    resources: [VariableUpdate, FixedUpdate],
  },
  ({ positions, resources }) => {
    const [frameInfo, fixedUpdate] = resources;
    const animationFactor = frameInfo.delta / fixedUpdate.rate;

    for (const [
      entity,
      { x, y, z },
      tween,
      { node },
    ] of positions.withComponents()) {
      const { progress, fromX, fromY, fromZ } = tween;
      const animation = Math.min(1, progress + animationFactor);
      node.position.set(
        fromX + (x - fromX) * animation,
        fromY + (y - fromY) * animation,
        fromZ + (z - fromZ) * animation
      );

      if (animation >= 1) {
        entity.remove(TweenPosition);
      } else {
        tween.progress = animation;
      }
    }
  }
).after(updatePositionTween);

/**
 * Add initial rotation when rotation is first added.
 */
export const addInitialRotation = new System(
  { rotations: [Node, Rotation, Rotation.added()] },
  ({ rotations }) => {
    for (const [{ node }, { x, y, z, w }] of rotations.asComponents()) {
      node.quaternion.set(x, y, z, w);
    }
  }
);

/**
 * Add rotation tweening when rotation changes.
 */
export const updateRotationTween = new System(
  { rotations: [Node, Rotation.changed()] },
  ({ rotations }) => {
    for (const [entity, { node }] of rotations.withComponents()) {
      const { x, y, z, w } = node.quaternion;

      entity.add(TweenRotation, {
        fromX: x,
        fromY: y,
        fromZ: z,
        fromW: w,
        progress: 0,
      });
    }
  }
).after(addInitialRotation);

/**
 * Tween rotation.
 */
export const tweenRotation = new System(
  {
    rotations: [TweenRotation, Rotation, Node],
    resources: [VariableUpdate, FixedUpdate],
  },
  ({ rotations, resources }) => {
    const [frameInfo, fixedUpdate] = resources;
    const animationFactor = frameInfo.delta / fixedUpdate.rate;

    for (const [
      entity,
      tween,
      { x, y, z, w },
      { node },
    ] of rotations.withComponents()) {
      const { progress, fromX, fromY, fromZ, fromW } = tween;
      const animation = Math.min(1, progress + animationFactor);
      node.quaternion.set(
        fromX + (x - fromX) * animation,
        fromY + (y - fromY) * animation,
        fromZ + (z - fromZ) * animation,
        fromW + (w - fromW) * animation
      );

      if (animation >= 1) {
        entity.remove(TweenRotation);
      } else {
        tween.progress = animation;
      }
    }
  }
).after(updateRotationTween);
