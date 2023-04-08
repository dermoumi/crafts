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
    .add(updateRigidBodyRotations);
};
