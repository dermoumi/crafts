import type { ClientSystemGroups } from ".";
import { GameApp } from "@crafts/game-app";
import { Input, pluginInput } from "./input";

describe("KeyboardInput resource", () => {
  it("checks if an action is down", () => {
    const input = new Input();
    input.actions.add("interact");
    expect(input.isDown("interact")).toBe(true);
    expect(input.isDown("cancel")).toBe(false);
  });

  it("checks if an action was pressed", () => {
    const input = new Input();
    input.actions.add("interact");
    expect(input.isPressed("interact")).toBe(true);
    expect(input.isPressed("cancel")).toBe(false);
  });

  it("checks if an action was released", () => {
    const input = new Input();
    input.oldActions.add("interact");
    expect(input.isReleased("interact")).toBe(true);
    expect(input.isReleased("cancel")).toBe(false);
  });

  it("checks if any of multiple actions are down", () => {
    const input = new Input();
    input.actions.add("interact");
    expect(input.isAnyDown("interact", "cancel")).toBe(true);
    expect(input.isAnyDown("cancel", "menu")).toBe(false);
  });

  it("checks if any of multiple actions were pressed", () => {
    const input = new Input();
    input.actions.add("interact");
    expect(input.isAnyPressed("interact", "cancel")).toBe(true);
    expect(input.isAnyPressed("cancel", "menu")).toBe(false);
  });

  it("checks if any of multiple actions were released", () => {
    const input = new Input();
    input.actions.add("cancel");
    input.oldActions.add("interact");
    input.oldActions.add("cancel");
    expect(input.isAnyReleased("interact", "cancel")).toBe(true);
    expect(input.isAnyReleased("cancel", "menu")).toBe(false);
  });
});

describe("Input plugin", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("registers an Input resource", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    const input = game.world.resources.tryGet(Input);
    expect(input).toBeDefined();
    expect(input).toBeInstanceOf(Input);
  });

  it("updates the Input resource when a key is pressed", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    game.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyW" });
    window.dispatchEvent(event);

    const input = game.world.resources.get(Input);
    expect(input.isDown("up")).toBe(true);
    expect(input.isPressed("up")).toBe(true);
  });

  it("updates the Input resource when a key is released", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    game.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyW" });
    window.dispatchEvent(event);

    game.groupsProxy.update();

    const event2 = new KeyboardEvent("keyup", { code: "KeyW" });
    window.dispatchEvent(event2);

    const input = game.world.resources.get(Input);
    expect(input.isDown("up")).toBe(false);
    expect(input.isReleased("up")).toBe(true);
  });

  it("releases all actions when the window loses focus", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    game.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyW" });
    window.dispatchEvent(event);

    game.groupsProxy.update();

    const event2 = new FocusEvent("blur");
    window.dispatchEvent(event2);

    const input = game.world.resources.get(Input);
    expect(input.isDown("up")).toBe(false);
    expect(input.isReleased("up")).toBe(true);
  });

  it("removes all listeners when the game is destroyed", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();
    expect(addEventListener).toHaveBeenCalledTimes(3);
    expect(removeEventListenerSpy).not.toHaveBeenCalled();

    game.stop();
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(3);
  });

  it("prevents default keyboard events", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    const callback = vi.fn();
    window.addEventListener("keydown", callback);
    window.addEventListener("keyup", callback);

    game.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyW" });
    window.dispatchEvent(event);

    const event2 = new KeyboardEvent("keyup", { code: "KeyW" });
    window.dispatchEvent(event2);

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not prevent keyboard events if an input element is focused", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    const callback = vi.fn();
    window.addEventListener("keydown", callback);
    window.addEventListener("keyup", callback);

    game.groupsProxy.update();

    const input = document.createElement("input");
    document.body.append(input);
    input.focus();

    const event = new KeyboardEvent("keydown", { code: "KeyW" });
    window.dispatchEvent(event);

    const event2 = new KeyboardEvent("keyup", { code: "KeyW" });
    window.dispatchEvent(event2);

    expect(callback).toHaveBeenCalled();
  });

  it("ignores non-mapped keys", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    const input = game.world.resources.get(Input);
    const actionsSnapshot = [...input.actions];

    const event = new KeyboardEvent("keydown", { code: "KeyO" });
    window.dispatchEvent(event);

    expect([...input.actions]).toEqual(actionsSnapshot);

    const event2 = new KeyboardEvent("keyup", { code: "KeyO" });
    window.dispatchEvent(event2);

    expect([...input.actions]).toEqual(actionsSnapshot);
  });

  it("only releases an action when all its keys are released", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    const input = game.world.resources.get(Input);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" }));

    game.groupsProxy.update();

    expect(input.isDown("up")).toBe(true);
    expect(input.isReleased("up")).toBe(false);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    expect(input.isReleased("up")).toBe(false);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp" }));
    expect(input.isReleased("up")).toBe(true);
  });

  it.each([
    ["ArrowUp", 0, -1],
    ["ArrowLeft", -1, 0],
    ["ArrowDown", 0, 1],
    ["ArrowRight", 1, 0],
  ])("moves the joystick when %s is pressed", async (key, lx, ly) => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    const input = game.world.resources.get(Input);

    expect(input.axes.lx).toEqual(0);
    expect(input.axes.ly).toEqual(0);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: key }));

    expect(input.axes.lx).toEqual(lx);
    expect(input.axes.ly).toEqual(ly);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: key }));

    expect(input.axes.lx).toEqual(0);
    expect(input.axes.ly).toEqual(0);
  });

  it("does not move the joystick when not using a directional key", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    const input = game.world.resources.get(Input);

    expect(input.axes.lx).toEqual(0);
    expect(input.axes.ly).toEqual(0);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Tab" }));

    expect(input.axes.lx).toEqual(0);
    expect(input.axes.ly).toEqual(0);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Tab" }));

    expect(input.axes.lx).toEqual(0);
    expect(input.axes.ly).toEqual(0);
  });

  it("does not move axis when releasing a key that was not pressed", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    const input = game.world.resources.get(Input);

    expect(input.axes.lx).toEqual(0);
    expect(input.axes.ly).toEqual(0);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp" }));

    expect(input.axes.lx).toEqual(0);
    expect(input.axes.ly).toEqual(0);
  });

  it("moves the joystick according to the order of the keys", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    const input = game.world.resources.get(Input);

    expect(input.axes.ly).toEqual(0);

    // Joystick currently neutral. We press up, joystick moves up
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" }));
    expect(input.axes.ly).toEqual(-1);

    // Joystick currently up. We press down, joystick moves down
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowDown" }));
    expect(input.axes.ly).toEqual(1);

    // Joystick currently down. We release down, joystick moves up
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowDown" }));
    expect(input.axes.ly).toEqual(-1);

    // Joystick currently up. We press down, joystick moves down
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowDown" }));
    expect(input.axes.ly).toEqual(1);

    // Joystick currently down. We release up, joystick stays down
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp" }));
    expect(input.axes.ly).toEqual(1);

    // Joystick currently down. We release down, joystick moves neutral
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowDown" }));
    expect(input.axes.ly).toEqual(0);
  });

  it("moves diagonally at a constant speed", async () => {
    const game = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    await game.run();

    const input = game.world.resources.get(Input);

    expect(input.axes.lx).toEqual(0);
    expect(input.axes.ly).toEqual(0);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight" }));

    expect(input.axes.lx).toBeCloseTo(0.707, 3);
    expect(input.axes.ly).toBeCloseTo(-0.707, 3);

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowRight" }));

    expect(input.axes.lx).toEqual(0);
    expect(input.axes.ly).toEqual(0);
  });
});
