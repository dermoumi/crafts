import type { ClientPlugin } from ".";
import type { Entity } from "@crafts/ecs";
import type { Renderer, Object3D } from "three";

import { state, unique, Component, Resource } from "@crafts/ecs";
import {
  Scene,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  WebGLRenderer,
} from "three";
import { RenderPosition, RenderRotation } from "./world-entities";
import { Position } from "@crafts/common-plugins";

/**
 * An abstract node component.
 */
export abstract class Node<T extends Object3D> extends Component {
  /**
   * The three.js node referenced by this component.
   */
  public readonly node: T;

  /**
   * @param node - The three.js node referenced by this component.
   */
  public constructor(node: T) {
    super();
    this.node = node;
  }
}

/**
 * Represents a ThreeJS scene.
 */
@state(Node)
export class SceneNode extends Node<Scene> {
  public constructor() {
    const scene = new Scene();
    super(scene);
  }
}

/**
 * Represents a ThreeJS camera.
 */
@state(Node)
export class CameraNode extends Node<PerspectiveCamera> {
  public constructor() {
    const camera = new PerspectiveCamera();
    super(camera);
  }
}

/**
 * Represents a ThreeJS mesh.
 */
@state(Node)
export class MeshNode extends Node<Mesh> {
  public constructor() {
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicMaterial({ color: 0xffcc00 });
    const mesh = new Mesh(geometry, material);
    super(mesh);
  }
}

/**
 * Hierarchy
 *
 * TODO: Move this to a different plugin, eventually
 */
export class ChildNode extends Component {
  /**
   * The parent entity.
   */
  public readonly parent: Entity;

  public constructor(parent: Entity) {
    super();

    this.parent = parent;
  }
}

/**
 * The main camera.
 */
@unique
export class MainCamera extends Component {}

/**
 * The main scene
 */
@unique
export class MainScene extends Component {}

/**
 * The main ThreeJS renderer
 */
export class MainRenderer extends Resource {
  /**
   * The three.js renderer instance.
   */
  public readonly renderer = new WebGLRenderer();

  /**
   * The element where the renderer is mounted.
   */
  public readonly element: HTMLElement;

  /**
   * @param element - The element where the renderer will be mounted
   */
  public constructor(element: HTMLElement) {
    super();
    this.element = element;
  }
}

/**
 * Marker for when the window is resized
 */
export class WindowResized extends Resource {}

/**
 * Fit a renderer inside its container
 *
 * @param renderer - The renderer to fit
 * @param container - The renderer's container
 */
const fitContainer = (renderer: Renderer, container: HTMLElement) => {
  const { clientWidth, clientHeight } = container;

  renderer.setSize(clientWidth, clientHeight);
};

/**
 * Fix the aspect ratio of a perspective camera
 * @param renderer - The renderer to fit the camera to
 * @param camera - The camera to fix
 */
const fixCameraAsepectRatio = (
  renderer: Renderer,
  camera: PerspectiveCamera
) => {
  const { width, height } = renderer.domElement;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

/**
 * Plugin to manage ThreeJS scenes.
 */
export const pluginThree: ClientPlugin = (
  { onInit },
  { update, postupdate }
) => {
  // Listen for window resize events
  onInit(({ resources }) => {
    const resizeListener = () => {
      resources.add(WindowResized);
    };

    window.addEventListener("resize", resizeListener, { passive: true });

    return () => {
      window.removeEventListener("resize", resizeListener);
    };
  });

  // Spawn the initial scene and camera
  onInit((world) => {
    world
      .spawn()
      .add(CameraNode)
      .add(RenderPosition)
      .add(Position, { z: 5 })
      .add(MainCamera);

    world.spawn().add(SceneNode).add(MainScene);
  });

  // Add the main renderer
  onInit(({ resources }) => {
    resources.addNew(MainRenderer, document.body);

    return () => {
      const { renderer } = resources.get(MainRenderer);
      renderer.domElement.remove();
      renderer.dispose();
    };
  });

  update
    // When a MainRenderer is added, create a new ThreeJS renderer and
    // mount it to its element.
    .add(
      { resources: [MainRenderer, MainRenderer.added()] },
      ({ resources }) => {
        const [{ renderer, element }] = resources;

        element.append(renderer.domElement);
        fitContainer(renderer, element);
      }
    )
    // When a camera is set as main camera, fix its aspect ratio
    .add(
      {
        resources: [MainRenderer],
        camera: [CameraNode, MainCamera.added()],
      },
      ({ resources, camera }) => {
        const [{ renderer }] = resources;
        const [{ node: cameraNode }] = camera.getOneAsComponents();

        fixCameraAsepectRatio(renderer, cameraNode);
      }
    )
    // When a Node is added, nest it to the main scene
    .add(
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
    )
    // When a Node is added, and it has a ChildNode, nest it to its parent
    .add(
      { models: [Node, ChildNode, Node.added().or(ChildNode.added())] },
      ({ models }) => {
        for (const [{ node }, { parent }] of models.asComponents()) {
          const parentNode = parent.get(Node).node;
          parentNode?.add(node);
        }
      }
    )
    // Update the nodes' position
    .add(
      { nodes: [Node, RenderPosition, RenderPosition.addedOrChanged()] },
      ({ nodes }) => {
        for (const [{ node }, { x, y, z }] of nodes.asComponents()) {
          node.position.set(x, y, z);
        }
      }
    )
    // Update the nodes' rotation
    .add(
      { nodes: [Node, RenderRotation, RenderRotation.addedOrChanged()] },
      ({ nodes }) => {
        for (const [{ node }, { x, y, z, w }] of nodes.asComponents()) {
          node.quaternion.set(x, y, z, w);
        }
      }
    )
    // When the window is resized, update the renderer size to fit
    // its container.
    .add(
      {
        resources: [MainRenderer, WindowResized.added()],
        camera: [CameraNode, MainCamera.present()],
      },
      ({ resources, camera }) => {
        const [{ renderer, element }] = resources;
        const [{ node: cameraNode }] = camera.getOneAsComponents();

        fitContainer(renderer, element);
        fixCameraAsepectRatio(renderer, cameraNode);
      }
    )
    // Remove the WindowResized Marker
    .add({ resources: [WindowResized.added()] }, ({ command }) => {
      command(({ removeResource }) => {
        removeResource(WindowResized);
      });
    });

  // Render the scene, each frame
  postupdate.add(
    {
      resources: [MainRenderer],
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
};
