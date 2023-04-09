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
  _label: string;
  _after: Set<string>;
  _before: Set<string>;

  /**
   * Set the label of the system.
   *
   * @param label - The label to set
   * @returns - The system itself
   */
  label: (label: string) => this;

  /**
   * Systems that should run before this system.
   *
   * @param systems - The systems to run before this system
   * @returns - The system itself
   */
  after: (...systems: Array<string | SystemLike>) => this;

  /**
   * Run this system before the given systems.
   *
   * @param systems - The systems to run after this system
   * @returns - The system itself
   */
  before: (...systems: Array<string | SystemLike>) => this;

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
    public _label = generateLabel();
    public readonly _after = new Set<string>();
    public readonly _before = new Set<string>();

    public label(label: string): this {
      this._label = label;
      return this;
    }

    public after(...systems: Array<string | SystemLike>): this {
      for (const system of systems) {
        const label = typeof system === "string" ? system : system._label;
        this._after.add(label);
      }

      return this;
    }

    public before(...systems: Array<string | SystemLike>): this {
      for (const system of systems) {
        const label = typeof system === "string" ? system : system._label;
        this._before.add(label);
      }

      return this;
    }

    public clone(): unknown {
      const cloned = super.clone();

      cloned._label = this._label;
      for (const system of this._after) {
        cloned._after.add(system);
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
  public clone(): System<Q> {
    return new System<Q>(this.queries, this.callback);
  }
}

/**
 * A set of ECS systems.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-interface
export interface SystemSet extends SystemLike {}
@makeSystemLike
export class SystemSet implements SystemLike {
  public readonly systems = new Set<SystemLike>();
  private dirty = false;
  private handles: Ecs.SystemHandle[] = [];

  public clone(): SystemSet {
    const systemSet = new SystemSet();
    systemSet.dirty = true;
    for (const system of this.systems) {
      systemSet.add(system.clone());
    }

    return systemSet;
  }

  /**
   * Add a new system-like object to the system set.
   * @returns - The system itself
   */
  public add(system: SystemLike): this {
    this.systems.add(system);
    this.dirty = true;
    return this;
  }

  /**
   * Makes a callable handle for this system set.
   *
   * @param world - The world to run the systems on
   * @returns - A callable handle to execute this system set
   */
  public getHandle(world: Ecs.World, initialize = false): Ecs.SystemHandle {
    if (initialize) {
      this.ensureNotDirty(world);
    }

    return () => {
      this.ensureNotDirty(world);

      for (const handle of this.handles) {
        handle();
      }
    };
  }

  /**
   * Ensures that the system set is not dirty.
   */
  private ensureNotDirty(world: Ecs.World): void {
    if (!this.dirty) {
      return;
    }

    const handleMap = new Map(
      [...this.systems].map((system) => [
        this.createHandle(world, system),
        system,
      ])
    );

    this.handles = [...reorderHandles(handleMap).keys()];
    this.dirty = false;
  }

  /**
   * Utility function to create a handle for a system-like object.
   */
  private createHandle(world: Ecs.World, system: SystemLike): Ecs.SystemHandle {
    if (system instanceof System) {
      return world.addSystem(system);
    }

    if (system instanceof SystemSet) {
      return system.getHandle(world);
    }

    throw new TypeError("Unsupported system-like object");
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
function reorderHandles(handles: Map<Ecs.SystemHandle, SystemLike>) {
  const dependencyLevels: Array<Array<[Ecs.SystemHandle, SystemLike]>> = [];
  const processedSystems = new Set<string>();
  const pendingHandles = new Map(handles.entries());

  const globalRunAfter = new SetMap<string, string>();
  for (const system of handles.values()) {
    for (const label of system._before) {
      globalRunAfter.get(label).add(system._label);
    }
  }

  while (pendingHandles.size > 0) {
    const currentLevel = new Map<Ecs.SystemHandle, SystemLike>();
    const missingDependencies = new Map<string, Set<string>>();

    for (const [handle, system] of pendingHandles.entries()) {
      const missingSystems = new Set<string>();
      const globalAfter = globalRunAfter.get(system._label);

      for (const label of [...system._after, ...globalAfter]) {
        if (!processedSystems.has(label)) {
          missingSystems.add(label);
        }
      }

      if (missingSystems.size > 0) {
        missingDependencies.set(system._label, missingSystems);
      } else {
        pendingHandles.delete(handle);
        currentLevel.set(handle, system);
        processedSystems.add(system._label);
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
  const systemSet = new SystemSet();
  const handle = systemSet.getHandle(world, true);

  // The function to invoke the system group
  const systemGroup = () => {
    handle();
  };

  // The function to add a system to the system group
  systemGroup.add = (system: SystemLike) => {
    systemSet.add(system);
    return systemGroup;
  };

  return systemGroup;
}
