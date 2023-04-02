import type { CommonPlugin } from ".";
import type {
  Collider as RapierCollider,
  RigidBody as RapierRigidBody,
} from "@dimforge/rapier3d-compat";

import {
  RigidBodyDesc,
  ColliderDesc,
  World,
  init as initRapier,
} from "@dimforge/rapier3d-compat";
import { Component, Resource } from "@crafts/ecs";
import { GameConfig } from "./game-config";
import { Position, Velocity } from "./world-entities";

/**
 * The physics world.
 */
export class Physics extends Resource {
  public world = new World({ x: 0, y: -9.81, z: 0 });
}

const ColliderTypeMap = {
  cuboid: ColliderDesc.cuboid,
} as const;

/**
 * The type of a collider.
 */
export type ColliderType = keyof typeof ColliderTypeMap;

/**
 * The parameters for a collider.
 */
export type ColliderParams<T extends ColliderType> = Parameters<
  (typeof ColliderTypeMap)[T]
>;

/**
 * Defines the collision shape of a rigid body.
 */
export class Collider<T extends ColliderType> extends Component {
  private _desc: ColliderDesc;
  private _collider?: RapierCollider;
  private _worldRef?: World;

  public constructor(type: T, ...params: ColliderParams<T>) {
    super();

    const colliderFunc = ColliderTypeMap[type];
    // @ts-expect-error - Typescript refuses to acknowledge params as a tuple
    this._desc = colliderFunc(...params);
  }

  public get collider() {
    return this._collider;
  }

  public __init(world: World, rigidBody?: RapierRigidBody) {
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

const RigidBodyTypeMap = {
  dynamic: RigidBodyDesc.dynamic,
  fixed: RigidBodyDesc.fixed,
} as const;

/**
 * The type of a rigid body.
 */
export type RigidBodyType = keyof typeof RigidBodyTypeMap;

/**
 * The parameters for a rigid body.
 */
export type RigidBodyParams<T extends RigidBodyType> = Parameters<
  (typeof RigidBodyTypeMap)[T]
>;

/**
 * Defines the physics properties of a rigid body.
 */
export class RigidBody<T extends RigidBodyType> extends Component {
  private _desc: RigidBodyDesc;
  private _body?: RapierRigidBody;
  private _worldRef?: World;

  public constructor(type: T, ...params: RigidBodyParams<T>) {
    super();

    const rigidBodyFunc = RigidBodyTypeMap[type];
    // @ts-expect-error - Typescript refuses to acknowledge params as a tuple
    this._desc = rigidBodyFunc(...params);
  }

  public get body() {
    return this._body;
  }

  public __init(world: World) {
    this.__dispose();

    this._worldRef = world;
    this._body = world.createRigidBody(this._desc);
  }

  public __dispose(): void {
    if (this._worldRef && this._body) {
      this._worldRef.removeRigidBody(this._body);
    }
  }
}

export const pluginPhysics: CommonPlugin = ({ onInit }, { fixed }) => {
  onInit(async (world) => {
    await initRapier();

    world.resources.add(Physics);
  });

  fixed
    // Update the timestep of the world if the fixed update rate changes
    .add(
      {
        resources: [
          Physics,
          GameConfig,
          GameConfig.changed().or(GameConfig.added()),
        ],
      },
      ({ resources }) => {
        const [physics, config] = resources;

        physics.world.timestep = config.fixedUpdateRate;
      }
    )
    // Re-add colliders after their rigid body is removed or changed
    .add(
      {
        resources: [Physics],
        bodies: [Collider, RigidBody.changed().or(RigidBody.removed())],
      },
      ({ resources, bodies }) => {
        const [{ world }] = resources;

        for (const [entity, collider] of bodies.withComponents()) {
          const body = entity.tryGet(RigidBody)?.body;

          collider.__init(world, body);
        }
      }
    )
    // Create/update rigid bodies
    .add(
      {
        resources: [Physics],
        bodies: [RigidBody, RigidBody.added().or(RigidBody.changed())],
      },
      ({ resources, bodies }) => {
        const [{ world }] = resources;

        for (const [entity, rigidBody] of bodies.withComponents()) {
          rigidBody.__init(world);

          const position = entity.tryGet(Position);
          if (position) {
            rigidBody.body?.setTranslation(position, true);
          }
        }
      }
    )
    // Create/update a collider
    .add(
      {
        resources: [Physics],
        colliders: [
          Collider,
          Collider.added()
            .or(Collider.changed())
            .or(RigidBody.added())
            .or(RigidBody.changed()),
        ],
      },
      ({ resources, colliders }) => {
        const [{ world }] = resources;

        for (const [entity, collider] of colliders.withComponents()) {
          const body = entity.tryGet(RigidBody)?.body;
          collider.__init(world, body);

          const position = entity.tryGet(Position);
          if (position) {
            collider.collider?.setTranslation(position);
          }
        }
      }
    )
    // Update the position of the rigid body or collider
    .add(
      {
        bodies: [RigidBody, Position, Position.added().or(Position.changed())],
      },
      ({ bodies }) => {
        for (const [{ body }, position] of bodies.asComponents()) {
          body?.setTranslation(position, true);
        }
      }
    )
    // Update the position of the collider
    .add(
      {
        colliders: [
          Collider,
          Position,
          Position.added().or(Position.changed()),
        ],
      },
      ({ colliders }) => {
        for (const [{ collider }, position] of colliders.asComponents()) {
          collider?.setTranslation(position);
        }
      }
    )
    // Update the velocity of the rigid body
    .add(
      {
        colliders: [
          RigidBody,
          Velocity,
          Velocity.added().or(Velocity.changed()),
        ],
      },
      ({ colliders }) => {
        for (const [{ body }, velocity] of colliders.asComponents()) {
          body?.setLinvel(velocity, true);
        }
      }
    )
    // Step the physics world
    .add({ resources: [Physics] }, ({ resources }) => {
      const [physics] = resources;

      physics.world.step();
    })
    // Update the position of rigid bodies
    .add({ bodies: [RigidBody, Position] }, ({ bodies }) => {
      for (const [{ body }, position] of bodies.asComponents()) {
        if (!body?.isSleeping()) {
          const newPosition = body?.translation();
          Object.assign(position, newPosition);
        }
      }
    })
    // Update the velocity of rigid bodies
    .add({ bodies: [RigidBody, Velocity] }, ({ bodies }) => {
      for (const [{ body }, velocity] of bodies.asComponents()) {
        if (!body?.isSleeping()) {
          const newVelocity = body?.linvel();
          Component.assignNoChange(velocity, newVelocity);
        }
      }
    });
};
