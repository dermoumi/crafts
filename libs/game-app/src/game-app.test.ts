import GameApp from "./game-app";
import { System } from "./system";
import { Schedulers } from "./resources";
import { World } from "@crafts/ecs";

describe("GameApp", () => {
  it("cleans the world on stop()", () => {
    const spyWorldClear = vi.spyOn(World.prototype, "clear");

    const game = new GameApp();
    game.run();
    expect(spyWorldClear).not.toHaveBeenCalled();

    game.stop();
    expect(spyWorldClear).toHaveBeenCalled();
  });

  it("can create and run a scheduler", () => {
    const callback = vi.fn();
    const testSystem = new System({}, callback);

    const game = new GameApp();
    const schedulerHandle = game.getScheduler("testScheduler");

    game.addSystem(testSystem, "testScheduler");
    expect(callback).not.toHaveBeenCalled();

    schedulerHandle();
    expect(callback).toHaveBeenCalled();
  });

  it("adds to the 'update' scheduler by default", () => {
    const callback = vi.fn();
    const testSystem = new System({}, callback);

    const game = new GameApp();
    const schedulerHandle = game.getScheduler("update");

    game.addSystem(testSystem);
    expect(callback).not.toHaveBeenCalled();

    schedulerHandle();
    expect(callback).toHaveBeenCalled();
  });

  it("exposes schedulers as a resource", () => {
    const callback = vi.fn();
    const testSystem = new System({}, callback);

    const game = new GameApp();
    const resource = game.world.resources.get(Schedulers);
    const scheduler = resource.get("update");

    game.addSystem(testSystem, "update");
    expect(callback).not.toHaveBeenCalled();

    scheduler();
    expect(callback).toHaveBeenCalled();
  });

  it("adds systems to the startup scheduler", () => {
    const callback = vi.fn();
    const testSystem = new System({}, callback);

    const game = new GameApp();
    const schedulerHandle = game.getScheduler("startup");

    game.addStartupSystem(testSystem);
    expect(callback).not.toHaveBeenCalled();

    schedulerHandle();
    expect(callback).toHaveBeenCalled();
  });

  it("runs the startup scheduler on run()", () => {
    const callback = vi.fn();
    const testSystem = new System({}, callback);

    const game = new GameApp();

    game.addStartupSystem(testSystem);
    expect(callback).not.toHaveBeenCalled();

    game.run();
    expect(callback).toHaveBeenCalled();
  });

  it("calls added plugins", () => {
    const callback = vi.fn();
    const game = new GameApp();

    game.addPlugin(callback);
    expect(callback).toHaveBeenCalled();
  });
});
