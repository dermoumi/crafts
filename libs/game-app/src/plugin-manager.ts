import type { World } from "@crafts/ecs";
import type { SystemGroup } from "./system-group";

/**
 * A handler to initalize a plugin.
 */
export type OnInitHandler = (world: World) => (() => void) | void;

/**
 * A function to register OnInit handlers.
 */
export type OnInit = (
  handler: OnInitHandler,
  options?: {
    name?: string;
    deps?: string[];
  }
) => void;

/**
 * A plugin for the game app.
 */
export type Plugin<T extends string = string> = {
  (
    registry: { onInit: OnInit },
    groups: { readonly [K in T]: SystemGroup }
  ): void;
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
  public init() {
    const initHandlers: OnInitHandler[] = [];
    const onInit = (handler: OnInitHandler) => {
      initHandlers.push(handler);
    };

    for (const plugin of this.plugins) {
      plugin({ onInit }, this.systemGroups);
    }

    for (const handler of initHandlers) {
      const cleanup = handler(this.world);
      if (cleanup !== undefined) {
        this.cleanupHandlers.unshift(cleanup);
      }
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
