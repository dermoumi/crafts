import * as Ecs from "@crafts/ecs";

/**
 * A group of ECS systems.
 * Invoking it will run all the systems in the group.
 */
export type SystemGroup = {
  (): void;

  /**
   * Add a new system to the system group.
   *
   * @param queries - The queries of the system to add
   * @param callback - The callback to run when the system is invoked
   * @returns - The group itself
   */
  add: <Q extends Ecs.SystemQuery>(
    queries: Q,
    callback: Ecs.SystemCallback<Q>
  ) => SystemGroup;
};

/**
 * A plugin for the game app.
 */
export type Plugin<T extends string> = (
  group: (name: T) => SystemGroup
) => void;

/**
 * A base game app.
 *
 * @typeParam T - The allowed group names for this game app.
 */
export default abstract class GameApp<T extends string> {
  private world = new Ecs.World();
  private systemGroups = new Map<T, SystemGroup>();

  protected constructor() {
    this.getSystemGroup = this.getSystemGroup.bind(this);
  }

  /**
   * Add a plugin to the game app.
   *
   * @param plugin - The plugin to add
   * @returns The game app itself
   */
  protected addPlugin(plugin: Plugin<T>): this {
    plugin(this.getSystemGroup);

    return this;
  }

  /**
   * Creates or retrieves a system group by its name.
   *
   * @param name - The name of the system group
   * @returns A system group with the given name
   */
  public getSystemGroup(name: T): SystemGroup {
    // If the system group exists, just return it
    const systemGroup = this.systemGroups.get(name);
    if (systemGroup) {
      return systemGroup;
    }

    // The set to store system handles in
    const handles = new Set<Ecs.SystemHandle>();

    // The function to invoke the system group
    const group = () => {
      for (const handle of handles) {
        handle();
      }
    };

    // The function to add a system to the system group
    group.add = <Q extends Ecs.SystemQuery>(
      queries: Q,
      callback: Ecs.SystemCallback<Q>
    ) => {
      const handle = this.world.addSystem(queries, callback);
      handles.add(handle);

      // Return the group itself
      return group;
    };

    // Save the group to retrieve it later if needed
    this.systemGroups.set(name, group);

    return group;
  }
}
