import type { CommonPlugin } from "..";
import { FixedUpdate } from "./resources";

export const pluginFixedUpdate: CommonPlugin = ({ onInit }, { fixed }) => {
  onInit(({ resources }) => {
    resources.addNew(FixedUpdate, fixed);
  });
};
