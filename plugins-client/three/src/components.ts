import type { Entity } from "@crafts/ecs";
import type { Object3D } from "three";
import { Component, state, unique } from "@crafts/ecs";
import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
} from "three";

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
 * The main scene.
 */
@unique
export class MainScene extends Component {}

/**
 * Tracks the tween animaiton for a Node's position.
 */
export class TweenPosition extends Component {
  public fromX = 0;
  public fromY = 0;
  public fromZ = 0;
  public progress = 1;
}

/**
 * Tracks the tween animaiton for a Node's rotation.
 */
export class TweenRotation extends Component {
  public fromX = 0;
  public fromY = 0;
  public fromZ = 0;
  public fromW = 1;
  public progress = 1;
}
