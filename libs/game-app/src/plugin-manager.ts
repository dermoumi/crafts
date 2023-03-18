import type { SystemGroup } from "./system-group";

/**
 * A plugin for the game app.
 */
export type Plugin<T extends string> = {
  (groups: { readonly [K in T]: SystemGroup }): void;
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

  private plugins: Array<Plugin<T>> = [];

  public constructor(systemGroups: Record<T, SystemGroup>) {
    this.systemGroups = systemGroups;
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
    for (const plugin of this.plugins) {
      plugin(this.systemGroups);
    }
  }
}
