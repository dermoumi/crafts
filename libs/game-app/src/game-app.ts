import type { SystemGroup, SystemLike } from "./system";
import { Scheduler, createSystemGroup } from "./system";
import type { Plugin } from "./plugin-manager";
import PluginManager from "./plugin-manager";
import * as Ecs from "@crafts/ecs";
import { DefaultMap } from "@crafts/default-map";

export default class GameApp<T extends string> {
  private plugins: PluginManager<T>;
  public world = new Ecs.World();
  public groupsProxy: Record<T, SystemGroup>;
  public groups: {
    [K: string]: SystemGroup;
  };

  public schedulers = new DefaultMap((_key: string) => new Scheduler());

  public constructor() {
    this.groups = {};

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
    this.plugins = new PluginManager(this.groupsProxy, this.world);
  }

  public addPlugin(plugin: Plugin<T>) {
    this.plugins.add(plugin);

    return this;
  }

  public async run(): Promise<void> {
    await this.plugins.init();
  }

  public async stop() {
    await this.plugins.cleanup();

    this.world.clear();
  }

  /**
   * Add a system like to a scheduler.
   *
   * @param system - The system to add
   * @param scheduler - The scheduler's name. Defaults to "update"
   * @returns This game app
   */
  public addSystem(system: SystemLike, scheduler = "update"): this {
    this.schedulers.get(scheduler).add(system);

    return this;
  }

  /**
   * Get a scheduler's handle.
   *
   * @param scheduler - The scheduler's name
   * @returns The scheduler's handle
   */
  public getScheduler(scheduler: string): Ecs.SystemHandle {
    return this.schedulers.get(scheduler).makeHandle(this.world);
  }
}
