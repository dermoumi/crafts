import type { ClientPlugin } from ".";
import * as Ecs from "@crafts/ecs";

/**
 * Resource to track the frame time.
 */
export class FrameInfo extends Ecs.Resource {
  public delta = 0;
}

/**
 * Plugin to run updates at a variable, framerate.
 */
export const pluginVariableUpdate: ClientPlugin = (
  { onInit },
  { preupdate, update, postupdate }
) => {
  let frameInfo: FrameInfo;

  onInit(({ resources }) => {
    resources.add(FrameInfo);
    frameInfo = resources.get(FrameInfo);

    const now = performance.now();
    let lastFrameTime = now;
    let frameTime = now;

    let rafID = requestAnimationFrame(renderFunc);
    function renderFunc(timestamp: number) {
      rafID = requestAnimationFrame(renderFunc);

      lastFrameTime = frameTime;
      frameTime = timestamp;
      frameInfo.delta = (frameTime - lastFrameTime) / 1000;

      preupdate();
      update();
      postupdate();
    }

    return () => {
      cancelAnimationFrame(rafID);
    };
  });

  update.add(
    { resources: [FrameInfo, FrameInfo.changed()] },
    ({ resources }) => {
      frameInfo = resources[0];
    }
  );
};
