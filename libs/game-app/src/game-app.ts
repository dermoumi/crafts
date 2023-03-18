import type { SystemGroup } from "./system-group";
import type { Plugin } from "./plugin-manager";
import { createSystemGroup } from "./system-group";
import PluginManager from "./plugin-manager";
import * as Ecs from "@crafts/ecs";

export default class GameApp<T extends string> {
  private plugins: PluginManager<T>;
  protected world = new Ecs.World();
  protected groups: {
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
    const groupsProxy = new Proxy(this.groups, {
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
    });

    // Create the plugin manager using the proxy.
    this.plugins = new PluginManager(groupsProxy as Record<T, SystemGroup>);
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
