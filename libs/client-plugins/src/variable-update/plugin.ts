import type { ClientPlugin } from "..";
import { VariableUpdate } from "./resources";

/**
 * Plugin to run updates at a variable, framerate.
 */
export const pluginVariableUpdate: ClientPlugin = (
  { onInit },
  { preupdate, update, postupdate }
) => {
  onInit(({ resources }) => {
    resources.addNew(VariableUpdate, () => {
      preupdate();
      update();
      postupdate();
    });
  });
};
