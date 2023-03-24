import type { ClientPlugin } from ".";
import * as Ecs from "@crafts/ecs";

/**
 * Resource to track the frame time.
 */
export class FrameInfo extends Ecs.Resource {
  private lastFrameTime: number;
  private frameTime: number;

  public constructor() {
    super();

    const now = performance.now() / 1000;
    this.lastFrameTime = now;
    this.frameTime = now;
  }

  public get delta() {
    return this.frameTime - this.lastFrameTime;
  }

  public update(frameTime: number) {
    this.lastFrameTime = this.frameTime;
    this.frameTime = frameTime;
  }
}

/**
 * Plugin to run updates at a variable, framerate.
 */
export const pluginVariableUpdate: ClientPlugin = ({ onInit }, { update }) => {
  onInit(({ resources }) => {
    resources.add(FrameInfo);
    const frameInfo = resources.get(FrameInfo);

    let rafID = requestAnimationFrame(renderFunc);
    function renderFunc(frametime: number) {
      rafID = requestAnimationFrame(renderFunc);

      const frametimeSeconds = frametime / 1000;
      frameInfo.update(frametimeSeconds);
      update();
    }

    return () => {
      cancelAnimationFrame(rafID);
    };
  });
};
