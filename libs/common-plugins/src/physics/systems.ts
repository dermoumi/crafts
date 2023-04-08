import { AnyFilter, System } from "@crafts/ecs";
import { Physics } from "./resources";
import { FixedUpdate } from "../fixed-update";
import { Collider, RigidBody, Sleeping } from "./components";
import { Position, Rotation, Velocity } from "../world-entities";

/**
 * Utility function to compare two floats.
 * @param a - First float
 * @param b - Second float
 * @param epsilon - The maximum difference between the two floats
 * @returns True if the difference between the two floats is less than epsilon
 */
function floatsEqual(a: number, b: number, epsilon = 0.000_01): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Update the timestep of the world if the fixed update rate changes.
 */
export const syncTimestep = new System(
  { resources: [Physics, FixedUpdate, FixedUpdate.addedOrChanged()] },
  ({ resources }) => {
    const [{ world }, fixedUpdate] = resources;

    world.timestep = fixedUpdate.rate;
  }
);

/**
 * Create/update rigid bodies.
 */
export const createRigidBodies = new System(
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
);

/**
 * Create/update colliders.
 */
export const createColliders = new System(
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

    for (const [collider, position, rigidBody] of colliders.asComponents()) {
      const body = rigidBody?.body;
      collider.__init(world, body);

      if (position) {
        collider.collider?.setTranslation(position);
      }
    }
  }
);

/**
 * Update user-set positions of colliders.
 */
export const updateUserColliderPositions = new System(
  { colliders: [Collider, Position, Position.addedOrChanged()] },
  ({ colliders }) => {
    for (const [{ collider }, position] of colliders.asComponents()) {
      collider?.setTranslation(position);
    }
  }
);

/**
 * Update user-set sleeping state of rigid bodies.
 */
export const updateUserRigidBodySleeping = new System(
  { bodies: [RigidBody, Sleeping.addedOrChanged()] },
  ({ bodies }) => {
    for (const [{ body }] of bodies.asComponents()) {
      body?.sleep();
    }
  }
);

/**
 * Update user-set waking state of rigid bodies.
 */
export const updateUserRigidBodyAwake = new System(
  { bodies: [RigidBody, Sleeping.removed()] },
  ({ bodies }) => {
    for (const [{ body }] of bodies.asComponents()) {
      body?.wakeUp();
    }
  }
);

/**
 * Update user-set positions of rigid bodies.
 */
export const updateUserRigidBodyPositions = new System(
  { bodies: [RigidBody, Position, Position.addedOrChanged()] },
  ({ bodies }) => {
    for (const [{ body }, position] of bodies.asComponents()) {
      body?.setTranslation(position, true);
    }
  }
);

/**
 * Update user-set velocities of rigid bodies.
 */
export const updateUserRigidBodyVelocities = new System(
  { bodies: [RigidBody, Velocity, Velocity.addedOrChanged()] },
  ({ bodies }) => {
    for (const [{ body }, velocity] of bodies.asComponents()) {
      body?.setLinvel(velocity, true);
    }
  }
);

/**
 * Update user-set rotations of rigid bodies.
 */
export const updateUserRigidBodyRotations = new System(
  { bodies: [RigidBody, Rotation, Rotation.addedOrChanged()] },
  ({ bodies }) => {
    for (const [{ body }, rotation] of bodies.asComponents()) {
      body?.setRotation(rotation, true);
    }
  }
);

/**
 * Perform a physics step.
 */
export const doPhysicsStep = new System(
  { resources: [Physics] },
  ({ resources }) => {
    const [physics] = resources;

    physics.world.step();
  }
);

/**
 * Update the physics's sleeping state to entities.
 */
export const updateRigidBodySleeping = new System(
  { bodies: [RigidBody, Sleeping.optional()] },
  ({ bodies }) => {
    for (const [entity, { body }, sleeping] of bodies.withComponents()) {
      if (body?.isSleeping()) {
        entity.add(Sleeping);
      } else if (sleeping) {
        entity.remove(Sleeping);
      }
    }
  }
);

/**
 * Update the positions of rigid bodies.
 */
export const updateRigidBodyPositions = new System(
  { bodies: [RigidBody, Position, Sleeping.absent()] },
  ({ bodies }) => {
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
  }
);

/**
 * Update the velocties of rigid bodies.
 */
export const updateRigidBodyVelocities = new System(
  { bodies: [RigidBody, Velocity, Sleeping.absent()] },
  ({ bodies }) => {
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
  }
);

/**
 * Update the rotations of rigid bodies.
 */
export const updateRigidBodyRotations = new System(
  { bodies: [RigidBody, Rotation, Sleeping.absent()] },
  ({ bodies }) => {
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
  }
);
