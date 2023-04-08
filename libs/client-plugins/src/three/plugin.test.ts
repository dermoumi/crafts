import type { ClientPlugin, ClientSystemGroups } from "..";

import { FixedUpdate, Position, Rotation } from "@crafts/common-plugins";
import { VariableUpdate } from "../variable-update";
import {
  ChildNode,
  MainScene,
  MeshNode,
  Node,
  SceneNode,
  TweenPosition,
  TweenRotation,
} from "./components";
import { pluginThree } from "./plugin";
import { SetMap } from "@crafts/default-map";
import { GameApp } from "@crafts/game-app";
import { WebGLRenderer } from "three";

// Vitest's fake timers emulate requestAnimationFrame at 60fps
const REFRESH_RATE = 1000 / 60;
const UPDATE_RATE = 1000 / 30; // Less false positives than the default 20tps

vi.mock("../variable-update", async () => {
  const variableUpdateModule = await import("../variable-update");

  return {
    ...variableUpdateModule,
    VariableUpdate: class {
      public delta = REFRESH_RATE / 1000;
    },
  };
});

vi.mock("@crafts/common-plugins", async () => {
  const commonPlugins = await import("@crafts/common-plugins");

  return {
    ...commonPlugins,
    FixedUpdate: class {
      public rateMs = UPDATE_RATE;

      public get rate() {
        return this.rateMs / 1000;
      }
    },
  };
});

const pluginTestConfig: ClientPlugin = ({ onInit }) => {
  onInit(({ resources }) => {
    resources.addNew(FixedUpdate, vi.fn()).addNew(VariableUpdate, vi.fn());
  });
};

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
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginThree);
    await game.run();
    game.groupsProxy.update();

    const spySetSize = vi.spyOn(WebGLRenderer.prototype, "setSize");
    window.dispatchEvent(new Event("resize"));

    game.groupsProxy.update();
    expect(spySetSize).toHaveBeenCalledOnce();
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

describe("RenderPosition animation", () => {
  it("matches the original position when a Position is added", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginThree);

    await game.run();
    game.groupsProxy.update();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Position, { x: 10, y: 100, z: 1000 });
    game.groupsProxy.update();

    const { node } = entity.get(SceneNode);
    expect(node.position).toEqual({ x: 10, y: 100, z: 1000 });
    expect(entity.has(TweenPosition)).toBe(false);
  });

  it("resets the animation when the position changes", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginThree);

    await game.run();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Position, { x: 10, y: 100, z: 1000 });

    game.groupsProxy.update();

    const position = entity.get(Position);
    Object.assign(position, { x: 20, y: 200, z: 2000 });

    game.groupsProxy.update();

    const tween = entity.tryGet(TweenPosition);
    expect(tween).toBeDefined();
    expect(tween).toEqual({
      fromX: 10,
      fromY: 100,
      fromZ: 1000,
      progress: 0.5,
    });
  });

  it("animates position correctly", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginThree);

    const entity = game.world.spawn().add(Position).add(SceneNode);

    await game.run();
    game.groupsProxy.update();

    // We need to set the value after the initialization
    const position = entity.get(Position);
    Object.assign(position, { x: 10, y: 100, z: 1000 });

    game.groupsProxy.update();

    const { node } = entity.get(SceneNode);
    const tween = entity.get(TweenPosition);
    expect(node.position).toEqual({ x: 5, y: 50, z: 500 });
    expect(tween).toEqual({ fromX: 0, fromY: 0, fromZ: 0, progress: 0.5 });
  });

  it("removes TweenPosition when the animation is done", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginThree);

    const entity = game.world.spawn().add(Position).add(SceneNode);

    await game.run();

    // We need to set the value after the initialization
    const position = entity.get(Position);
    Object.assign(position, { x: 10, y: 100, z: 1000 });

    game.groupsProxy.update();
    game.groupsProxy.update();

    expect(entity.has(TweenPosition)).toBe(false);
    const { node } = entity.get(SceneNode);
    expect(node.position).toEqual({ x: 10, y: 100, z: 1000 });
  });
});

describe("RenderRotation animation", () => {
  it("matches the original rotation when a Rotation is added", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginThree);

    await game.run();
    game.groupsProxy.update();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Rotation, { x: 1, y: 2, z: 3, w: 4 });

    game.groupsProxy.update();

    const { node } = entity.get(SceneNode);
    expect(node.quaternion.toArray()).toEqual([1, 2, 3, 4]);
    expect(entity.has(TweenRotation)).toBe(false);
  });

  it("resets the animation when the rotation changes", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginThree);

    await game.run();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Rotation, { x: 1, y: 2, z: 3, w: 4 });

    game.groupsProxy.update();

    const rotation = entity.get(Rotation);
    Object.assign(rotation, { x: 2, y: 3, z: 4, w: 5 });

    game.groupsProxy.update();

    const tween = entity.get(TweenRotation);
    expect(tween).toBeDefined();
    expect(tween).toEqual({
      fromX: 1,
      fromY: 2,
      fromZ: 3,
      fromW: 4,
      progress: 0.5,
    });
  });

  it("animates rotation correctly", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginThree);

    const entity = game.world.spawn().add(Rotation).add(SceneNode);

    await game.run();
    game.groupsProxy.update();

    // We need to set the value after the initialization
    const rotation = entity.get(Rotation);
    Object.assign(rotation, { x: 10, y: 100, z: 1000, w: 2 });

    game.groupsProxy.update();

    const { node } = entity.get(SceneNode);
    const tween = entity.get(TweenRotation);
    expect(node.quaternion.toArray()).toEqual([5, 50, 500, 1.5]);
    expect(tween).toEqual({
      fromX: 0,
      fromY: 0,
      fromZ: 0,
      fromW: 1,
      progress: 0.5,
    });
  });

  it("removes TweenRotation when the animation is done", async () => {
    const game = new GameApp<ClientSystemGroups>()
      .addPlugin(pluginTestConfig)
      .addPlugin(pluginThree);

    const entity = game.world.spawn().add(Rotation).add(SceneNode);

    await game.run();

    // We need to set the value after the initialization
    const rotation = entity.get(Rotation);
    Object.assign(rotation, { x: 10, y: 100, z: 1000, w: 2 });

    game.groupsProxy.update();
    game.groupsProxy.update();

    expect(entity.has(TweenRotation)).toBe(false);
    const { node } = entity.get(SceneNode);
    expect(node.quaternion.toArray()).toEqual([10, 100, 1000, 2]);
  });
});
