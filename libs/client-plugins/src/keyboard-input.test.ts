import type { ClientSystemGroups } from ".";
import { GameApp } from "@crafts/game-app";
import { KeyboardInput, pluginKeyboardInput } from "./keyboard-input";

describe("KeyboardInput resource", () => {
  it("checks if a key is down", () => {
    const keyboard = new KeyboardInput();
    keyboard.keys.a = true;
    expect(keyboard.isDown("a")).toBe(true);
    expect(keyboard.isDown("b")).toBe(false);
  });

  it("checks if a key was pressed", () => {
    const keyboard = new KeyboardInput();
    keyboard.keys.a = true;
    keyboard.oldKeys.a = false;
    expect(keyboard.isPressed("a")).toBe(true);
    expect(keyboard.isPressed("b")).toBe(false);
  });

  it("checks if a key was released", () => {
    const keyboard = new KeyboardInput();
    keyboard.keys.a = false;
    keyboard.oldKeys.a = true;
    expect(keyboard.isReleased("a")).toBe(true);
    expect(keyboard.isReleased("b")).toBe(false);
  });

  it("checks if any of multiple keys are down", () => {
    const keyboard = new KeyboardInput();
    keyboard.keys.a = true;
    keyboard.keys.b = false;
    expect(keyboard.isAnyDown("a", "b")).toBe(true);
    expect(keyboard.isAnyDown("b", "c")).toBe(false);
  });

  it("checks if any of multiple keys were pressed", () => {
    const keyboard = new KeyboardInput();
    keyboard.keys.a = true;
    keyboard.keys.b = false;
    keyboard.oldKeys.a = false;
    keyboard.oldKeys.b = false;
    expect(keyboard.isAnyPressed("a", "b")).toBe(true);
    expect(keyboard.isAnyPressed("b", "c")).toBe(false);
  });

  it("checks if any of multiple keys were released", () => {
    const keyboard = new KeyboardInput();
    keyboard.keys.a = false;
    keyboard.keys.b = true;
    keyboard.oldKeys.a = true;
    keyboard.oldKeys.b = true;
    expect(keyboard.isAnyReleased("a", "b")).toBe(true);
    expect(keyboard.isAnyReleased("b", "c")).toBe(false);
  });
});

describe("KeyboardInput plugin", () => {
  it("registers a KeyboardInput resource", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(
      pluginKeyboardInput
    );
    app.run();

    const keyboardInput = app.world.resources.tryGet(KeyboardInput);
    expect(keyboardInput).toBeDefined();
    expect(keyboardInput).toBeInstanceOf(KeyboardInput);
  });

  it("updates the keyboard resource when a key is pressed", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(
      pluginKeyboardInput
    );
    app.run();

    app.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyA" });
    window.dispatchEvent(event);

    const keyboardInput = app.world.resources.get(KeyboardInput);
    expect(keyboardInput.isDown("KeyA")).toBe(true);
    expect(keyboardInput.isPressed("KeyA")).toBe(true);
  });

  it("updates the keyboard resource when a key is released", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(
      pluginKeyboardInput
    );
    app.run();

    app.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyA" });
    window.dispatchEvent(event);

    app.groupsProxy.update();

    const event2 = new KeyboardEvent("keyup", { code: "KeyA" });
    window.dispatchEvent(event2);

    const keyboardInput = app.world.resources.get(KeyboardInput);
    expect(keyboardInput.isDown("KeyA")).toBe(false);
    expect(keyboardInput.isReleased("KeyA")).toBe(true);
  });

  it("releases all keys when the window loses focus", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(
      pluginKeyboardInput
    );
    app.run();

    app.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyA" });
    window.dispatchEvent(event);

    app.groupsProxy.update();

    const event2 = new FocusEvent("blur");
    window.dispatchEvent(event2);

    const keyboardInput = app.world.resources.get(KeyboardInput);
    expect(keyboardInput.isDown("KeyA")).toBe(false);
    expect(keyboardInput.isReleased("KeyA")).toBe(true);
  });

  it("removes all listeners when the app is destroyed", () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const app = new GameApp<ClientSystemGroups>().addPlugin(
      pluginKeyboardInput
    );
    app.run();
    expect(addEventListener).toHaveBeenCalledTimes(3);
    expect(removeEventListenerSpy).not.toHaveBeenCalled();

    app.stop();
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(3);
  });

  it("prevents default keyboard events", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(
      pluginKeyboardInput
    );
    app.run();

    const callback = vi.fn();
    window.addEventListener("keydown", callback);
    window.addEventListener("keyup", callback);

    app.groupsProxy.update();

    const event = new KeyboardEvent("keydown", { code: "KeyA" });
    window.dispatchEvent(event);

    const event2 = new KeyboardEvent("keyup", { code: "KeyA" });
    window.dispatchEvent(event2);

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not prevent keyboard events if an input element is focused", () => {
    const app = new GameApp<ClientSystemGroups>().addPlugin(
      pluginKeyboardInput
    );
    app.run();

    const callback = vi.fn();
    window.addEventListener("keydown", callback);
    window.addEventListener("keyup", callback);

    app.groupsProxy.update();

    const input = document.createElement("input");
    document.body.append(input);
    input.focus();

    const event = new KeyboardEvent("keydown", { code: "KeyA" });
    window.dispatchEvent(event);

    const event2 = new KeyboardEvent("keyup", { code: "KeyA" });
    window.dispatchEvent(event2);

    expect(callback).toHaveBeenCalled();
  });
});
