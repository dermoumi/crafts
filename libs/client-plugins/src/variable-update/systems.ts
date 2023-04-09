import { Schedulers, System } from "@crafts/game-app";
import { VariableUpdate } from "./resources";

export const setup = new System(
  { resources: [Schedulers] },
  ({ resources, command }) => {
    const [schedulers] = resources;

    command(({ addNewResource }) => {
      addNewResource(VariableUpdate, schedulers.get("update"));
    });
  }
);
