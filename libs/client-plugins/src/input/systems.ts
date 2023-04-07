import { System } from "@crafts/ecs";
import { Input } from "./resources";

export const updateInput = new System(
  { resources: [Input] },
  ({ resources }) => {
    const [input] = resources;
    input.update();
  }
);
