import { Resource } from "@crafts/ecs";

/**
 * A resource to handle fixed updates.
 */
export class FixedUpdate extends Resource {
  /**
   * The rate of fixed updates in milli-seconds.
   */
  public rateMs = 1000 / 30;

  /**
   * The target system to run each fixed update.
   */
  public target: () => void;

  private updateTimeoutID: ReturnType<typeof setTimeout>;
  private accumulatedTime = 0;
  private lastUpdateTime = performance.now();

  /**
   * @params target - The target system to run each fixed update.
   */
  public constructor(target: () => void) {
    super();

    this.target = target;

    this.updateFunc = this.updateFunc.bind(this);
    this.updateTimeoutID = setTimeout(this.updateFunc, this.rate / 5);
  }

  /**
   * Stop the fixed update when the resource is disposed.
   */
  public __dispose() {
    clearTimeout(this.updateTimeoutID);
  }

  /**
   * The update rate in seconds.
   */
  public get rate() {
    return this.rateMs / 1000;
  }

  private updateFunc() {
    this.updateTimeoutID = setTimeout(this.updateFunc, this.rateMs / 5);

    const now = performance.now();
    this.accumulatedTime += now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    while (this.accumulatedTime >= this.rateMs) {
      this.accumulatedTime -= this.rateMs;
      this.target();
    }
  }
}
