import type { ClientSystemGroups } from ".";

import { ChildNode, MainScene, MeshNode, Node, pluginThree } from "./three";
import { SetMap } from "@crafts/default-map";
import { GameApp } from "@crafts/game-app";
import { WebGLRenderer } from "three";

// Mock the three.js WebGLRenderer
vi.mock("three", async () => {
  const threeModule = await import("three");

  return {
    ...threeModule,
    WebGLRenderer: class {
      public domElement = document.createElement("canvas");

      public setSize() {
        // Nothing to do
      }

      public render() {
        // Nothing to do
      }

      public dispose() {
        // Nothing to do
      }
    },
  };
});

describe("Threejs plugin", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      setTimeout(() => {
        callback(0);
      }, 1000 / 60);

      return 0;
    });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("resizes the renderer when the window is resized", async () => {
    const eventListeners = new SetMap<string, any>();
    const addEventListener = vi
      .spyOn(window, "addEventListener")
      .mockImplementation((type, listener) => {
        eventListeners.get(type).add(listener);
      });
    const spySetSize = vi.spyOn(WebGLRenderer.prototype, "setSize");

    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    await game.run();

    expect(addEventListener).toHaveBeenCalled();
    for (const listener of eventListeners.get("resize")) {
      listener();
    }

    expect(spySetSize).not.toHaveBeenCalled();

    game.groupsProxy.update();
    expect(spySetSize).toHaveBeenCalled();
  });

  it("mounts the renderer to the DOM", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    await game.run();

    game.groupsProxy.update();

    expect(document.body.innerHTML).toBe("<canvas></canvas>");
  });

  it("adds nodes to the main scene when ChildNode is absent", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    await game.run();

    game.groupsProxy.update();
    const [sceneEntity] = game.world.query(Node, MainScene.present());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { node: mainScene } = sceneEntity!.get(Node);

    const mesh = game.world.spawn().add(MeshNode);
    game.groupsProxy.update();

    expect(mainScene.children).toContain(mesh.get(Node).node);
  });

  it("nests nodes within others when ChildNode is present", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    await game.run();

    game.groupsProxy.update();
    const [sceneEntity] = game.world.query(Node, MainScene.present());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { node: mainScene } = sceneEntity!.get(Node);

    const parent = game.world.spawn().add(MeshNode);
    const child = game.world.spawn().add(MeshNode).addNew(ChildNode, parent);
    game.groupsProxy.update();

    expect(parent.get(Node).node.children).toContain(child.get(Node).node);
    expect(mainScene.children).not.toContain(child.get(Node).node);
  });

  it("renders each update", async () => {
    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    await gameApp.run();

    const render = vi.spyOn(WebGLRenderer.prototype, "render");

    gameApp.groupsProxy.update();
    gameApp.groupsProxy.postupdate();
    expect(render).toHaveBeenCalled();
  });

  it("removes event listeners when the game is stopped", async () => {
    const eventListeners = new SetMap<string, any>();
    const addEventListener = vi
      .spyOn(window, "addEventListener")
      .mockImplementation((type, listener) => {
        eventListeners.get(type).add(listener);
      });
    const removeEventListener = vi
      .spyOn(window, "removeEventListener")
      .mockImplementation((type, listener) => {
        expect(eventListeners.get(type).has(listener)).toBe(true);
      });

    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    await game.run();
    expect(addEventListener).toHaveBeenCalled();

    await game.stop();
    expect(removeEventListener).toHaveBeenCalled();
  });

  it("removes the renderer from the DOM when the game is stopped", async () => {
    const disposeRenderer = vi.spyOn(WebGLRenderer.prototype, "dispose");

    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    await game.run();

    game.groupsProxy.update();
    expect(document.body.innerHTML).toBe("<canvas></canvas>");

    await game.stop();
    expect(document.body.innerHTML).toBe("");
    expect(disposeRenderer).toHaveBeenCalledOnce();
  });
});
