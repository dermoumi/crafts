import * as Ecs from "@crafts/ecs";

function generateLabel(): string {
  return Math.random().toString(36).slice(7) + Date.now().toString(36);
}

/**
 * A common interface for system-like objects.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface SystemLike {
  label: string;
  after: Set<string>;

  setLabel: (label: string) => this;
  runAfter: (...systems: Array<string | SystemLike>) => this;
  clone: () => SystemLike;
}

/**
 * A wrapper around the ECS system class.
 *
 * With the added ability to add properties to the system.
 */
export class System<Q extends Ecs.SystemQuery>
  extends Ecs.System<Q>
  implements SystemLike
{
  public label = generateLabel();
  public readonly after = new Set<string>();

  /**
   * Set the label of the system.
   *
   * @param label - The label to set
   * @returns - The system itself
   */
  public setLabel(label: string): this {
    this.label = label;
    return this;
  }

  /**
   * Systems that should run before this system.
   */
  public runAfter(...systems: Array<string | SystemLike>): this {
    for (const system of systems) {
      const label = typeof system === "string" ? system : system.label;
      this.after.add(label);
    }

    return this;
  }

  /**
   * Clone the system.
   */
  public clone(): System<Q> {
    const cloned = new System(this.queries, this.callback);
    cloned.label = this.label;
    for (const system of this.after) {
      cloned.after.add(system);
    }

    return cloned;
  }
}

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
  add: <Q extends Ecs.SystemQuery>(system: System<Q>) => SystemGroup;
};

/**
 * Utility function to reorder a map of systems based on their dependencies.
 *
 * @internal
 * @param handles - The handles' map to reorder
 * @returns A new handles' map with the systems reordered
 */
function reorderHandles(handles: Map<Ecs.SystemHandle, System<any>>) {
  const dependencyLevels: Array<Array<[Ecs.SystemHandle, System<any>]>> = [];
  const processedSystems = new Set<string>();
  const pendingHandles = new Map(handles.entries());

  while (pendingHandles.size > 0) {
    const currentLevel = new Map<Ecs.SystemHandle, System<any>>();
    const missingDependencies = new Map<string, Set<string>>();

    for (const [handle, system] of pendingHandles.entries()) {
      const missingSystems = new Set<string>();
      for (const label of system.after) {
        if (!processedSystems.has(label)) {
          missingSystems.add(label);
        }
      }

      if (missingSystems.size > 0) {
        missingDependencies.set(system.label, missingSystems);
      } else {
        pendingHandles.delete(handle);
        currentLevel.set(handle, system);
        processedSystems.add(system.label);
      }
    }

    if (currentLevel.size === 0) {
      const errorLines = [...missingDependencies.entries()]
        .map(
          ([system, dependencies]) =>
            ` - "${system}" needs: ${[...dependencies].join(", ")}`
        )
        .join("\n");

      throw new Error(
        `The following systems have missing dependencies:\n${errorLines}`
      );
    }

    dependencyLevels.push([...currentLevel.entries()]);
  }

  return new Map(dependencyLevels.flat());
}

/**
 * Creates a normal system group.
 */
export function createSystemGroup(world: Ecs.World): SystemGroup {
  let dirty = false;
  let handles = new Map<Ecs.SystemHandle, System<any>>();

  // The function to invoke the system group
  const systemGroup = () => {
    if (dirty) {
      handles = reorderHandles(handles);
      dirty = false;
    }

    for (const [handle] of handles) {
      handle();
    }
  };

  // The function to add a system to the system group
  systemGroup.add = <Q extends Ecs.SystemQuery>(system: System<Q>) => {
    const handle = world.addSystem(system);

    dirty = true;
    handles.set(handle, system);

    // Return the group itself
    return systemGroup;
  };

  return systemGroup;
}
