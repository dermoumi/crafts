import type { SystemLike } from "./system";
import { Scheduler } from "./system";
import * as Ecs from "@crafts/ecs";
import { DefaultMap } from "@crafts/default-map";
import { Schedulers } from "./resources";

export type Plugin = (gameApp: GameApp) => void;

export default class GameApp {
  public world = new Ecs.World();
  public schedulers = new DefaultMap((_key: string) => new Scheduler());

  public constructor() {
    this.world.resources.addNew(Schedulers, this);
  }

  public addPlugin(plugin: Plugin): this {
    plugin(this);
    return this;
  }

  public run(): void {
    // Run the startup scheduler.
    const startup = this.getScheduler("startup");
    startup();
  }

  public stop(): void {
    this.world.clear();
  }

  /**
   * Add a system-like to a scheduler.
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
   * Add a sytsem-lke to the startup scheduler.
   */
  public addStartupSystem(system: SystemLike): this {
    return this.addSystem(system, "startup");
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
