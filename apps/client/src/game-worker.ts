import type {
  SharedWorkerMessage,
  SharedWorkerClientMessage,
  SharedWorkerTuple,
} from "@crafts/client-common";

import { MessageType, DisconnectReason } from "@crafts/client-common";
import { SetMap } from "@crafts/default-map";

export type MessageHandler<T extends keyof SharedWorkerMessage> = (
  type: T,
  data: SharedWorkerMessage[T]
) => void;

export default class GameWorker {
  private worker: SharedWorker | undefined;
  private readonly handlers = new SetMap<keyof SharedWorkerMessage, any>();

  public listen() {
    if (this.worker === undefined) {
      const worker = new SharedWorker(
        new URL("@crafts/client-worker", import.meta.url),
        { type: "module", name: "crafts-client-worker" }
      );

      this.worker = worker;
    }

    const { port } = this.worker;

    port.addEventListener(
      "message",
      ({ data }: MessageEvent<SharedWorkerTuple>) => {
        const [type] = data;
        const typeHandlers = this.handlers.get(type);
        for (const handler of typeHandlers) {
          handler(data);
        }
      }
    );

    port.addEventListener("error", (event) => {
      console.error("Worker error", event);
    });

    this.addListener(MessageType.Ping, () => {
      this.send(MessageType.Pong);
    });

    port.start();
  }

  public addListener<T extends keyof SharedWorkerMessage>(
    type: T,
    callback: MessageHandler<T>
  ) {
    this.handlers.get(type).add(callback);
  }

  public removeListener<T extends keyof SharedWorkerMessage>(
    type: T,
    callback: MessageHandler<T>
  ) {
    this.handlers.get(type).delete(callback);
  }

  public close() {
    this.send(MessageType.Close, DisconnectReason.ClientDisconnected);
    this.worker?.port.close();
  }

  public send<T extends keyof SharedWorkerClientMessage>(
    type: T,
    ...message: SharedWorkerClientMessage[T]
  ) {
    this.worker?.port.postMessage([type, ...message]);
  }
}
