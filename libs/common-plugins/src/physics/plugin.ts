import type { CommonPlugin } from "..";

import { init as initRapier } from "@dimforge/rapier3d-compat";
import { Physics } from "./resources";
import {
  createColliders,
  createRigidBodies,
  doPhysicsStep,
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

export const pluginPhysics: CommonPlugin = async ({ onInit }, { fixed }) => {
  await initRapier();

  onInit((world) => {
    world.resources.add(Physics);
  });

  fixed
    .addSystem(syncTimestep)
    .addSystem(createRigidBodies)
    .addSystem(createColliders)
    .addSystem(updateUserColliderPositions)
    .addSystem(updateUserRigidBodySleeping)
    .addSystem(updateUserRigidBodyAwake)
    .addSystem(updateUserRigidBodyPositions)
    .addSystem(updateUserRigidBodyVelocities)
    .addSystem(updateUserRigidBodyRotations)
    .addSystem(doPhysicsStep)
    .addSystem(updateRigidBodySleeping)
    .addSystem(updateRigidBodyPositions)
    .addSystem(updateRigidBodyVelocities)
    .addSystem(updateRigidBodyRotations);
};
