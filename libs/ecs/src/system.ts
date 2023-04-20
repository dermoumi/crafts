import type { Resource } from "./resource";
import type { Component } from "./component";
import type { FilterSet, TraitInstances } from "./filter";
import type { Query } from "./query";
import type { WorldManager } from "./world";
import type { Event, EventConcreteConstructor } from "./event";
import type { Entity } from "./entity";
import type { TraitConcreteConstructor, TraitConstructor } from "./trait";

/**
 * A function to be executed at the end of the system's execution.
 */
export type Command = (world: WorldManager) => void;

/**
 * A function that adds new commands.
 */
export type CommandAdder = {
  (command: Command): void;
  spawn: (callback?: (entity: Entity) => void) => CommandAdder;
  remove: (entity: Entity) => CommandAdder;
  addResource: <T extends Resource>(
    constructor: TraitConcreteConstructor<T, []>,
    initialValue?: Partial<T>
  ) => CommandAdder;
  addNewResource: <T extends Resource, TArgs extends unknown[]>(
    constructor: TraitConcreteConstructor<T, TArgs>,
    ...args: TArgs
  ) => CommandAdder;
  removeResource: (resource: TraitConstructor<Resource>) => CommandAdder;
  emit: <T extends Event>(
    constructor: EventConcreteConstructor<T, []>,
    value?: Partial<T>
  ) => CommandAdder;
  emitNew: <T extends Event, TArgs extends unknown[]>(
    constructor: EventConcreteConstructor<T, TArgs>,
    ...args: TArgs
  ) => CommandAdder;
};

/**
 * A container for queries that can be used in a system.
 */
export type SystemQuery = {
  [key in Exclude<string, "command">]:
    | FilterSet<Component>
    | FilterSet<Resource>
    | typeof Event;
} & {
  resources?: FilterSet<Resource>;
  command?: never;
};

/**
 * Types of the querysets resulted from a system query.

 * @typeParam T - The corresponding SystemQuery type
 */
export type SystemResult<Q extends SystemQuery> = {
  [key in Exclude<
    keyof Q,
    "command" | "resources"
  >]: Q[key] extends FilterSet<Component>
    ? Query<Q[key]>
    : Q[key] extends typeof Event
    ? Array<InstanceType<Q[key]>>
    : never;
} & {
  resources: Q["resources"] extends FilterSet<Resource>
    ? TraitInstances<Resource, Q["resources"]>
    : [];
  command: CommandAdder;
};

/**
 * Type of the callback called when a system is invoked.
 *
 * @typeParam Q - The corresponding SystemQuery type
 */
export type SystemCallback<Q extends SystemQuery> = (
  result: SystemResult<Q>
) => void;

/**
 * A system defines the behaviour of entities in the world
 * based on their components.
 *
 * @typeParam Q - The corresponding SystemQuery type
 */
export class System<Q extends SystemQuery> {
  /**
   * @internal
   */
  public readonly queries: Q;

  /**
   * @internal
   */
  public readonly callback: SystemCallback<Q>;

  /**
   * @param queries - The queries to use
   * @param callback - The callback to call when the system is invoked
   */
  public constructor(queries: Q, callback: SystemCallback<Q>) {
    this.queries = queries;
    this.callback = callback;
  }
}

/**
 * A handle to invoke a game system and dispose of it.
 */
export type SystemHandle = {
  (): void;
  reset: () => SystemHandle;
};
