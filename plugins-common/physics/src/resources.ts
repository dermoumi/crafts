import * as Rapier from "@dimforge/rapier3d-compat";
import { Resource } from "@crafts/ecs";

/**
 * The physics world.
 */
export class Physics extends Resource {
  public world = new Rapier.World({ x: 0, y: -9.81, z: 0 });
}
