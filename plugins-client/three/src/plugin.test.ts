import { System, GameApp } from "@crafts/game-app";
import { FixedUpdate, Position, Rotation } from "@crafts/common-plugins";
import { VariableUpdate } from "@crafts/plugin-variable-update";
import {
  CameraNode,
  ChildNode,
  MainCamera,
  MainScene,
  MeshNode,
  Node,
  SceneNode,
  TweenPosition,
  TweenRotation,
} from "./components";
import { pluginThree } from "./plugin";
import { SetMap } from "@crafts/default-map";
import { WebGLRenderer } from "three";

// Vitest's fake timers emulate requestAnimationFrame at 60fps
const REFRESH_RATE = 1000 / 60;
const UPDATE_RATE = 1000 / 30; // Less false positives than the default 20tps

vi.mock("@crafts/plugin-variable-update", async () => {
  const variableUpdateModule = await import("@crafts/plugin-variable-update");

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

      public get rate(): number {
        return this.rateMs / 1000;
      }
    },
  };
});

const testConfigSystem = new System({}, ({ command }) => {
  command
    .addNewResource(FixedUpdate, vi.fn())
    .addNewResource(VariableUpdate, vi.fn());
});

const testSceneAndCamera = new System({}, ({ command }) => {
  command
    .spawn((e) => e.add(MainScene).add(SceneNode))
    .spawn((e) => e.add(MainCamera).add(CameraNode));
});

// Mock the three.js WebGLRenderer
vi.mock("three", async () => {
  const threeModule = await import("three");

  return {
    ...threeModule,
    WebGLRenderer: class {
      public domElement = document.createElement("canvas");

      public setSize(): void {
        // Nothing to do
      }

      public render(): void {
        // Nothing to do
      }

      public dispose(): void {
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
    const game = new GameApp()
      .addPlugin(pluginThree)
      .addStartupSystem(testSceneAndCamera);
    const update = game.getScheduler("update");

    game.run();
    update();

    const spySetSize = vi.spyOn(WebGLRenderer.prototype, "setSize");
    window.dispatchEvent(new Event("resize"));

    update();
    expect(spySetSize).toHaveBeenCalledOnce();
  });

  it("mounts the renderer to the DOM", () => {
    const game = new GameApp().addPlugin(pluginThree);
    const update = game.getScheduler("update");

    game.run();
    update();

    expect(document.body.innerHTML).toBe("<canvas></canvas>");
  });

  it("adds nodes to the main scene when ChildNode is absent", () => {
    const game = new GameApp()
      .addPlugin(pluginThree)
      .addStartupSystem(testSceneAndCamera);
    const update = game.getScheduler("update");

    game.run();
    update();

    const [sceneEntity] = game.world.query(Node, MainScene.present());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { node: mainScene } = sceneEntity!.get(Node);

    const mesh = game.world.spawn().add(MeshNode);
    update();

    expect(mainScene.children).toContain(mesh.get(Node).node);
  });

  it("nests nodes within others when ChildNode is present", () => {
    const game = new GameApp()
      .addPlugin(pluginThree)
      .addStartupSystem(testSceneAndCamera);
    const update = game.getScheduler("update");

    game.run();
    update();

    const [sceneEntity] = game.world.query(Node, MainScene.present());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { node: mainScene } = sceneEntity!.get(Node);

    const parent = game.world.spawn().add(MeshNode);
    const child = game.world.spawn().add(MeshNode).addNew(ChildNode, parent);
    update();

    expect(parent.get(Node).node.children).toContain(child.get(Node).node);
    expect(mainScene.children).not.toContain(child.get(Node).node);
  });

  it("renders each update", () => {
    const gameApp = new GameApp()
      .addPlugin(pluginThree)
      .addStartupSystem(testSceneAndCamera);
    const update = gameApp.getScheduler("update");

    gameApp.run();

    const render = vi.spyOn(WebGLRenderer.prototype, "render");

    update();
    expect(render).toHaveBeenCalled();
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

    const game = new GameApp().addPlugin(pluginThree);

    game.run();
    expect(addEventListener).toHaveBeenCalled();

    game.stop();
    expect(removeEventListener).toHaveBeenCalled();
  });

  it("removes the renderer from the DOM when the game is stopped", () => {
    const disposeRenderer = vi.spyOn(WebGLRenderer.prototype, "dispose");

    const game = new GameApp().addPlugin(pluginThree);
    const update = game.getScheduler("update");

    game.run();
    update();
    expect(document.body.innerHTML).toBe("<canvas></canvas>");

    game.stop();
    expect(document.body.innerHTML).toBe("");
    expect(disposeRenderer).toHaveBeenCalledOnce();
  });
});

describe("RenderPosition animation", () => {
  it("matches the original position when a Position is added", () => {
    const game = new GameApp()
      .addStartupSystem(testConfigSystem)
      .addPlugin(pluginThree);
    const update = game.getScheduler("update");

    game.run();
    update();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Position, { x: 10, y: 100, z: 1000 });
    update();

    const { node } = entity.get(SceneNode);
    expect(node.position).toEqual({ x: 10, y: 100, z: 1000 });
    expect(entity.has(TweenPosition)).toBe(false);
  });

  it("resets the animation when the position changes", () => {
    const game = new GameApp()
      .addStartupSystem(testConfigSystem)
      .addPlugin(pluginThree);
    const update = game.getScheduler("update");

    game.run();
    update();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Position, { x: 10, y: 100, z: 1000 });

    update();

    const position = entity.get(Position);
    Object.assign(position, { x: 20, y: 200, z: 2000 });

    update();

    const tween = entity.tryGet(TweenPosition);
    expect(tween).toBeDefined();
    expect(tween).toEqual({
      fromX: 10,
      fromY: 100,
      fromZ: 1000,
      progress: 0.5,
    });
  });

  it("animates position correctly", () => {
    const game = new GameApp()
      .addStartupSystem(testConfigSystem)
      .addPlugin(pluginThree);
    const update = game.getScheduler("update");
    const entity = game.world.spawn().add(Position).add(SceneNode);

    game.run();
    update();

    // We need to set the value after the initialization
    const position = entity.get(Position);
    Object.assign(position, { x: 10, y: 100, z: 1000 });

    update();

    const { node } = entity.get(SceneNode);
    const tween = entity.get(TweenPosition);
    expect(node.position).toEqual({ x: 5, y: 50, z: 500 });
    expect(tween).toEqual({ fromX: 0, fromY: 0, fromZ: 0, progress: 0.5 });
  });

  it("removes TweenPosition when the animation is done", () => {
    const game = new GameApp()
      .addStartupSystem(testConfigSystem)
      .addPlugin(pluginThree);
    const update = game.getScheduler("update");
    const entity = game.world.spawn().add(Position).add(SceneNode);

    game.run();
    update();

    // We need to set the value after the initialization
    const position = entity.get(Position);
    Object.assign(position, { x: 10, y: 100, z: 1000 });

    update();

    expect(entity.has(TweenPosition)).toBe(true);
    const { node } = entity.get(SceneNode);
    expect(node.position).toEqual({ x: 5, y: 50, z: 500 });

    update();

    expect(entity.has(TweenPosition)).toBe(false);
    expect(node.position).toEqual({ x: 10, y: 100, z: 1000 });
  });
});

describe("RenderRotation animation", () => {
  it("matches the original rotation when a Rotation is added", () => {
    const game = new GameApp()
      .addStartupSystem(testConfigSystem)
      .addPlugin(pluginThree);
    const update = game.getScheduler("update");

    game.run();
    update();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Rotation, { x: 1, y: 2, z: 3, w: 4 });

    update();

    const { node } = entity.get(SceneNode);
    expect(node.quaternion.toArray()).toEqual([1, 2, 3, 4]);
    expect(entity.has(TweenRotation)).toBe(false);
  });

  it("resets the animation when the rotation changes", () => {
    const game = new GameApp()
      .addStartupSystem(testConfigSystem)
      .addPlugin(pluginThree);
    const update = game.getScheduler("update");

    game.run();
    update();

    const entity = game.world
      .spawn()
      .add(SceneNode)
      .add(Rotation, { x: 1, y: 2, z: 3, w: 4 });

    update();

    const rotation = entity.get(Rotation);
    Object.assign(rotation, { x: 2, y: 3, z: 4, w: 5 });

    update();

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

  it("animates rotation correctly", () => {
    const game = new GameApp()
      .addStartupSystem(testConfigSystem)
      .addPlugin(pluginThree);
    const update = game.getScheduler("update");

    const entity = game.world.spawn().add(Rotation).add(SceneNode);

    game.run();
    update();

    // We need to set the value after the initialization
    const rotation = entity.get(Rotation);
    Object.assign(rotation, { x: 10, y: 100, z: 1000, w: 2 });

    update();

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

  it("removes TweenRotation when the animation is done", () => {
    const game = new GameApp()
      .addStartupSystem(testConfigSystem)
      .addPlugin(pluginThree);
    const update = game.getScheduler("update");

    const entity = game.world.spawn().add(Rotation).add(SceneNode);

    game.run();
    update();

    // We need to set the value after the initialization
    const rotation = entity.get(Rotation);
    Object.assign(rotation, { x: 10, y: 100, z: 1000, w: 2 });

    update();
    expect(entity.has(TweenRotation)).toBe(true);
    const { node } = entity.get(SceneNode);
    expect(node.quaternion.toArray()).toEqual([5, 50, 500, 1.5]);

    update();

    expect(entity.has(TweenRotation)).toBe(false);
    expect(node.quaternion.toArray()).toEqual([10, 100, 1000, 2]);
  });
});
