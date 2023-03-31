import { SetMap } from "@crafts/default-map";
import type { World } from "@crafts/ecs";
import type { SystemGroup } from "./system-group";

/**
 * A handler to initalize a plugin.
 */
export type OnInitHandler = (
  world: World
) => Promise<() => void> | Promise<void> | (() => void) | void;

/**
 * Options to register an OnInit handler.
 */
export type OnInitOptions = {
  name?: string;
  deps?: string[];
};

/**
 * A function to register OnInit handlers.
 */
export type OnInit = (handler: OnInitHandler, options?: OnInitOptions) => void;

/**
 * A plugin for the game app.
 */
export type Plugin<T extends string = string> = {
  (
    registry: { onInit: OnInit },
    groups: { readonly [K in T]: SystemGroup }
  ): Promise<void> | void;
};

/**
 * A plugin manager
 *
 * @typeParam T - The allowed group names for this plugin manager
 */
export default class PluginManager<T extends string> {
  private systemGroups: {
    readonly [K in T]: SystemGroup;
  };

  private readonly world: World;
  private readonly cleanupHandlers: Array<() => void> = [];
  private plugins: Array<Plugin<T>> = [];

  public constructor(systemGroups: Record<T, SystemGroup>, world: World) {
    this.systemGroups = systemGroups;
    this.world = world;
  }

  /**
   * Add a plugin.
   *
   * @param plugin - The plugin to add
   * @returns The game app itself
   */
  public add(plugin: Plugin<T>): this {
    this.plugins.push(plugin);

    return this;
  }

  /**
   * Initialize all the plugins.
   */
  public async init(): Promise<void> {
    const addedDependencies = new Set<string>();
    const pendingHandlers = new SetMap<
      string,
      [OnInitHandler, OnInitOptions]
    >();

    const initHandlers: OnInitHandler[] = [];
    const onInit: OnInit = (handler, options) => {
      // Check if all the dependencies are met.
      if (options !== undefined) {
        const missingDependency = options.deps?.find(
          (dep) => !addedDependencies.has(dep)
        );

        // If we have at least one missing dependency,
        // schedule this handler to be called after that dependency is added.
        if (missingDependency !== undefined) {
          pendingHandlers.get(missingDependency).add([handler, options]);
          return;
        }
      }

      // Add the init handler
      initHandlers.push(handler);

      // If the dependency has a name, register it as added.
      const name = options?.name;
      if (name !== undefined) {
        addedDependencies.add(name);

        // If this dependency has pending dependants,
        // try to add them now.
        if (pendingHandlers.has(name)) {
          for (const [subHandler, subOptions] of pendingHandlers.get(name)) {
            onInit(subHandler, subOptions);
          }

          pendingHandlers.delete(name);
        }
      }
    };

    for (const plugin of this.plugins) {
      // eslint-disable-next-line no-await-in-loop
      await plugin({ onInit }, this.systemGroups);
    }

    for (const handler of initHandlers) {
      // eslint-disable-next-line no-await-in-loop
      const cleanup = await handler(this.world);
      if (cleanup !== undefined) {
        this.cleanupHandlers.unshift(cleanup);
      }
    }

    if (pendingHandlers.size > 0) {
      throw new Error(
        `The following dependencies are missing: ${[
          ...pendingHandlers.keys(),
        ].join(", ")}`
      );
    }
  }

  /**
   * Stops all the plugins.
   */
  public cleanup() {
    for (const handler of this.cleanupHandlers) {
      handler();
    }
  }
}
