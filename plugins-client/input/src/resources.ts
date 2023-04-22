import { ArrayMap, SetMap } from "@crafts/default-map";
import { Resource } from "@crafts/ecs";

export type InputAxis = "lx" | "ly" | "rx" | "ry" | "lt" | "rt";
export type DirectionInputAction = "left" | "right" | "up" | "down";
export type InputAction = DirectionInputAction | "interact" | "cancel" | "menu";

function isInputElementActive(): boolean {
  const { activeElement } = document;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  );
}

const DIRECTION_TO_AXIS = {
  up: -1,
  down: 1,
  left: -1,
  right: 1,
} as const;

export class Input extends Resource {
  public readonly keyToAxis = { lx: 0, ly: 0 };
  public readonly axesActionStacks = new ArrayMap<
    InputAxis,
    DirectionInputAction
  >();

  public readonly axes: Record<InputAxis, number> = {
    lx: 0,
    ly: 0,
    rx: 0,
    ry: 0,
    lt: 0,
    rt: 0,
  };

  public oldActions = new Set<InputAction>();
  public readonly actions = new Set<InputAction>();
  public readonly keysDownForAction = new SetMap<InputAction, string>();

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

  public constructor() {
    super();

    this.keydownHandler = this.keydownHandler.bind(this);
    this.keyupHandler = this.keyupHandler.bind(this);
    this.blurHandler = this.blurHandler.bind(this);

    window.addEventListener("keydown", this.keydownHandler, { capture: true });
    window.addEventListener("keyup", this.keyupHandler, { capture: true });
    window.addEventListener("blur", this.blurHandler);
  }

  public __dispose(): void {
    window.removeEventListener("blur", this.blurHandler);
    window.removeEventListener("keyup", this.keyupHandler, { capture: true });
    window.removeEventListener("keydown", this.keydownHandler, {
      capture: true,
    });
  }

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

  /**
   * Update the input state.
   */
  public update(): void {
    this.oldActions = new Set(this.actions);
  }

  private keydownHandler(event: KeyboardEvent): void {
    if (isInputElementActive()) return;

    const { code } = event;

    const action = this.keymap[code];
    if (action === undefined) return;

    // Prevent the default behavior
    event.preventDefault();
    event.stopPropagation();

    const actionKeysDown = this.keysDownForAction.get(action);
    const actionIsRepeated = actionKeysDown.has(code);

    if (!actionIsRepeated) {
      actionKeysDown.add(code);
      this.actions.add(action);

      // Trigger axis update
      switch (action) {
        case "up":
        case "right":
        case "down":
        case "left": {
          this.axesActionKeyDown(action);
          break;
        }

        default: {
          break;
        }
      }
    }
  }

  private keyupHandler(event: KeyboardEvent): void {
    if (isInputElementActive()) return;

    const { code } = event;

    // Check if this key is mapped to an action
    const action = this.keymap[code];
    if (action === undefined) return;

    // Prevent the default behavior
    event.preventDefault();
    event.stopPropagation();

    // Mark the action as currently up
    const actionKeysDown = this.keysDownForAction.get(action);
    actionKeysDown.delete(code);
    if (actionKeysDown.size === 0) {
      this.actions.delete(action);
    }

    // Trigger axis update
    switch (action) {
      case "up":
      case "right":
      case "down":
      case "left": {
        this.axesActionKeyUp(action);
        break;
      }

      default: {
        break;
      }
    }
  }

  private blurHandler(): void {
    this.actions.clear();
    this.keysDownForAction.clear();

    // Reset axes
    this.axesActionStacks.clear();
    for (const axis of Object.keys(this.axes)) {
      this.axes[axis as InputAxis] = 0;
    }
  }

  private axesActionKeyDown(action: DirectionInputAction): void {
    const axis = action === "up" || action === "down" ? "ly" : "lx";
    const stack = this.axesActionStacks.get(axis);

    // Only change axis value if this action was not the last one in the stack
    const lastDirection = stack[0];
    if (action !== lastDirection) {
      const value = DIRECTION_TO_AXIS[action];

      this.keyToAxis[axis] = value;
      this.updateJoystick(this.keyToAxis.lx, this.keyToAxis.ly);
    }

    // Add the action to the stack
    stack.unshift(action);
  }

  private axesActionKeyUp(action: DirectionInputAction): void {
    const axis = action === "up" || action === "down" ? "ly" : "lx";
    const stack = this.axesActionStacks.get(axis);

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

      this.keyToAxis[axis] = value;
      this.updateJoystick(this.keyToAxis.lx, this.keyToAxis.ly);
    }
  }

  private updateJoystick(x: number, y: number): number[] {
    let xCapped = x;
    let yCapped = y;

    const magnitude = Math.sqrt(x * x + y * y);
    if (magnitude > 1) {
      xCapped /= magnitude;
      yCapped /= magnitude;
    }

    this.axes.lx = xCapped;
    this.axes.ly = yCapped;

    return [xCapped, yCapped];
  }
}
