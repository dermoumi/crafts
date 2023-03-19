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

/**
 * An abstract node component.
 */
export class Node extends Component {
  /**
   * The three.js node referenced by this component.
   */
  public readonly node: Object3D;

  public constructor(node: Object3D) {
    super();

    this.node = node;
  }
}

/**
 * Represents a ThreeJS scene.
 */
export class SceneNode extends Component {}

/**
 * Represents a ThreeJS camera.
 */
export class CameraNode extends Component {}

/**
 * Represents a ThreeJS mesh.
 */
export class MeshNode extends Component {}

/**
 * The position of an entity in the world.
 *
 * This is di
 */
export class RenderPosition extends Component {
  public x = 0;
  public y = 0;
  public z = 0;
}

/**
 * Hierarchy
 *
 * TODO: Move this to a different plugin, eventually
 */
export class ChildNode extends Component {
  public constructor(public parent: Entity) {
    super();
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
  public readonly scene: Entity;

  public constructor(scene: Entity) {
    super();
    scene.get(SceneNode); // Raises an exception if the entity is not a scene
    this.scene = scene;
  }

  public get node(): PerspectiveCamera {
    return this.scene.get(Node).node as PerspectiveCamera;
  }
}

/**
 * The main ThreeJS renderer
 */
export class MainRenderer extends Resource {
  public readonly renderer = new WebGLRenderer();

  public constructor(public readonly element: HTMLElement) {
    super();
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
export const pluginThree: ClientPlugin = ({ startup, update, cleanup }) => {
  const resizeListeners: Array<() => void> = [];

  startup.add({}, ({ command }) => {
    // Listen for window resize events
    command(({ addResource }) => {
      const resizeListener = () => {
        addResource(WindowResized);
      };

      resizeListeners.push(resizeListener);
      window.addEventListener("resize", resizeListener, { passive: true });
    });

    // Spawn the initial scene and camera
    command(({ spawn, addNewResource }) => {
      const camera = spawn().add(CameraNode).add(RenderPosition, { z: 5 });
      addNewResource(MainCamera, camera);

      const scene = spawn().add(SceneNode);
      addNewResource(MainScene, scene);

      spawn().add(MeshNode);
    });

    // Add the main renderer
    command(({ addNewResource }) => {
      addNewResource(MainRenderer, document.body);
    });
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

  cleanup
    .add({}, () => {
      for (const listener of resizeListeners) {
        window.removeEventListener("resize", listener);
      }
    })
    .add({ resources: [MainRenderer] }, ({ resources }) => {
      // When the renderer is removed, remove the canvas from the DOM
      const [{ renderer }] = resources;

      renderer.domElement.remove();
    });
};
