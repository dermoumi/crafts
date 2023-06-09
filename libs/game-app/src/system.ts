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
  _priority: number;
  _after: Set<string>;
  _before: Set<string>;
  _runConditions: Set<(world: Ecs.World) => boolean>;

  /**
   * Set the label of the system.
   *
   * @param label - The label to set
   * @returns - The system itself
   */
  label: (label: string) => this;

  /**
   * Set the priority of the system.
   * Systems with a higher priority will run first.
   *
   * @param priority - The priority to set
   * @returns - The system itself
   */
  priority: (priority: number) => this;

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

  /**
   * Add a run condition to the system.
   *
   * @param condition - The condition to add
   */
  runIf: (condition: (world: Ecs.World) => boolean) => this;

  /**
   * Add an inverted run condition to the system.
   *
   * @param condition - The condition to add
   */
  runUnless: (condition: (world: Ecs.World) => boolean) => this;

  /**
   * Make a callable handle.
   *
   * @param world - The world to run the system on
   * @returns - A callable handle
   */
  makeHandle: (world: Ecs.World) => Ecs.SystemHandle;
}

/**
 * A decorator to implement a SystemLike interface onto a class.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function makeSystemLike<T extends new (...args: any) => any>(
  Base: T,
  _: ClassDecoratorContext
) {
  return class extends Base {
    public _label = generateLabel();
    public _priority = 0;
    public readonly _after = new Set<string>();
    public readonly _before = new Set<string>();
    public readonly _runConditions = new Set<(world: Ecs.World) => boolean>();

    public label(label: string): this {
      this._label = label;
      return this;
    }

    public priority(priority: number): this {
      this._priority = priority;
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

      for (const system of this._before) {
        cloned._before.add(system);
      }

      return cloned;
    }

    public runIf(condition: (world: Ecs.World) => boolean): this {
      this._runConditions.add(condition);

      return this;
    }

    public runUnless(condition: (world: Ecs.World) => boolean): this {
      return this.runIf((world) => !condition(world));
    }

    public makeHandle(world: Ecs.World): Ecs.SystemHandle {
      const originalHandle = super.makeHandle(world);
      let needsReset = false;

      const handle: Ecs.SystemHandle = () => {
        for (const condition of this._runConditions) {
          if (!condition(world)) {
            needsReset = true;
            return;
          }
        }

        if (needsReset) {
          needsReset = false;
          originalHandle.reset();
        }

        originalHandle(world);
      };

      handle.reset = () => {
        originalHandle.reset();
        return handle;
      };

      return handle;
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

  public makeHandle(world: Ecs.World): Ecs.SystemHandle {
    return world.addSystem(this);
  }

  /**
   * Utility condition to only run a system-like if the given resource exists.
   *
   * This is better than using a resource filter because it will not
   * have to maintain a query.
   *
   * @param resource - The resource to check for
   */
  public static resourcePresent(resource: Ecs.ResourceConstructor) {
    return (world: Ecs.World) => world.resources.has(resource);
  }

  /**
   * Utility condition to only run a system-like if the given resource
   * filter is satisfied.
   *
   * @param filter - The resource filter to check for
   */
  public static resourceFilter(
    ...filter: Ecs.FilterSet<Ecs.Resource>
  ): (world: Ecs.World) => boolean {
    let query: undefined | (() => void);

    return (world: Ecs.World) => {
      if (query === undefined) {
        query = world.resources.query(...filter);
      }

      return query() !== undefined;
    };
  }

  /**
   * Utility condition to only run a system-like if the given component
   * filter is satisfied.
   *
   * @param filter - The component filter to check for
   */
  public static componentFilter<T extends Ecs.FilterSet<Ecs.Component>>(
    ...filter: T
  ): (world: Ecs.World) => boolean {
    let query: undefined | Ecs.ResettableQuery<T>;

    return (world: Ecs.World) => {
      if (query === undefined) {
        query = world.query(...filter);
      }

      return query.size > 0;
    };
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
  private handles = new Map<SystemLike, Ecs.SystemHandle>();

  public clone(): SystemSet {
    const systemSet = new SystemSet();
    systemSet.dirty = true;
    for (const system of this.systems) {
      systemSet.with(system.clone());
    }

    return systemSet;
  }

  public makeHandle(world: Ecs.World): Ecs.SystemHandle {
    const handle: Ecs.SystemHandle = () => {
      this.ensureNotDirty(world);

      for (const systemHandle of this.handles.values()) {
        systemHandle();
      }
    };

    handle.reset = () => {
      this.ensureNotDirty(world);

      for (const systemHandle of this.handles.values()) {
        systemHandle.reset();
      }

      return handle;
    };

    return handle;
  }

  /**
   * Add a new system-like object to the system set.
   * @returns - The system itself
   */
  public with(system: SystemLike): this {
    this.systems.add(system);
    this.dirty = true;
    return this;
  }

  /**
   * Ensures that the system set is not dirty.
   *
   * @param world - The world to run the systems on
   */
  private ensureNotDirty(world: Ecs.World): void {
    if (!this.dirty) {
      return;
    }

    const handleMap = new Map(
      [...this.systems].map((system) => {
        const handle = this.handles.get(system) ?? system.makeHandle(world);
        return [system, handle];
      })
    );

    this.handles = this.reorderHandles(handleMap);
    this.dirty = false;
  }

  /**
   * Utility function to reorder a map of systems based on their dependencies.
   *
   * @internal
   * @param handles - The handles' map to reorder
   * @returns A new handles' map with the systems reordered
   */
  private reorderHandles(
    handles: Map<SystemLike, Ecs.SystemHandle>
  ): Map<SystemLike, Ecs.SystemHandle> {
    const dependencyLevels: Array<[SystemLike, Ecs.SystemHandle]> = [];
    const processedSystems = new Set<string>();
    const pendingSystems = new Map(
      [...handles.entries()].sort(([a], [b]) => b._priority - a._priority)
    );

    const globalRunAfter = new SetMap<string, string>();
    for (const system of handles.keys()) {
      for (const label of system._before) {
        globalRunAfter.get(label).add(system._label);
      }
    }

    while (pendingSystems.size > 0) {
      const currentLevel = new Map<SystemLike, Ecs.SystemHandle>();
      const missingDependencies = new Map<string, Set<string>>();

      for (const [system, handle] of pendingSystems.entries()) {
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
          pendingSystems.delete(system);
          currentLevel.set(system, handle);
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

      dependencyLevels.push(...currentLevel.entries());
    }

    return new Map(dependencyLevels);
  }
}

/**
 * A scheduler that runs systems in a specific order.
 *
 * @internal
 */
export class Scheduler {
  private readonly systemSet = new SystemSet();

  /**
   * Add a new system to the scheduler.
   *
   * @param system - The system to add
   * @returns The scheduler itself
   */
  public add(system: SystemLike): this {
    this.systemSet.with(system);
    return this;
  }

  /**
   * Get a handle to run the scheduler.
   *
   * @param world - The world to run the scheduler in
   * @returns A handle to run the scheduler
   */
  public makeHandle(world: Ecs.World): Ecs.SystemHandle {
    return this.systemSet.makeHandle(world);
  }
}
