import WorkerClient from "./game-worker";

export default class Game {
  private worker = new WorkerClient();

  public run() {
    window.addEventListener("beforeunload", () => {
      this.cleanUp();
    });

    this.worker.listen();
  }

  public cleanUp() {
    this.worker.close();
  }
}
