import type { CommonPlugin } from ".";

export const UPDATE_RATE = 1000 / 20;

export const pluginFixedUpdate: CommonPlugin = ({ onInit }, { fixed }) => {
  onInit(() => {
    let lastUpdateTime = performance.now();
    let accumulatedTime = 0;

    let updateTimeoutID = setTimeout(updateFunc, UPDATE_RATE);
    function updateFunc() {
      updateTimeoutID = setTimeout(updateFunc, UPDATE_RATE);

      const now = performance.now();
      accumulatedTime += now - lastUpdateTime;
      lastUpdateTime = now;

      while (accumulatedTime >= UPDATE_RATE) {
        fixed();
        accumulatedTime -= UPDATE_RATE;
      }
    }

    return () => {
      clearTimeout(updateTimeoutID);
    };
  });
};
