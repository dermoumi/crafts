import type { CommonPlugin } from ".";
import Rapier, { init as initRapier } from "@dimforge/rapier3d-compat";

export const pluginPhysics: CommonPlugin = ({ onInit }) => {
  onInit(async () => {
    await initRapier();
    console.log(Rapier);
  });
};
