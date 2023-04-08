import { Resource } from "@crafts/ecs";

/**
 * Resource to handle variable updates.
 */
export class VariableUpdate extends Resource {
  public delta = 0;
  public target: () => void;

  private rafID: ReturnType<typeof requestAnimationFrame>;
  private lastTimestamp: number;
  private currentTimestamp: number;

  /**
   * @param target - Target system to call every update
   */
  public constructor(target: () => void) {
    super();

    this.target = target;

    const now = performance.now();
    this.lastTimestamp = now;
    this.currentTimestamp = now;

    this.updateFunc = this.updateFunc.bind(this);
    this.rafID = requestAnimationFrame(this.updateFunc);
  }

  public __dispose(): void {
    cancelAnimationFrame(this.rafID);
  }

  private updateFunc(timestamp: number) {
    this.rafID = requestAnimationFrame(this.updateFunc);

    this.lastTimestamp = this.currentTimestamp;
    this.currentTimestamp = timestamp;
    this.delta = (timestamp - this.lastTimestamp) / 1000;

    this.target();
  }
}
