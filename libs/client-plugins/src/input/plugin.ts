import type { ClientPlugin } from "..";
import { Input } from "./resources";
import { updateInput } from "./systems";

/**
 * Plugin to track the input state and expose it as a resource.
 */
export const pluginInput: ClientPlugin = ({ onInit }, { update }) => {
  onInit(({ resources }) => {
    resources.add(Input);
  });

  update.addSystem(updateInput);
};
