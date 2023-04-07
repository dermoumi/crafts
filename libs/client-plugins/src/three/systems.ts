import type { PerspectiveCamera, Renderer as ThreeJsRenderer } from "three";
import { System } from "@crafts/ecs";
import { Renderer } from "./resources";
import {
  CameraNode,
  ChildNode,
  MainCamera,
  MainScene,
  Node,
  SceneNode,
} from "./components";

/**
 * Fit a renderer inside its container.
 *
 * @param renderer - The renderer to fit
 * @param container - The renderer's container
 */
const fitContainer = (renderer: ThreeJsRenderer, container: HTMLElement) => {
  const { clientWidth, clientHeight } = container;

  renderer.setSize(clientWidth, clientHeight);
};

/**
 * Fix the aspect ratio of a perspective camera.
 *
 * @param renderer - The renderer to fit the camera to
 * @param camera - The camera to fix
 */
const fitCameraAsepectRatio = (
  renderer: ThreeJsRenderer,
  camera: PerspectiveCamera
) => {
  const { width, height } = renderer.domElement;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

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
    nodes: [Node, Node.added(), ChildNode.absent()],
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
