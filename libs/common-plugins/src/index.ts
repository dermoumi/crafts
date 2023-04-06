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
export { GameConfig, pluginGameConfig } from "./game-config";
export { Position, Velocity, Rotation } from "./world-entities";
export {
  Physics,
  RigidBody,
  DynamicRigidBody,
  FixedRigidBody,
  Collider,
  CuboidCollider,
  pluginPhysics,
} from "./physics";
