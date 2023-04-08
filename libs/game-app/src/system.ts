import { SetMap } from "@crafts/default-map";
import * as Ecs from "@crafts/ecs";

/**
 * Utility function to generate the label for a system.
 *
 * @internal
 * @returns - A random label
 */
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
  before: Set<string>;

  /**
   * Set the label of the system.
   *
   * @param label - The label to set
   * @returns - The system itself
   */
  setLabel: (label: string) => this;

  /**
   * Systems that should run before this system.
   *
   * @param systems - The systems to run before this system
   * @returns - The system itself
   */
  runAfter: (...systems: Array<string | SystemLike>) => this;

  /**
   * Run this system before the given systems.
   *
   * @param systems - The systems to run after this system
   * @returns - The system itself
   */
  runBefore: (...systems: Array<string | SystemLike>) => this;

  /**
   * Clone the system.
   *
   * @returns - A clone of the system
   */
  clone: () => SystemLike;
}

/**
 * A decorator to implement a SystemLike interface onto a class.
 */
function makeSystemLike<T extends new (...args: any) => any>(
  Base: T,
  _: ClassDecoratorContext
) {
  return class extends Base {
    public label = generateLabel();
    public readonly after = new Set<string>();
    public readonly before = new Set<string>();

    public setLabel(label: string): this {
      this.label = label;
      return this;
    }

    public runAfter(...systems: Array<string | SystemLike>): this {
      for (const system of systems) {
        const label = typeof system === "string" ? system : system.label;
        this.after.add(label);
      }

      return this;
    }

    public runBefore(...systems: Array<string | SystemLike>): this {
      for (const system of systems) {
        const label = typeof system === "string" ? system : system.label;
        this.before.add(label);
      }

      return this;
    }

    public clone(): any {
      const cloned = super.clone();

      cloned.label = this.label;
      for (const system of this.after) {
        cloned.after.add(system);
      }

      return cloned;
    }
  };
}

/**
 * A wrapper around the ECS system class.
 *
 * With the added ability to add properties to the system.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface System<Q extends Ecs.SystemQuery>
  extends SystemLike,
    Ecs.System<Q> {}
@makeSystemLike
export class System<Q extends Ecs.SystemQuery> extends Ecs.System<Q> {
  /**
   * Clone the system.
   */
  public clone(): System<Q> {
    return new System<Q>(this.queries, this.callback);
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

  const globalRunAfter = new SetMap<string, string>();
  for (const system of handles.values()) {
    for (const label of system.before) {
      globalRunAfter.get(label).add(system.label);
    }
  }

  while (pendingHandles.size > 0) {
    const currentLevel = new Map<Ecs.SystemHandle, System<any>>();
    const missingDependencies = new Map<string, Set<string>>();

    for (const [handle, system] of pendingHandles.entries()) {
      const missingSystems = new Set<string>();
      const globalAfter = globalRunAfter.get(system.label);

      for (const label of [...system.after, ...globalAfter]) {
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
