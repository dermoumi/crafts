import type { SystemHandle } from "@crafts/ecs";
import type GameApp from "./game-app";
import { Resource } from "@crafts/ecs";
import { DefaultMap } from "@crafts/default-map";

/**
 * A resource that provides access to schedulers.
 */
export class Schedulers extends Resource {
  private readonly handlers: DefaultMap<string, SystemHandle>;

  public constructor(gameApp: GameApp) {
    super();

    this.handlers = new DefaultMap((key) => gameApp.getScheduler(key));
  }

  public get(name: string) {
    return this.handlers.get(name);
  }
}
