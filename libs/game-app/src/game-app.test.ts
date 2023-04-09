import type { Plugin } from "./plugin-manager";
import GameApp from "./game-app";
import { System, createSystemGroup } from "./system";
import { Schedulers } from "./resources";

describe("GameApp", () => {
  it("invokes the init handlers on run()", async () => {
    const startupFunc = vi.fn();

    const testPlugin: Plugin = ({ onInit }) => {
      onInit(startupFunc);
    };

    const game = new GameApp().addPlugin(testPlugin);
    expect(startupFunc).not.toHaveBeenCalled();

    await game.run();
    expect(startupFunc).toHaveBeenCalled();
  });

  it("invokes the cleanup group on stop()", async () => {
    const cleanupFunc = vi.fn();

    const testPlugin: Plugin = ({ onInit }) => {
      onInit(() => cleanupFunc);
    };

    const game = new GameApp().addPlugin(testPlugin);
    await game.run();
    expect(cleanupFunc).not.toHaveBeenCalled();

    await game.stop();
    expect(cleanupFunc).toHaveBeenCalled();
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
});

describe("GameApp plugins", () => {
  it("can retrieve existing groups", async () => {
    const testSystem = new System({}, vi.fn());
    const testPlugin: Plugin<"startup"> = (_, { startup }) => {
      startup.add(testSystem);
    };

    const game = new GameApp();
    const startupGroup = createSystemGroup(game.world);
    const startupAddMock = vi.spyOn(startupGroup, "add");
    game.groups.startup = startupGroup;

    game.addPlugin(testPlugin);
    await game.run();

    expect(startupAddMock).toHaveBeenCalledOnce();
  });

  it("cannot reassign system groups", () => {
    const testPlugin: Plugin<"startup"> = (_, groups) => {
      const dummySystem = vi.fn();

      // @ts-expect-error - We want to test assignment outside typescript
      groups.startup = dummySystem;
    };

    const game = new GameApp().addPlugin(testPlugin);

    expect(game.run()).rejects.toThrowError("Cannot set system groups");
  });

  it("cannot add new system groups", () => {
    const testPlugin: Plugin<"startup" | "newGroup"> = (_, groups) => {
      const dummySystem = vi.fn();

      // @ts-expect-error - We want to test assignment outside typescript
      groups.newGroup = dummySystem;
    };

    const game = new GameApp().addPlugin(testPlugin);

    expect(game.run()).rejects.toThrowError("Cannot set system groups");
  });

  it("can retrieve non-registered system groups", async () => {
    // To make sure that the plugin was indeed called
    const callCheck = vi.fn();

    const testPlugin: Plugin<"newGroup"> = (_, { newGroup }) => {
      callCheck();

      expect(newGroup).toBeDefined();
      expect(newGroup).toBeInstanceOf(Function);
      expect(newGroup).toHaveProperty("add");
    };

    const game = new GameApp().addPlugin(testPlugin);
    await game.run();

    expect(callCheck).toHaveBeenCalled();
  });
});
