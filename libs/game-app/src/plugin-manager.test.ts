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
