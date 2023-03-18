import type { CommonPlugin } from ".";

export const UPDATE_RATE = 1000 / 20;

export const pluginFixedUpdate: CommonPlugin = ({
  startup,
  fixed,
  cleanup,
}) => {
  let updateTimeoutID: ReturnType<typeof setTimeout> | undefined;
  let lastUpdateTime = performance.now();
  let accumulatedTime = 0;

  startup.add({}, () => {
    const updateFunc = () => {
      updateTimeoutID = setTimeout(updateFunc, UPDATE_RATE);

      const now = performance.now();
      accumulatedTime += now - lastUpdateTime;
      lastUpdateTime = now;

      while (accumulatedTime >= UPDATE_RATE) {
        fixed();
        accumulatedTime -= UPDATE_RATE;
      }
    };

    updateFunc();
  });

  cleanup.add({}, () => {
    clearTimeout(updateTimeoutID);
  });
};
