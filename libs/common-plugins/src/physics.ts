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
import { AnyFilter, Component, Resource } from "@crafts/ecs";
import { GameConfig } from "./game-config";
import { Position, Velocity, Rotation } from "./world-entities";

function floatsEqual(a: number, b: number, epsilon = 0.000_01): boolean {
  return Math.abs(a - b) < epsilon;
}

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
    this._body.lockRotations(false, true);
  }

  public __dispose(): void {
    if (this._worldRef && this._body) {
      this._worldRef.removeRigidBody(this._body);
    }
  }
}

/**
 * Whether the entity's rigid body is sleeping
 */
export class Sleeping extends Component {}

export const pluginPhysics: CommonPlugin = ({ onInit }, { fixed }) => {
  onInit(async (world) => {
    await initRapier();

    world.resources.add(Physics);
  });

  fixed
    // Update the timestep of the world if the fixed update rate changes
    .add(
      { resources: [Physics, GameConfig, GameConfig.addedOrChanged()] },
      ({ resources }) => {
        const [physics, config] = resources;

        physics.world.timestep = config.fixedUpdateRate;
      }
    )
    // Create/update rigid bodies
    .add(
      {
        resources: [Physics],
        bodies: [RigidBody, Position.optional(), RigidBody.addedOrChanged()],
      },
      ({ resources, bodies }) => {
        const [{ world }] = resources;

        for (const [rigidBody, position] of bodies.asComponents()) {
          rigidBody.__init(world);

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
          Position.optional(),
          RigidBody.optional(),
          new AnyFilter(
            Collider.addedOrChanged(),
            RigidBody.addedOrChanged(),
            RigidBody.removed()
          ),
        ],
      },
      ({ resources, colliders }) => {
        const [{ world }] = resources;

        for (const [
          collider,
          position,
          rigidBody,
        ] of colliders.asComponents()) {
          const body = rigidBody?.body;
          collider.__init(world, body);

          if (position) {
            collider.collider?.setTranslation(position);
          }
        }
      }
    )
    // Update the position of colliders
    .add(
      { colliders: [Collider, Position, Position.addedOrChanged()] },
      ({ colliders }) => {
        for (const [{ collider }, position] of colliders.asComponents()) {
          collider?.setTranslation(position);
        }
      }
    )
    // Update the position of rigid bodies
    .add(
      { bodies: [RigidBody, Position, Position.addedOrChanged()] },
      ({ bodies }) => {
        for (const [{ body }, position] of bodies.asComponents()) {
          body?.setTranslation(position, true);
        }
      }
    )
    // Update the velocity of rigid bodies
    .add(
      { bodies: [RigidBody, Velocity, Velocity.addedOrChanged()] },
      ({ bodies }) => {
        for (const [{ body }, velocity] of bodies.asComponents()) {
          body?.setLinvel(velocity, true);
        }
      }
    )
    // Update the rotation of rigid bodies
    .add(
      { bodies: [RigidBody, Rotation, Rotation.addedOrChanged()] },
      ({ bodies }) => {
        for (const [{ body }, rotation] of bodies.asComponents()) {
          body?.setRotation(rotation, true);
        }
      }
    )
    // Put rigid bodies asleep
    .add({ bodies: [RigidBody, Sleeping.addedOrChanged()] }, ({ bodies }) => {
      for (const [{ body }] of bodies.asComponents()) {
        body?.sleep();
      }
    })
    // Wake up rigid bodies
    .add({ bodies: [RigidBody, Sleeping.removed()] }, ({ bodies }) => {
      for (const [{ body }] of bodies.asComponents()) {
        body?.wakeUp();
      }
    })
    // Step the physics world
    .add({ resources: [Physics] }, ({ resources }) => {
      const [physics] = resources;

      physics.world.step();
    })
    // Update the sleeping state
    .add({ bodies: [RigidBody] }, ({ bodies }) => {
      for (const [entity, { body }] of bodies.withComponents()) {
        if (body?.isSleeping()) {
          entity.add(Sleeping);
        } else {
          entity.remove(Sleeping);
        }
      }
    })
    // Update the position of rigid bodies
    .add({ bodies: [RigidBody, Position, Sleeping.absent()] }, ({ bodies }) => {
      for (const [{ body }, position] of bodies.asComponents()) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const newPosition = body!.translation();
        if (
          !floatsEqual(newPosition.x, position.x) ||
          !floatsEqual(newPosition.y, position.y) ||
          !floatsEqual(newPosition.z, position.z)
        ) {
          Object.assign(position, newPosition);
        }
      }
    })
    // Update the velocity of rigid bodies
    .add({ bodies: [RigidBody, Velocity, Sleeping.absent()] }, ({ bodies }) => {
      for (const [{ body }, velocity] of bodies.asComponents()) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const newVelocity = body!.linvel();
        if (
          !floatsEqual(newVelocity.x, velocity.x) ||
          !floatsEqual(newVelocity.y, velocity.y) ||
          !floatsEqual(newVelocity.z, velocity.z)
        ) {
          Object.assign(velocity, newVelocity);
        }
      }
    })
    // Update the rotation of rigid bodies
    .add({ bodies: [RigidBody, Rotation, Sleeping.absent()] }, ({ bodies }) => {
      for (const [{ body }, rotation] of bodies.asComponents()) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const newRotation = body!.rotation();
        if (
          !floatsEqual(newRotation?.x, rotation.x) ||
          !floatsEqual(newRotation?.y, rotation.y) ||
          !floatsEqual(newRotation?.z, rotation.z) ||
          !floatsEqual(newRotation?.w, rotation.w)
        ) {
          Object.assign(rotation, newRotation);
        }
      }
    });
};
