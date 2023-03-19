import type { ClientPlugin } from ".";
import * as Ecs from "@crafts/ecs";

/**
 * Resource to track the frame time.
 */
export class FrameInfo extends Ecs.Resource {
  private lastFrameTime: number | undefined;
  private frameTime: number | undefined;

  public get delta() {
    if (this.frameTime === undefined || this.lastFrameTime === undefined) {
      return 0;
    }

    return this.frameTime - this.lastFrameTime;
  }

  public update(frameTime?: number) {
    this.lastFrameTime = this.frameTime;
    this.frameTime = frameTime;
  }
}

/**
 * Plugin to run updates at a variable, framerate.
 */
export const pluginVariableUpdate: ClientPlugin = ({
  startup,
  update,
  cleanup,
}) => {
  let rafID: ReturnType<typeof requestAnimationFrame> | undefined;

  startup.add({}, ({ command }) => {
    command(({ addResource }) => {
      const frameInfo = addResource(FrameInfo);

      const renderFunc = (frametime?: number) => {
        rafID = requestAnimationFrame(renderFunc);

        frameInfo.update(
          frametime === undefined ? undefined : frametime / 1000
        );
        update();
      };

      renderFunc();
    });
  });

  cleanup.add({}, () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    cancelAnimationFrame(rafID!);
  });
};
