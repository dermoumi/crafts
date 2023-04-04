import type { ClientPlugin } from ".";
import type { Entity } from "@crafts/ecs";
import { Unique, Component, Resource } from "@crafts/ecs";
import type { Renderer, Object3D } from "three";
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
  RenderRotation,
  SceneNode,
} from "./world-entities";
import { Position } from "@crafts/common-plugins";

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
@Unique
export class MainCamera extends Component {}

/**
 * The main scene
 */
@Unique
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
        resources: [MainRenderer],
        camera: [Node, MainCamera.added()],
      },
      ({ resources, camera }) => {
        const [{ renderer }] = resources;
        const [{ node: cameraNode }] = camera.getOneAsComponents();

        fixCameraAsepectRatio(renderer, cameraNode as PerspectiveCamera);
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
        scene: [Node, MainScene],
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
        camera: [Node, MainCamera],
      },
      ({ resources, camera }) => {
        const [{ renderer, element }] = resources;
        const [{ node: cameraNode }] = camera.getOneAsComponents();

        fitContainer(renderer, element);
        fixCameraAsepectRatio(renderer, cameraNode as PerspectiveCamera);
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
      camera: [Node, MainCamera],
      scene: [Node, MainScene],
    },
    ({ resources, camera, scene }) => {
      const [{ renderer }] = resources;
      const [{ node: cameraNode }] = camera.getOneAsComponents();
      const [{ node: sceneNode }] = scene.getOneAsComponents();

      renderer.render(sceneNode, cameraNode as PerspectiveCamera);
    }
  );
};
