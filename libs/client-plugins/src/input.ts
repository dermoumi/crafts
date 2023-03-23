import type { ClientPlugin } from ".";
import { Resource } from "@crafts/ecs";
import { ArrayMap, SetMap } from "@crafts/default-map";

export type InputAxis = "lx" | "ly" | "rx" | "ry" | "lt" | "rt";
export type DirectionInputAction = "left" | "right" | "up" | "down";
export type InputAction = DirectionInputAction | "interact" | "cancel" | "menu";

const DIRECTION_TO_AXIS = {
  up: -1,
  down: 1,
  left: -1,
  right: 1,
} as const;

export class Input extends Resource {
  public readonly axes: Record<InputAxis, number> = {
    lx: 0,
    ly: 0,
    rx: 0,
    ry: 0,
    lt: 0,
    rt: 0,
  };

  public keysDownForAction = new SetMap<InputAction, string>();
  public axesActionStacks = new ArrayMap<InputAxis, DirectionInputAction>();
  public keyToAxis = {
    lx: 0,
    ly: 0,
  };

  public keymap: Record<string, InputAction> = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    KeyW: "up",
    KeyS: "down",
    KeyA: "left",
    KeyD: "right",
    Tab: "menu",
  };

  public actions = new Set<InputAction>();
  public oldActions = new Set<InputAction>();

  /**
   * Check if a action is currently down.
   *
   * @param action - The action to check
   * @returns true if the action is currently down
   */
  public isDown(action: InputAction): boolean {
    return this.actions.has(action);
  }

  /**
   * Check if a action was pressed since last update.
   * Important: Only use method in `update` system groups.
   *
   * @param action - The action to check
   * @returns true if the action was pressed since last update
   */
  public isPressed(action: InputAction): boolean {
    return this.actions.has(action) && !this.oldActions.has(action);
  }

  /**
   * Check if a action was released since last update.
   * Important: Only use method in `update` system groups.
   *
   * @param action - The action to check
   * @returns true if the action was released since last update
   */
  public isReleased(action: InputAction): boolean {
    return !this.actions.has(action) && this.oldActions.has(action);
  }

  /**
   * Check if any of multiple actions are currently down.
   *
   * @param actions - The actions to check
   * @returns true if any of the actions are currently down
   */
  public isAnyDown(...actions: InputAction[]): boolean {
    return actions.some((action) => this.isDown(action));
  }

  /**
   * Check if any of multiple actions were pressed since last update.
   * Important: Only use method in `update` system groups.
   *
   * @param actions - The actions to check
   * @returns true if any of the actions were pressed since last update
   */
  public isAnyPressed(...actions: InputAction[]): boolean {
    return actions.some((action) => this.isPressed(action));
  }

  /**
   * Check if any of multiple actions were released since last update.
   * Important: Only use method in `update` system groups.
   *
   * @param actions - The actions to check
   * @returns true if any of the actions were released since last update
   */
  public isAnyReleased(...actions: InputAction[]): boolean {
    return actions.some((action) => this.isReleased(action));
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
 * Plugin to track the input state and expose it as a resource.
 */
export const pluginInput: ClientPlugin = ({ startup, update, cleanup }) => {
  const windowEventListeners = new Map<(...args: any) => void, string>();

  startup.add({}, ({ command }) => {
    command(({ addResource }) => {
      const input = addResource(Input);

      const updateJoystick = (x: number, y: number) => {
        let xCapped = x;
        let yCapped = y;

        const magnitude = Math.sqrt(x * x + y * y);
        if (magnitude > 1) {
          xCapped /= magnitude;
          yCapped /= magnitude;
        }

        input.axes.lx = xCapped;
        input.axes.ly = yCapped;

        return [xCapped, yCapped];
      };

      const axesActionKeyDown = (action: DirectionInputAction) => {
        const axis = action === "up" || action === "down" ? "ly" : "lx";
        const stack = input.axesActionStacks.get(axis);

        // Only change axis value if this action was not the last one in the stack
        const lastDirection = stack[0];
        if (action !== lastDirection) {
          const value = DIRECTION_TO_AXIS[action];

          input.keyToAxis[axis] = value;
          updateJoystick(input.keyToAxis.lx, input.keyToAxis.ly);
        }

        // Add the action to the stack
        stack.unshift(action);
      };

      const axesActionKeyUp = (action: DirectionInputAction) => {
        const axis = action === "up" || action === "down" ? "ly" : "lx";
        const stack = input.axesActionStacks.get(axis);

        // If the action is not in the stack, then there's nothing to do
        const actionIndex = stack.indexOf(action);
        if (actionIndex === -1) return;

        // Remove the action from the stack
        stack.splice(actionIndex, 1);

        // If the removed action was the first in the stack, then update the axis
        // value to the previous action. Or to 0 if there are no previous actions.
        if (actionIndex === 0) {
          const lastDirection = stack[0];
          const value =
            lastDirection === undefined ? 0 : DIRECTION_TO_AXIS[lastDirection];

          input.keyToAxis[axis] = value;
          updateJoystick(input.keyToAxis.lx, input.keyToAxis.ly);
        }
      };

      const keydownHandler = (event: KeyboardEvent) => {
        if (isInputElementActive()) return;

        const { code } = event;

        const action = input.keymap[code];
        if (action === undefined) return;

        // Prevent the default behavior
        event.preventDefault();
        event.stopPropagation();

        const actionKeysDown = input.keysDownForAction.get(action);
        const actionIsRepeated = actionKeysDown.has(code);

        if (!actionIsRepeated) {
          actionKeysDown.add(code);
          input.actions.add(action);

          // Trigger axis update
          switch (action) {
            case "up":
            case "right":
            case "down":
            case "left": {
              axesActionKeyDown(action);
              break;
            }

            default: {
              break;
            }
          }
        }
      };

      const keyupHandler = (event: KeyboardEvent) => {
        if (isInputElementActive()) return;

        const { code } = event;

        // Check if this key is mapped to an action
        const action = input.keymap[code];
        if (action === undefined) return;

        // Prevent the default behavior
        event.preventDefault();
        event.stopPropagation();

        // Mark the action as currently up
        const actionKeysDown = input.keysDownForAction.get(action);
        actionKeysDown.delete(code);
        if (actionKeysDown.size === 0) {
          input.actions.delete(action);
        }

        // Trigger axis update
        switch (action) {
          case "up":
          case "right":
          case "down":
          case "left": {
            axesActionKeyUp(action);
            break;
          }

          default: {
            break;
          }
        }
      };

      const blurHandler = () => {
        input.actions.clear();
        input.keysDownForAction.clear();

        // Reset axes
        input.axesActionStacks.clear();
        for (const axis of Object.keys(input.axes)) {
          input.axes[axis as InputAxis] = 0;
        }
      };

      window.addEventListener("keydown", keydownHandler, { capture: true });
      window.addEventListener("keyup", keyupHandler, { capture: true });
      window.addEventListener("blur", blurHandler);

      windowEventListeners.set(keydownHandler, "keydown");
      windowEventListeners.set(keyupHandler, "keyup");
      windowEventListeners.set(blurHandler, "blur");
    });
  });

  update.add({ resources: [Input] }, ({ resources }) => {
    const [input] = resources;
    input.oldActions = new Set(input.actions);
  });

  cleanup.add({}, () => {
    for (const [listener, event] of windowEventListeners) {
      window.removeEventListener(event, listener);
    }
  });
};
