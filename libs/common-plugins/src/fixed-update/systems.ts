import { Schedulers, System } from "@crafts/game-app";
import { FixedUpdate } from "./resources";

export const setup = new System(
  { resources: [Schedulers] },
  ({ resources, command }) => {
    const [schedulers] = resources;

    command(({ addNewResource }) => {
      addNewResource(FixedUpdate, schedulers.get("fixed"));
    });
  }
);
