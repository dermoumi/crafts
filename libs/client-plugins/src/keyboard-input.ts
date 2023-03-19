import type { ClientPlugin } from ".";
import { Resource } from "@crafts/ecs";

/**
 * Resource to track the state of the keyboard.
 */
export class KeyboardInput extends Resource {
  public keys: Record<string, boolean> = {};
  public oldKeys: Record<string, boolean> = {};

  /**
   * Check if a key is currently down.
   *
   * @param key - The key to check
   * @returns true if the key is currently down
   */
  public isDown(key: string): boolean {
    return this.keys[key] ?? false;
  }

  /**
   * Check if a key was pressed since last update.
   * Important: Only use method in `update` system groups.
   *
   * @param key - The key to check
   * @returns true if the key was pressed since last update
   */
  public isPressed(key: string): boolean {
    return (this.keys[key] && !this.oldKeys[key]) ?? false;
  }

  /**
   * Check if a key was released since last update.
   * Important: Only use method in `update` system groups.
   *
   * @param key - The key to check
   * @returns true if the key was released since last update
   */
  public isReleased(key: string): boolean {
    return (!this.keys[key] && this.oldKeys[key]) ?? false;
  }

  /**
   * Check if any of multiple keys are currently down.
   *
   * @param keys - The keys to check
   * @returns true if any of the keys are currently down
   */
  public isAnyDown(...keys: string[]): boolean {
    return keys.some((key) => this.isDown(key));
  }

  /**
   * Check if any of multiple keys were pressed since last update.
   * Important: Only use method in `update` system groups.
   *
   * @param keys - The keys to check
   * @returns true if any of the keys were pressed since last update
   */
  public isAnyPressed(...keys: string[]): boolean {
    return keys.some((key) => this.isPressed(key));
  }

  /**
   * Check if any of multiple keys were released since last update.
   * Important: Only use method in `update` system groups.
   *
   * @param keys - The keys to check
   * @returns true if any of the keys were released since last update
   */
  public isAnyReleased(...keys: string[]): boolean {
    return keys.some((key) => this.isReleased(key));
  }
}

function isInputElementActive() {
  const { activeElement } = document;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  );
}

/**
 * Plugin to track the state of the keyboard and expose it as a resource.
 */
export const pluginKeyboardInput: ClientPlugin = ({
  startup,
  update,
  cleanup,
}) => {
  const windowEventListeners = new Map<(...args: any) => void, string>();

  startup.add({}, ({ command }) => {
    command(({ addResource }) => {
      const keyboard = addResource(KeyboardInput);

      const keydownHandler = (event: KeyboardEvent) => {
        const { code } = event;
        keyboard.keys[code] = true;

        if (!isInputElementActive()) {
          event.preventDefault();
          event.stopPropagation();
        }
      };

      const keyupHandler = (event: KeyboardEvent) => {
        const { code } = event;
        keyboard.keys[code] = false;

        if (!isInputElementActive()) {
          event.preventDefault();
          event.stopPropagation();
        }
      };

      const blurHandler = () => {
        keyboard.keys = {};
      };

      window.addEventListener("keydown", keydownHandler, { capture: true });
      window.addEventListener("keyup", keyupHandler, { capture: true });
      window.addEventListener("blur", blurHandler);

      windowEventListeners.set(keydownHandler, "keydown");
      windowEventListeners.set(keyupHandler, "keyup");
      windowEventListeners.set(blurHandler, "blur");
    });
  });

  update.add({ resources: [KeyboardInput] }, ({ resources }) => {
    const [keyboard] = resources;
    keyboard.oldKeys = { ...keyboard.keys };
  });

  cleanup.add({}, () => {
    for (const [listener, event] of windowEventListeners) {
      window.removeEventListener(event, listener);
    }
  });
};
