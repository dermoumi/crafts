import PluginManager from "./plugin-manager";
import { createSystemGroup } from "./system-group";
import * as Ecs from "@crafts/ecs";

describe("Plugin manager", () => {
  it("registers plugins", () => {
    const myPlugin = vi.fn();

    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    new PluginManager(groups).add(myPlugin).init();

    expect(myPlugin).toHaveBeenCalledTimes(1);
  });

  it("runs systems", () => {
    const mySystem = vi.fn();

    const world = new Ecs.World();
    const groups = { startup: createSystemGroup(world) };

    new PluginManager(groups)
      .add(({ startup }) => {
        startup.add({}, mySystem);
      })
      .init();

    expect(mySystem).not.toHaveBeenCalled();

    groups.startup();
    expect(mySystem).toHaveBeenCalledTimes(1);
  });
});
