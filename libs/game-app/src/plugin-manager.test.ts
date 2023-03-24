import type { Plugin } from "./plugin-manager";
import PluginManager from "./plugin-manager";
import { createSystemGroup } from "./system-group";
import * as Ecs from "@crafts/ecs";

describe("Plugin manager", () => {
  it("registers plugins", () => {
    const myPlugin = vi.fn();

    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    new PluginManager(groups, world).add(myPlugin).init();

    expect(myPlugin).toHaveBeenCalledTimes(1);
  });

  it("runs the onInit hook", () => {
    const myPlugin = vi.fn();

    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    new PluginManager(groups, world)
      .add(({ onInit }) => {
        onInit(myPlugin);
      })
      .init();

    expect(myPlugin).toHaveBeenCalledTimes(1);
  });

  it("runs the cleanup hook", () => {
    const myCleanupFunc = vi.fn();

    const world = new Ecs.World();
    const groups = { cleanup: createSystemGroup(world) };

    const pluginManager = new PluginManager(groups, world).add(({ onInit }) => {
      onInit(() => myCleanupFunc);
    });

    pluginManager.init();
    expect(myCleanupFunc).not.toHaveBeenCalled();

    pluginManager.cleanup();
    expect(myCleanupFunc).toHaveBeenCalledTimes(1);
  });

  it("runs systems", () => {
    const mySystem = vi.fn();

    const world = new Ecs.World();
    const groups = { update: createSystemGroup(world) };

    new PluginManager(groups, world)
      .add((_, { update }) => {
        update.add({}, mySystem);
      })
      .init();

    expect(mySystem).not.toHaveBeenCalled();

    groups.update();
    expect(mySystem).toHaveBeenCalledTimes(1);
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

  it("initializes dependencies after the dependent plugin even if it was added after", () => {
    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    new PluginManager(groups, world)
      .add(testPlugin) // Add testPlugin first
      .add(depPlugin)
      .init();

    expect(orderArray).toEqual(["depPlugin", "testPlugin"]);
  });

  it("initializes dependencies after the dependent plugin even if it was added after", () => {
    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    new PluginManager(groups, world)
      .add(depPlugin)
      .add(testPlugin) // Add testPlugin last
      .init();

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

  it("initializes dependent plugin once after its dependencies, even if added before", () => {
    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    new PluginManager(groups, world)
      .add(testPlugin) // Add testPlugin first
      .add(depPlugin1)
      .add(depPlugin2)
      .init();

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

    expect(() => {
      new PluginManager(groups, world).add(testPlugin).init();
    }).toThrow("The following dependencies are missing: depPlugin");
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

    expect(() => {
      new PluginManager(groups, world).add(testPlugin).add(depPlugin).init();
    }).toThrow("The following dependencies are missing: depPlugin, testPlugin");
  });
});
