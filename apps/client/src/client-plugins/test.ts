import type { ClientPlugin } from "../local-game";

export const testPlugin: ClientPlugin = (group) => {
  group("startup").add({}, () => {
    console.log("Hello, world!");
  });
};
