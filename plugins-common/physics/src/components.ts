import * as Rapier from "@dimforge/rapier3d-compat";
import { Component, state } from "@crafts/ecs";

/**
 * A physics' collider.
 */
export abstract class Collider extends Component {
  private _desc: Rapier.ColliderDesc;
  private _collider?: Rapier.Collider;
  private _worldRef?: Rapier.World;

  public constructor(desc: Rapier.ColliderDesc) {
    super();

    this._desc = desc;
  }

  public get collider(): Rapier.Collider | undefined {
    return this._collider;
  }

  public __init(world: Rapier.World, rigidBody?: Rapier.RigidBody): void {
    this.__dispose();

    this._worldRef = world;
    this._collider = world.createCollider(this._desc, rigidBody);
  }

  public __dispose(): void {
    if (this._worldRef && this._collider) {
      this._worldRef.removeCollider(this._collider, true);
    }
  }
}

/**
 * A cuboid collider.
 */
@state(Collider)
export class CuboidCollider extends Collider {
  public constructor(width: number, height: number, depth: number) {
    super(Rapier.ColliderDesc.cuboid(width, height, depth));
  }
}

/**
 * A physics' rigid body.
 */
export abstract class RigidBody extends Component {
  protected _desc: Rapier.RigidBodyDesc;
  protected _body?: Rapier.RigidBody;
  protected _worldRef?: Rapier.World;

  public constructor(desc: Rapier.RigidBodyDesc) {
    super();

    this._desc = desc;
  }

  public get body(): Rapier.RigidBody | undefined {
    return this._body;
  }

  public __init(world: Rapier.World): void {
    this.__dispose();

    this._worldRef = world;
    this._body = world.createRigidBody(this._desc);
    this._body.lockRotations(false, true);
  }

  public __dispose(): void {
    if (this._worldRef && this._body) {
      this._worldRef.removeRigidBody(this._body);
    }
  }
}

/**
 * A dynamic rigid body.
 */
@state(RigidBody)
export class DynamicRigidBody extends RigidBody {
  public constructor() {
    super(Rapier.RigidBodyDesc.dynamic());
  }
}

/**
 * A fixed rigid body.
 */
@state(RigidBody)
export class FixedRigidBody extends RigidBody {
  public constructor() {
    super(Rapier.RigidBodyDesc.fixed());
  }
}

/**
 * Whether the entity's rigid body is sleeping or not.
 */
export class Sleeping extends Component {}
