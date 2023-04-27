import { System } from "@crafts/game-app";
import { Assets } from "./resources";

export const setup = new System({}, ({ command }) => {
  command.addResource(Assets);
});
