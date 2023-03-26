import type { ClientPlugin } from ".";
import type { Entity } from "@crafts/ecs";
import type { Renderer, Object3D } from "three";
import { Component, Resource } from "@crafts/ecs";
import {
  Scene,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  WebGLRenderer,
} from "three";
import {
  CameraNode,
  MeshNode,
  RenderPosition,
  SceneNode,
} from "./world-entities";

/**
 * An abstract node component.
 */
export class Node extends Component {
  /**
   * The three.js node referenced by this component.
   */
  public readonly node: Object3D;

  /**
   * @param node - The three.js node referenced by this component.
   */
  public constructor(node: Object3D) {
    super();
    this.node = node;
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
export class MainCamera extends Resource {
  /**
   * The camera's entity.
   */
  public readonly camera: Entity;

  /**
   * @param camera - The camera's entity.
   *  It needs to have a `CameraNode` component.
   */
  public constructor(camera: Entity) {
    super();
    camera.get(CameraNode); // Raises an exception if the entity is not a camera
    this.camera = camera;
  }

  /**
   * Retrieve's the camera's three.js node.
   *
   * @returns The camera's three.js node
   */
  public get node(): PerspectiveCamera {
    return this.camera.get(Node).node as PerspectiveCamera;
  }
}

/**
 * The main scene
 */
export class MainScene extends Resource {
  /**
   * The main scene's entity.
   */
  public readonly scene: Entity;

  /**
   * @param scene - The scene to be marked as main scene
   */
  public constructor(scene: Entity) {
    super();
    scene.get(SceneNode); // Raises an exception if the entity is not a scene
    this.scene = scene;
  }

  /**
   * Retrieve the scene's three.js node.
   */
  public get node(): PerspectiveCamera {
    return this.scene.get(Node).node as PerspectiveCamera;
  }
}

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
export const pluginThree: ClientPlugin = ({ onInit }, { update }) => {
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
    const camera = world.spawn().add(CameraNode).add(RenderPosition, { z: 5 });
    world.resources.addNew(MainCamera, camera);

    const scene = world.spawn().add(SceneNode);
    world.resources.addNew(MainScene, scene);
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
    // When a camera is added, create a new ThreeJS camera
    .add({ cameras: [CameraNode.added()] }, ({ cameras }) => {
      for (const entity of cameras) {
        const camera = new PerspectiveCamera();
        entity.addNew(Node, camera);
      }
    })
    // When a camera is set as main camera, fix its aspect ratio
    .add(
      {
        resources: [MainRenderer, MainCamera, MainCamera.added()],
      },
      ({ resources }) => {
        const [{ renderer }, camera] = resources;

        fixCameraAsepectRatio(renderer, camera.node);
      }
    )
    // When a scene is added, create a new ThreeJS scene
    .add({ scenes: [SceneNode.added()] }, ({ scenes }) => {
      for (const entity of scenes) {
        const scene = new Scene();
        entity.addNew(Node, scene);
      }
    })
    // When a mesh is added, create a new ThreeJS model
    .add({ meshes: [MeshNode.added()] }, ({ meshes }) => {
      for (const entity of meshes) {
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({ color: 0xffcc00 });
        const mesh = new Mesh(geometry, material);
        entity.addNew(Node, mesh);
      }
    })
    // When a Node is added, nest it to the main scene
    .add(
      {
        nodes: [Node, Node.added(), ChildNode.absent()],
        resources: [MainScene],
      },
      ({ nodes, resources }) => {
        const [scene] = resources;

        for (const [{ node }] of nodes.asComponents()) {
          if (scene.node === node) continue;
          scene.node.add(node);
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
      {
        nodes: [
          Node,
          RenderPosition,
          RenderPosition.added().or(RenderPosition.changed()),
        ],
      },
      ({ nodes }) => {
        for (const [{ node }, { x, y, z }] of nodes.asComponents()) {
          node.position.set(x, y, z);
        }
      }
    )
    // When the window is resized, update the renderer size to fit
    // its container.
    .add(
      {
        resources: [MainRenderer, MainCamera, MainScene, WindowResized.added()],
      },
      ({ resources }) => {
        const [{ renderer, element }, camera] = resources;

        fitContainer(renderer, element);
        fixCameraAsepectRatio(renderer, camera.node);
      }
    )
    // Remove the WindowResized Marker
    .add({ resources: [WindowResized.added()] }, ({ command }) => {
      command(({ removeResource }) => {
        removeResource(WindowResized);
      });
    })
    // Render the scene, each frame
    .add(
      {
        resources: [MainRenderer, MainCamera, MainScene],
      },
      ({ resources }) => {
        const [{ renderer }, camera, scene] = resources;

        renderer.render(scene.node, camera.node);
      }
    );
};
