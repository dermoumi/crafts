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
export class PhysicsWorld extends Resource {
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
  public desc: ColliderDesc;

  public constructor(type: T, ...params: ColliderParams<T>) {
    super();

    const colliderFunc = ColliderTypeMap[type];
    // @ts-expect-error - Typescript refuses to acknowledge params as a tuple
    this.desc = colliderFunc(...params);
  }

  public create(world: World, rigidBody?: RapierRigidBody) {
    const collider = world.createCollider(this.desc, rigidBody);
    return collider;
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
  public desc: RigidBodyDesc;

  public constructor(type: T, ...params: RigidBodyParams<T>) {
    super();

    const rigidBodyFunc = RigidBodyTypeMap[type];
    // @ts-expect-error - Typescript refuses to acknowledge params as a tuple
    this.desc = rigidBodyFunc(...params);
  }
}

/**
 * Enables physics on an entity.
 */
export class Physics extends Component {
  public collider?: RapierCollider;
  public rigidBody?: RapierRigidBody;
}

export const pluginPhysics: CommonPlugin = ({ onInit }, { fixed }) => {
  onInit(async (world) => {
    await initRapier();

    world.resources.add(PhysicsWorld);
  });

  fixed
    // Update the timestep of the world if the fixed update rate changes
    .add(
      {
        resources: [
          PhysicsWorld,
          GameConfig,
          GameConfig.changed().or(GameConfig.added()),
        ],
      },
      ({ resources }) => {
        const [physics, config] = resources;

        physics.world.timestep = config.fixedUpdateRate;
      }
    )
    // Create rigid bodies
    .add(
      {
        resources: [PhysicsWorld],
        removed: [Physics, Collider.removed().or(Position.removed())],
      },
      ({ resources, removed }) => {
        const [{ world }] = resources;

        for (const [physics] of removed.asComponents()) {
          if (physics.collider) {
            world.removeCollider(physics.collider, true);
            physics.collider = undefined;
          }
        }
      }
    )
    // Remove rigid bodies
    .add(
      {
        resources: [PhysicsWorld],
        bodies: [Physics, RigidBody.removed().or(Position.removed())],
      },
      ({ resources, bodies }) => {
        const [{ world }] = resources;

        for (const [entity, physics] of bodies.withComponents()) {
          if (physics.rigidBody) {
            world.removeRigidBody(physics.rigidBody);
            physics.rigidBody = undefined;

            const colliderDesc = entity.tryGet(Collider);
            if (colliderDesc) {
              physics.collider = colliderDesc.create(world);
            }
          }
        }
      }
    )
    // Create/update rigid bodies
    .add(
      {
        resources: [PhysicsWorld],
        bodies: [
          RigidBody,
          Physics,
          Position,
          RigidBody.added()
            .or(RigidBody.changed())
            .or(Physics.added())
            .or(Position.added()),
        ],
      },
      ({ resources, bodies }) => {
        const [{ world }] = resources;

        for (const [rigidBody, physics, position] of bodies.asComponents()) {
          if (physics.rigidBody) {
            world.removeRigidBody(physics.rigidBody);
          } else if (physics.collider) {
            // We can't update a collider's parent,
            // so we need to remove and recreate it
            world.removeCollider(physics.collider, true);
          }

          physics.collider = undefined;

          const body = world.createRigidBody(rigidBody.desc);
          body.setTranslation(position, true);
          physics.rigidBody = body;
        }
      }
    )
    // Create/update a collider
    .add(
      {
        resources: [PhysicsWorld],
        colliders: [
          Physics,
          Collider,
          Position,
          Collider.added()
            .or(Collider.changed())
            .or(Physics.added())
            .or(Position.added())
            .or(RigidBody.added())
            .or(RigidBody.changed()),
        ],
      },
      ({ resources, colliders }) => {
        const [{ world }] = resources;

        for (const [physics, desc, position] of colliders.asComponents()) {
          if (physics.collider) {
            world.removeCollider(physics.collider, true);
          }

          const collider = desc.create(world, physics.rigidBody);
          collider.setTranslation(position);
          physics.collider = collider;
        }
      }
    )
    // Update the position of the rigid body or collider
    .add(
      {
        colliders: [Physics, Position, Position.changed()],
      },
      ({ colliders }) => {
        for (const [
          { rigidBody, collider },
          position,
        ] of colliders.asComponents()) {
          if (rigidBody) {
            rigidBody.setTranslation(position, true);
          } else if (collider) {
            collider.setTranslation(position);
          }
        }
      }
    )
    // Update the velocity of the rigid body
    .add(
      {
        colliders: [Physics, Velocity, Velocity.added().or(Velocity.changed())],
      },
      ({ colliders }) => {
        for (const [{ rigidBody }, velocity] of colliders.asComponents()) {
          if (rigidBody) {
            rigidBody.setLinvel(velocity, true);
          }
        }
      }
    )
    // Step the physics world
    .add({ resources: [PhysicsWorld] }, ({ resources }) => {
      const [physics] = resources;

      physics.world.step();
    })
    // Update the position of rigid bodies
    .add({ bodies: [Physics, Position] }, ({ bodies }) => {
      for (const [{ rigidBody }, position] of bodies.asComponents()) {
        if (rigidBody && !rigidBody.isSleeping()) {
          const newPosition = rigidBody.translation();
          Object.assign(position, newPosition);
        }
      }
    })
    // Update the velocity of rigid bodies
    .add({ bodies: [Physics, Velocity] }, ({ bodies }) => {
      for (const [{ rigidBody }, velocity] of bodies.asComponents()) {
        if (rigidBody && !rigidBody.isSleeping()) {
          const newVelocity = rigidBody.linvel();
          Component.assignNoChange(velocity, newVelocity);
        }
      }
    });
};
