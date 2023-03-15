import type {
  SharedWorkerClientMessage,
  SharedWorkerClientTuple,
  SharedWorkerMessage,
} from "@crafts/client-common";

import { SetMap } from "@crafts/default-map";
import { MessageType, DisconnectReason } from "@crafts/client-common";

declare const self: SharedWorkerGlobalScope;

export const PING_INTERVAL_MS = 500;
export const TIMEOUT_DELAY_MS = 5000;

/**
 * Type of the message handler callback.
 */
export type MessageHandler<T extends keyof SharedWorkerClientMessage> = (
  client: Client,
  type: T,
  ...data: SharedWorkerClientMessage[T]
) => void;

/**
 * Tracks currently active clients
 */
const activeClients = new Set<Client>();

/**
 * Tracks message listeners
 */
const listeners = new SetMap<
  keyof SharedWorkerClientMessage,
  MessageHandler<any>
>();

/**
 * Handles incoming messages from clients.
 */
function handleClientMessage(client: Client, message: SharedWorkerClientTuple) {
  // Whenever any message is received, reset the timeout delay
  client.resetTimeoutDelay();

  const [type] = message;
  const typeHandlers = listeners.get(type);
  for (const handler of typeHandlers) {
    handler(client, message);
  }
}

/**
 * Adds a handler for the given message type.
 */
export function addListener<T extends keyof SharedWorkerClientMessage>(
  type: T,
  callback: MessageHandler<T>
) {
  listeners.get(type).add(callback);
}

/**
 * Represents a client that is connected to the shared worker.
 */
class Client {
  private readonly port: MessagePort;
  private pingTTL: ReturnType<typeof setTimeout> | undefined;
  private timeoutTTL: ReturnType<typeof setTimeout> | undefined;

  public constructor(connectEvent: MessageEvent) {
    const [port] = connectEvent.ports;
    if (port === undefined) {
      throw new Error("Worker client is missing a port");
    }

    this.port = port;

    this.resetPingDelay();
    this.resetTimeoutDelay();

    // Listen for messages
    this.handleMessage = this.handleMessage.bind(this);
    port.addEventListener("message", this.handleMessage);
  }

  /**
   * Starts listening for messages from this client
   */
  public listen() {
    this.port.start();
  }

  /**
   * Sends a message to this client.
   *
   * @param message - The message to send to the client
   */
  public send<T extends keyof SharedWorkerMessage>(
    type: T,
    ...message: SharedWorkerMessage[T]
  ) {
    this.port.postMessage([type, ...message]);
  }

  /**
   * Closes the connection to this client.
   */
  public close(reason = DisconnectReason.WorkerDisconnected) {
    // Notify the client that the connection is closing
    this.send(MessageType.Close, reason);

    // Remove from the active clients list
    activeClients.delete(this);
    console.debug("Client closed. Total clients:", activeClients.size);

    // Stop listening for new messages
    this.port.removeEventListener("message", this.handleMessage);
    this.port.close();

    // Remove the timeouts
    if (this.timeoutTTL) {
      clearTimeout(this.timeoutTTL);
    }

    if (this.pingTTL) {
      clearTimeout(this.pingTTL);
    }
  }

  /**
   * Resets the delay until the client is closed due to timeout.
   */
  public resetTimeoutDelay() {
    if (this.timeoutTTL) {
      clearTimeout(this.timeoutTTL);
    }

    this.timeoutTTL = setTimeout(() => {
      this.close(DisconnectReason.ClientTimedOut);
    }, TIMEOUT_DELAY_MS);
  }

  /**
   * Reset the delay until the client is pinged again.
   */
  public resetPingDelay() {
    if (this.pingTTL) {
      clearTimeout(this.pingTTL);
    }

    this.pingTTL = setTimeout(() => {
      this.send(MessageType.Ping);

      this.resetPingDelay();
    }, PING_INTERVAL_MS);
  }

  private handleMessage(event: MessageEvent<SharedWorkerClientTuple>) {
    handleClientMessage(this, event.data);
  }
}

/**
 * Starts listening for new client connections
 */
export function listen() {
  addListener(MessageType.Close, (client) => {
    client.close();
  });

  self.addEventListener("connect", (connectEvent) => {
    // Create and add the client to the active clients
    const client = new Client(connectEvent);

    activeClients.add(client);
    console.debug("New client connected. Total clients:", activeClients.size);

    // Start listening for messages
    client.listen();
  });
}
