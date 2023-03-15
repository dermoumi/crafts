export enum MessageType {
  Close = 1,
  Ping = 2,
  Pong = 3,
  ManagerReady = 4,
}

export enum DisconnectReason {
  ClientDisconnected = 1,
  ClientTimedOut = 2,
  WorkerDisconnected = 3,
}

export type SharedWorkerMessage = {
  [MessageType.Close]: [reason: DisconnectReason];
  [MessageType.Ping]: [];
  [MessageType.ManagerReady]: [];
};

export type SharedWorkerClientMessage = {
  [MessageType.Close]: [reason: DisconnectReason];
  [MessageType.Pong]: [];
};

export type SharedWorkerTuple = [
  keyof SharedWorkerMessage,
  ...SharedWorkerMessage[keyof SharedWorkerMessage]
];

export type SharedWorkerClientTuple = [
  keyof SharedWorkerClientMessage,
  ...SharedWorkerClientMessage[keyof SharedWorkerClientMessage]
];
