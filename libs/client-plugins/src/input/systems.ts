import { System } from "@crafts/game-app";
import { Input } from "./resources";

export const setup = new System({}, ({ command }) => {
  command(({ addResource }) => {
    addResource(Input);
  });
});

export const updateInput = new System(
  { resources: [Input] },
  ({ resources }) => {
    const [input] = resources;
    input.update();
  }
);
