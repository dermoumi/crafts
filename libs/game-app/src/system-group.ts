import type * as Ecs from "@crafts/ecs";

/**
 * A group of ECS systems.
 * Invoking it will run all the systems in the group.
 */
export type SystemGroup<A extends unknown[] = []> = {
  (...args: A): void;

  /**
   * Add a new system to the system group.
   *
   * @param queries - The queries of the system to add
   * @param callback - The callback to run when the system is invoked
   * @returns - The group itself
   */
  addSystem: <Q extends Ecs.SystemQuery>(system: Ecs.System<Q>) => SystemGroup;
};

/**
 * Creates a normal system group.
 */
export function createSystemGroup(world: Ecs.World): SystemGroup {
  // The set to store system handles in
  const handles = new Set<Ecs.SystemHandle>();

  // The function to invoke the system group
  const systemGroup = () => {
    for (const handle of handles) {
      handle();
    }
  };

  // The function to add a system to the system group
  systemGroup.addSystem = <Q extends Ecs.SystemQuery>(
    system: Ecs.System<Q>
  ) => {
    const handle = world.addSystem(system);
    handles.add(handle);

    // Return the group itself
    return systemGroup;
  };

  return systemGroup;
}
