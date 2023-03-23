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
  it("registers an Input resource", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    app.run();

    const input = app.world.resources.tryGet(Input);
    expect(input).toBeDefined();
    expect(input).toBeInstanceOf(Input);
  });

  it("updates the Input resource when a key is pressed", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    app.run();

    app.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyW" });
    window.dispatchEvent(event);

    const input = app.world.resources.get(Input);
    expect(input.isDown("up")).toBe(true);
    expect(input.isPressed("up")).toBe(true);
  });

  it("updates the Input resource when a key is released", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    app.run();

    app.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyW" });
    window.dispatchEvent(event);

    app.groupsProxy.update();

    const event2 = new KeyboardEvent("keyup", { code: "KeyW" });
    window.dispatchEvent(event2);

    const input = app.world.resources.get(Input);
    expect(input.isDown("up")).toBe(false);
    expect(input.isReleased("up")).toBe(true);
  });

  it("releases all actions when the window loses focus", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    app.run();

    app.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyW" });
    window.dispatchEvent(event);

    app.groupsProxy.update();

    const event2 = new FocusEvent("blur");
    window.dispatchEvent(event2);

    const input = app.world.resources.get(Input);
    expect(input.isDown("up")).toBe(false);
    expect(input.isReleased("up")).toBe(true);
  });

  it("removes all listeners when the app is destroyed", () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const app = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    app.run();
    expect(addEventListener).toHaveBeenCalledTimes(3);
    expect(removeEventListenerSpy).not.toHaveBeenCalled();

    app.stop();
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(3);
  });

  it("prevents default keyboard events", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    app.run();

    const callback = vi.fn();
    window.addEventListener("keydown", callback);
    window.addEventListener("keyup", callback);

    app.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyW" });
    window.dispatchEvent(event);

    const event2 = new KeyboardEvent("keyup", { code: "KeyW" });
    window.dispatchEvent(event2);

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not prevent keyboard events if an input element is focused", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(pluginInput);
    app.run();

    const callback = vi.fn();
    window.addEventListener("keydown", callback);
    window.addEventListener("keyup", callback);

    app.groupsProxy.update();

    const input = document.createElement("input");
    document.body.append(input);
    input.focus();

    const event = new KeyboardEvent("keydown", { code: "KeyW" });
    window.dispatchEvent(event);

    const event2 = new KeyboardEvent("keyup", { code: "KeyW" });
    window.dispatchEvent(event2);

    expect(callback).toHaveBeenCalled();
  });
});
