import type { Plugin } from "@crafts/game-app";
import { init as initRapier } from "@dimforge/rapier3d-compat";
import {
  createColliders,
  createRigidBodies,
  doPhysicsStep,
  setup,
  syncTimestep,
  updateRigidBodyPositions,
  updateRigidBodyRotations,
  updateRigidBodySleeping,
  updateRigidBodyVelocities,
  updateUserColliderPositions,
  updateUserRigidBodyAwake,
  updateUserRigidBodyPositions,
  updateUserRigidBodyRotations,
  updateUserRigidBodySleeping,
  updateUserRigidBodyVelocities,
} from "./systems";
import { SystemSet } from "@crafts/game-app";

await initRapier();

export const pluginPhysics: Plugin = (app) => {
  app
    .addStartupSystem(setup)
    .addSystem(
      new SystemSet()
        .add(syncTimestep)
        .add(createRigidBodies)
        .add(createColliders)
        .add(updateUserColliderPositions)
        .add(updateUserRigidBodySleeping)
        .add(updateUserRigidBodyAwake)
        .add(updateUserRigidBodyPositions)
        .add(updateUserRigidBodyVelocities)
        .add(updateUserRigidBodyRotations)
        .add(doPhysicsStep)
        .add(updateRigidBodySleeping)
        .add(updateRigidBodyPositions)
        .add(updateRigidBodyVelocities)
        .add(updateRigidBodyRotations),
      "fixed"
    );
};
