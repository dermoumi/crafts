import type { Plugin } from "./plugin-manager";
import GameApp from "./game-app";

describe("GameApp", () => {
  it("creats a startup group", () => {
    // To make sure that the plugin was indeed called
    const callCheck = vi.fn();

    const testPlugin: Plugin<"startup"> = ({ startup }) => {
      callCheck();
      expect(startup).toBeDefined();
      expect(startup).toBeInstanceOf(Function);
      expect(startup).toHaveProperty("add");
    };

    const game = new GameApp().addPlugin(testPlugin);
    game.run();

    expect(callCheck).toHaveBeenCalled();
  });

  it("invokes the startup group on run()", () => {
    const startupFunc = vi.fn();

    const testPlugin: Plugin<"startup"> = ({ startup }) => {
      startup.add({}, startupFunc);
    };

    const game = new GameApp().addPlugin(testPlugin);
    expect(startupFunc).not.toHaveBeenCalled();

    game.run();
    expect(startupFunc).toHaveBeenCalled();
  });

  it("creates a cleanup group", () => {
    // To make sure that the plugin was indeed called
    const callCheck = vi.fn();

    const testPlugin: Plugin<"cleanup"> = ({ cleanup }) => {
      callCheck();

      expect(cleanup).toBeDefined();
      expect(cleanup).toBeInstanceOf(Function);
      expect(cleanup).toHaveProperty("add");
    };

    const game = new GameApp().addPlugin(testPlugin);
    game.run();

    expect(callCheck).toHaveBeenCalled();
  });

  it("invokes the cleanup group on stop()", () => {
    const cleanupFunc = vi.fn();

    const testPlugin: Plugin<"cleanup"> = ({ cleanup }) => {
      cleanup.add({}, cleanupFunc);
    };

    const game = new GameApp().addPlugin(testPlugin);
    game.run();
    expect(cleanupFunc).not.toHaveBeenCalled();

    game.stop();
    expect(cleanupFunc).toHaveBeenCalled();
  });
});

describe("GameApp plugins", () => {
  it("cannot reassign system groups", () => {
    const testPlugin: Plugin<"startup"> = (groups) => {
      const dummySystem = vi.fn();

      // @ts-expect-error - We want to test assignment outside typescript
      groups.startup = dummySystem;
    };

    const game = new GameApp().addPlugin(testPlugin);

    expect(() => game.run()).toThrowError("Cannot set system groups");
  });

  it("cannot add new system groups", () => {
    const testPlugin: Plugin<"startup" | "newGroup"> = (groups) => {
      const dummySystem = vi.fn();

      // @ts-expect-error - We want to test assignment outside typescript
      groups.newGroup = dummySystem;
    };

    const game = new GameApp().addPlugin(testPlugin);

    expect(() => game.run()).toThrowError("Cannot set system groups");
  });

  it("can retrieve non-registered system groups", () => {
    // To make sure that the plugin was indeed called
    const callCheck = vi.fn();

    const testPlugin: Plugin<"startup" | "newGroup"> = ({ newGroup }) => {
      callCheck();

      expect(newGroup).toBeDefined();
      expect(newGroup).toBeInstanceOf(Function);
      expect(newGroup).toHaveProperty("add");
    };

    const game = new GameApp().addPlugin(testPlugin);
    game.run();

    expect(callCheck).toHaveBeenCalled();
  });
});
