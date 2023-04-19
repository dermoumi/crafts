import { Schedulers, System } from "@crafts/game-app";
import { VariableUpdate } from "./resources";

export const setup = new System(
  { resources: [Schedulers] },
  ({ resources, command }) => {
    const [schedulers] = resources;
    const updateScheduler = schedulers.get("update");

    command.addNewResource(VariableUpdate, updateScheduler);
  }
);
