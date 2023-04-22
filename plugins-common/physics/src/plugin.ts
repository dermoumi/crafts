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
        .with(syncTimestep)
        .with(createRigidBodies)
        .with(createColliders)
        .with(updateUserColliderPositions)
        .with(updateUserRigidBodySleeping)
        .with(updateUserRigidBodyAwake)
        .with(updateUserRigidBodyPositions)
        .with(updateUserRigidBodyVelocities)
        .with(updateUserRigidBodyRotations)
        .with(doPhysicsStep)
        .with(updateRigidBodySleeping)
        .with(updateRigidBodyPositions)
        .with(updateRigidBodyVelocities)
        .with(updateRigidBodyRotations),
      "fixed"
    );
};
