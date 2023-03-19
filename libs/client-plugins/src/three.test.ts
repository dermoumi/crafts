import type { ClientSystemGroups } from ".";
import {
  ChildNode,
  MainScene,
  MeshNode,
  RenderPosition,
  SceneNode,
  CameraNode,
  Node,
  pluginThree,
} from ".";
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

  it("resizes the renderer when the window is resized", () => {
    const eventListeners = new SetMap<string, any>();
    const addEventListener = vi
      .spyOn(window, "addEventListener")
      .mockImplementation((type, listener) => {
        eventListeners.get(type).add(listener);
      });
    const spySetSize = vi.spyOn(WebGLRenderer.prototype, "setSize");

    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    gameApp.run();

    expect(addEventListener).toHaveBeenCalled();
    for (const listener of eventListeners.get("resize")) {
      listener();
    }

    expect(spySetSize).not.toHaveBeenCalled();

    gameApp.groupsProxy.update();
    expect(spySetSize).toHaveBeenCalled();
  });

  it("mounts the renderer to the DOM", () => {
    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    gameApp.run();

    gameApp.groupsProxy.update();

    expect(document.body.innerHTML).toBe("<canvas></canvas>");
  });

  it("creates a ThreeJS camera when a CameraNode is added", () => {
    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    gameApp.run();

    const cameras = gameApp.world.query(Node, CameraNode.present());
    expect(cameras.size).toBe(0);

    // A main camera is autamatically added when the game starts
    gameApp.groupsProxy.update();
    expect(cameras.size).toBe(1);

    // Add a new camera
    gameApp.world.spawn().add(CameraNode);
    gameApp.groupsProxy.update();
    expect(cameras.size).toBe(2);
  });

  it("creates a ThreeJS scene when a SceneNode is added", () => {
    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    gameApp.run();

    const scenes = gameApp.world.query(Node, SceneNode.present());
    expect(scenes.size).toBe(0);

    // A main scene is autamatically added when the game starts
    gameApp.groupsProxy.update();
    expect(scenes.size).toBe(1);

    // Add a new scene
    gameApp.world.spawn().add(SceneNode);
    gameApp.groupsProxy.update();
    expect(scenes.size).toBe(2);
  });

  it("creates a ThreeJS mesh when a MeshNode is added", () => {
    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    gameApp.run();

    const meshes = gameApp.world.query(Node, MeshNode.present());
    expect(meshes.size).toBe(0);

    // Add a new mesh
    gameApp.world.spawn().add(MeshNode);
    gameApp.groupsProxy.update();
    expect(meshes.size).toBe(1);
  });

  it("adds nodes to the main scene when ChildNode is absent", () => {
    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    gameApp.run();

    const mainScene = gameApp.world.resources.get(MainScene);

    const mesh = gameApp.world.spawn().add(MeshNode);
    gameApp.groupsProxy.update();

    expect(mainScene.node.children).toContain(mesh.get(Node).node);
  });

  it("nests nodes within others when ChildNode is present", () => {
    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    gameApp.run();

    const mainScene = gameApp.world.resources.get(MainScene);

    const parent = gameApp.world.spawn().add(MeshNode);
    const child = gameApp.world.spawn().add(MeshNode).addNew(ChildNode, parent);
    gameApp.groupsProxy.update();

    expect(parent.get(Node).node.children).toContain(child.get(Node).node);
    expect(mainScene.node.children).not.toContain(child.get(Node).node);
  });

  it("updates a node's position when RenderPosition is added", () => {
    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    gameApp.run();

    const mesh = gameApp.world.spawn().add(MeshNode);
    gameApp.groupsProxy.update();

    const { node } = mesh.get(Node);
    expect(node.position).toEqual({ x: 0, y: 0, z: 0 });

    mesh.add(RenderPosition, { x: 42, z: 144 });
    gameApp.groupsProxy.update();

    expect(node.position).toEqual({ x: 42, y: 0, z: 144 });
  });

  it("updates a node's position when RenderPosition is changed", () => {
    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    gameApp.run();

    const mesh = gameApp.world.spawn().add(MeshNode).add(RenderPosition);
    gameApp.groupsProxy.update();

    const { node } = mesh.get(Node);
    expect(node.position).toEqual({ x: 0, y: 0, z: 0 });

    const position = mesh.get(RenderPosition);
    position.x = 144;
    position.y = 42;
    gameApp.groupsProxy.update();

    expect(node.position).toEqual({ x: 144, y: 42, z: 0 });
  });

  it("removes event listeners when the game is stopped", () => {
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

    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    gameApp.run();
    expect(addEventListener).toHaveBeenCalled();

    gameApp.stop();
    expect(removeEventListener).toHaveBeenCalled();
  });

  it("removes the renderer from the DOM when the game is stopped", () => {
    const gameApp = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    gameApp.run();

    gameApp.groupsProxy.update();
    expect(document.body.innerHTML).toBe("<canvas></canvas>");

    gameApp.stop();
    expect(document.body.innerHTML).toBe("");
  });
});
