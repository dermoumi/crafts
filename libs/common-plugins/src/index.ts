import type { Plugin } from "@crafts/game-app";

/**
 * System groups used for both the client and the server
 */
export type CommonSystemGroups = "fixed";

/**
 * Plugin type for both the server and client.
 */
export type CommonPlugin = Plugin<CommonSystemGroups>;

// All the plugins go here:
export * from "./game-config";
export * from "./world-entities";
export {
  Physics,
  RigidBody,
  DynamicRigidBody,
  FixedRigidBody,
  Collider,
  CuboidCollider,
  pluginPhysics,
} from "./physics";
export { pluginFixedUpdate } from "./fixed-update";
