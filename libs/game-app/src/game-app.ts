import type { SystemGroup } from "./system-group";
import type { Plugin } from "./plugin-manager";
import { createSystemGroup } from "./system-group";
import PluginManager from "./plugin-manager";
import * as Ecs from "@crafts/ecs";

export default class GameApp<T extends string> {
  private plugins: PluginManager<T>;
  public world = new Ecs.World();
  public groupsProxy: Record<T, SystemGroup>;
  public groups: {
    startup: SystemGroup;
    cleanup: SystemGroup;
    [K: string]: SystemGroup;
  };

  public constructor() {
    this.groups = {
      startup: createSystemGroup(this.world),
      cleanup: createSystemGroup(this.world),
    };

    // This proxy will create new system groups on demand.
    this.groupsProxy = new Proxy(this.groups, {
      get: (target, prop: T) => {
        if (prop in target) {
          return target[prop];
        }

        const system = createSystemGroup(this.world);
        target[prop] = system;
        return system;
      },
      set: () => {
        throw new Error("Cannot set system groups");
      },
    }) as Record<T, SystemGroup>;

    // Create the plugin manager using the proxy.
    this.plugins = new PluginManager(this.groupsProxy);
  }

  public addPlugin(plugin: Plugin<T>) {
    this.plugins.add(plugin);

    return this;
  }

  public run() {
    this.plugins.init();

    this.groups.startup();
  }

  public stop() {
    this.groups.cleanup();
  }
}
