import type { Plugin } from "./plugin-manager";
import PluginManager from "./plugin-manager";
import { createSystemGroup } from "./system-group";
import * as Ecs from "@crafts/ecs";

describe("Plugin manager", () => {
  it("registers plugins", async () => {
    const myPlugin = vi.fn();

    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    const pluginManager = new PluginManager(groups, world).add(myPlugin);
    await pluginManager.init();

    expect(myPlugin).toHaveBeenCalledOnce();
  });

  it("registers async plugins", async () => {
    const myPluginCallback = vi.fn();
    const myPlugin: Plugin = async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      myPluginCallback();
    };

    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    const pluginManager = new PluginManager(groups, world).add(myPlugin);

    const initPromise = pluginManager.init();
    expect(myPluginCallback).not.toHaveBeenCalled();

    await initPromise;
    expect(myPluginCallback).toHaveBeenCalledOnce();
  });

  it("runs the onInit hook", async () => {
    const myPlugin = vi.fn();

    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    const pluginManager = new PluginManager(groups, world).add(({ onInit }) => {
      onInit(myPlugin);
    });
    await pluginManager.init();

    expect(myPlugin).toHaveBeenCalledTimes(1);
  });

  it("runs async onInit hooks", async () => {
    const myPlugin = vi.fn();

    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    const pluginManager = new PluginManager(groups, world).add(({ onInit }) => {
      onInit(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });

        myPlugin();
      });
    });

    const initPromise = pluginManager.init();
    expect(myPlugin).not.toHaveBeenCalled();

    await initPromise;
    expect(myPlugin).toHaveBeenCalledTimes(1);
  });

  it("runs the cleanup hook", async () => {
    const myCleanupFunc = vi.fn();

    const world = new Ecs.World();
    const groups = { cleanup: createSystemGroup(world) };

    const pluginManager = new PluginManager(groups, world).add(({ onInit }) => {
      onInit(() => myCleanupFunc);
    });

    await pluginManager.init();
    expect(myCleanupFunc).not.toHaveBeenCalled();

    await pluginManager.cleanup();
    expect(myCleanupFunc).toHaveBeenCalledTimes(1);
  });

  it("runs async cleanup hooks", async () => {
    const myCleanupFunc = vi.fn();

    const world = new Ecs.World();
    const groups = { cleanup: createSystemGroup(world) };

    const pluginManager = new PluginManager(groups, world).add(({ onInit }) => {
      onInit(() => async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });

        myCleanupFunc();
      });
    });

    await pluginManager.init();
    expect(myCleanupFunc).not.toHaveBeenCalled();

    const cleanupPromise = pluginManager.cleanup();
    expect(myCleanupFunc).not.toHaveBeenCalled();

    await cleanupPromise;
    expect(myCleanupFunc).toHaveBeenCalledTimes(1);
  });

  it("runs systems", async () => {
    const callback = vi.fn();
    const testSystem = new Ecs.System({}, callback);

    const world = new Ecs.World();
    const groups = { update: createSystemGroup(world) };

    const pluginManager = new PluginManager(groups, world).add(
      (_, { update }) => {
        update.addSystem(testSystem);
      }
    );
    await pluginManager.init();

    expect(callback).not.toHaveBeenCalled();

    groups.update();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("loading plugins with a single dependency", () => {
  let orderArray: string[] = [];

  afterEach(() => {
    orderArray = [];
  });

  const depPlugin: Plugin = ({ onInit }) => {
    onInit(
      () => {
        orderArray.push("depPlugin");
      },
      { name: "depPlugin" }
    );
  };

  const testPlugin: Plugin = ({ onInit }) => {
    onInit(
      () => {
        orderArray.push("testPlugin");
      },
      { name: "testPlugin", deps: ["depPlugin"] }
    );
  };

  it("initializes dependencies after the dependent plugin even if it was added after", async () => {
    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    const pluginManager = new PluginManager(groups, world)
      .add(testPlugin) // Add testPlugin first
      .add(depPlugin);
    await pluginManager.init();

    expect(orderArray).toEqual(["depPlugin", "testPlugin"]);
  });

  it("initializes dependencies after the dependent plugin even if it was added after", async () => {
    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    const pluginManager = new PluginManager(groups, world)
      .add(depPlugin)
      .add(testPlugin); // Add testPlugin last
    await pluginManager.init();

    expect(orderArray).toEqual(["depPlugin", "testPlugin"]);
  });

  it("awaits async onInit hooks, and in order", async () => {
    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    const asyncDepPlugin: Plugin = ({ onInit }) => {
      onInit(
        async () => {
          await new Promise((resolve) => {
            setTimeout(resolve, 0);
          });

          orderArray.push("depPlugin");
        },
        { name: "depPlugin" }
      );
    };

    const asyncTestPlugin: Plugin = ({ onInit }) => {
      onInit(
        async () => {
          await new Promise((resolve) => {
            setTimeout(resolve, 0);
          });

          orderArray.push("testPlugin");
        },
        { name: "testPlugin", deps: ["depPlugin"] }
      );
    };

    const pluginManager = new PluginManager(groups, world)
      .add(asyncTestPlugin)
      .add(asyncDepPlugin);

    await pluginManager.init();

    expect(orderArray).toEqual(["depPlugin", "testPlugin"]);
  });
});

describe("loading plugins with multiple dependencies", () => {
  let orderArray: string[] = [];

  afterEach(() => {
    orderArray = [];
  });

  const depPlugin1: Plugin = ({ onInit }) => {
    onInit(
      () => {
        orderArray.push("depPlugin1");
      },
      { name: "depPlugin1" }
    );
  };

  const depPlugin2: Plugin = ({ onInit }) => {
    onInit(
      () => {
        orderArray.push("depPlugin2");
      },
      { name: "depPlugin2" }
    );
  };

  const testPlugin: Plugin = ({ onInit }) => {
    onInit(
      () => {
        orderArray.push("testPlugin");
      },
      { name: "testPlugin", deps: ["depPlugin1", "depPlugin2"] }
    );
  };

  it("initializes dependent plugin once after its dependencies, even if added before", async () => {
    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    const pluginManager = new PluginManager(groups, world)
      .add(testPlugin) // Add testPlugin first
      .add(depPlugin1)
      .add(depPlugin2);
    await pluginManager.init();

    expect(orderArray).toEqual(["depPlugin1", "depPlugin2", "testPlugin"]);
  });
});

describe("loading plugins with circular dependencies", () => {
  it("throws an error when a dependency is not found", () => {
    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    const testPlugin: Plugin = ({ onInit }) => {
      onInit(vi.fn(), { name: "testPlugin", deps: ["depPlugin"] });
    };

    const pluginManager = new PluginManager(groups, world).add(testPlugin);

    expect(pluginManager.init()).rejects.toThrow(
      "The following dependencies are missing: depPlugin"
    );
  });

  it("throws an error when a dependency depends on itself indirectly", () => {
    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    const depPlugin: Plugin = ({ onInit }) => {
      onInit(vi.fn(), { name: "depPlugin", deps: ["testPlugin"] });
    };

    const testPlugin: Plugin = ({ onInit }) => {
      onInit(vi.fn(), { name: "testPlugin", deps: ["depPlugin"] });
    };

    const pluginManager = new PluginManager(groups, world)
      .add(testPlugin)
      .add(depPlugin);

    expect(pluginManager.init()).rejects.toThrow(
      "The following dependencies are missing: depPlugin, testPlugin"
    );
  });
});
