import GameApp from "./game-app";

describe("GameApp", () => {
  it("registers plugins", () => {
    const myFunction = vi.fn();

    class MyGameApp extends GameApp<"startup" | "update"> {
      public constructor() {
        super();

        this.addPlugin((group) => {
          group("startup").add({}, () => {
            myFunction();
          });
        });
      }
    }

    const gameApp = new MyGameApp();
    const startupGroup = gameApp.getSystemGroup("startup");
    startupGroup();
  });
});
