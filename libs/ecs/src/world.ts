import type { Resource } from "./resource";
import type { Component } from "./component";
import type { FilterSet } from "./filter";
import type { QueryBuilder } from "./query";
import type {
  Command,
  SystemCallback,
  SystemHandle,
  SystemQuery,
  SystemResult,
} from "./system";
import type { TraitConstructor, TraitConcreteConstructor } from "./trait";
import type { EventConcreteConstructor } from "./event";

import { Entity } from "./entity";
import Manager from "./manager";
import ResourceContainer, { ResourceManager } from "./resource-container";
import { Query, ResettableQuery } from "./query";
import { SetMap } from "@crafts/default-map";
import { Event } from "./event";
import System from "./system";

/**
 * A basic ID generator that uses a counter.
 * Starts with the lowest possible integer to maximize possible IDs.
 *
 * @returns A new entity ID
 */
export function makeDefaultIDGenerator(): EntityIDGenerator {
  let id = Number.MIN_SAFE_INTEGER;

  return () => (id++).toString();
}

/**
 * A callback to generate a new entity ID.
 *
 * @returns A new entity ID
 */
export type EntityIDGenerator = () => string;

/**
 * An interface to the world entity management.
 */
export type WorldManager = {
  /**
   * Spawns a new entity.
   */
  spawn: () => Entity;

  /**
   * Removes an entity.
   * @param entity - The entity to destroy
   */
  remove: (entity: Entity) => void;

  /**
   * Add a resource.
   *
   * @param constructor - The resource to add
   * @param initialValue - The initial value of the resource
   */
  addResource: <T extends Resource>(
    constructor: TraitConcreteConstructor<T, []>,
    initialValue?: Partial<T>
  ) => T;

  /**
   * Add a resource using its constructor.
   *
   * @param constructor - The resource to add
   * @param args - The arguments to pass to the constructor
   */
  addNewResource: <T extends Resource, TArgs extends unknown[]>(
    constructor: TraitConcreteConstructor<T, TArgs>,
    ...args: TArgs
  ) => T;

  /**
   * Remove a resource.
   *
   * @param resource - The resource to remove
   */
  removeResource: (resource: TraitConstructor<Resource>) => void;

  /**
   * Dispatch an event.
   *
   * @param constructor - The event to dispatch
   * @param value - The value of the event
   */
  dispatch: <T extends Event>(
    constructor: EventConcreteConstructor<T, []>,
    value?: Partial<T>
  ) => void;

  /**
   * Dispatch an event using its constructor.
   *
   * @param constructor - The event to dispatch
   * @param args - The arguments to pass to the constructor
   */
  dispatchNew: <T extends Event, TArgs extends unknown[]>(
    constructor: EventConcreteConstructor<T, TArgs>,
    ...args: TArgs
  ) => void;
};

/**
 * Manages entities, components and systems.
 */
export class World {
  /**
   * @internal
   */
  private entityManager = new Manager<Component, Entity>();

  /**
   * @internal
   */
  private resourceManager: Manager<Resource, ResourceContainer> =
    new ResourceManager();

  /**
   * Access the world's resources.
   */
  public readonly resources = new ResourceContainer(this.resourceManager);

  /**
   * @internal
   */
  private readonly nextIDGenerator: EntityIDGenerator;

  /**
   * @internal
   */
  private readonly eventQueues = new SetMap<
    EventConcreteConstructor<any>,
    WeakRef<Set<Event>>
  >();

  /**
   * @param nextIDGenerator - A callback to generate a new entity ID
   */
  public constructor(nextIDGenerator = makeDefaultIDGenerator()) {
    this.resourceManager.containers.set("resources", this.resources);
    this.nextIDGenerator = nextIDGenerator;
  }

  /**
   * Spawns a new entity.
   *
   * @returns A new entity
   */
  public spawn(): Entity {
    const { entityManager } = this;

    const id = this.nextIDGenerator();
    const entity = new Entity(id, entityManager);

    entityManager.containers.set(id, entity);
    entityManager.onContainerAdded(entity);

    return entity;
  }

  /**
   * Returns an entity by its ID.
   *
   * @param id - The entity's ID
   * @returns The entity
   */
  public get(id: string): Entity | undefined {
    return this.entityManager.containers.get(id);
  }

  /**
   * Removes an entity.
   *
   * @param entity - The entity to destroy
   */
  public remove(entity: Entity): void {
    const { entityManager } = this;
    entityManager.containers.delete(entity.id);
    entityManager.onContainerRemoved(entity);
  }

  /**
   * Dispatch an event.
   *
   * @param constructor - The event to dispatch
   * @param value - The value of the event
   */
  public dispatch<T extends Event>(
    constructor: EventConcreteConstructor<T, []>,
    value?: Partial<T>
  ): void {
    const event = new constructor();
    Object.assign(event, value);

    return this.dispatchEvent(constructor, event);
  }

  /**
   * Dispatch an event.
   *
   * @param constructor - The event to dispatch
   * @param args - The arguments to pass to the constructor
   */
  public dispatchNew<T extends Event, TArgs extends unknown[]>(
    constructor: EventConcreteConstructor<T, TArgs>,
    ...args: TArgs
  ): void {
    const event = new constructor(...args);

    return this.dispatchEvent(constructor, event);
  }

  /**
   * Dispatch an event
   */
  private dispatchEvent<T extends Event>(
    constructor: EventConcreteConstructor<T>,
    event: T
  ): void {
    const queue = this.eventQueues.get(constructor);
    for (const ref of queue) {
      const events = ref.deref();

      if (events) {
        events.add(event);
      } else {
        queue.delete(ref);
      }
    }
  }

  /**
   * Query entities based on a component filter.
   *
   * @typeParam F - The filter to match against
   * @param filters - The component filters
   * @returns A disposable query set
   */
  public query<F extends FilterSet<Component>>(
    ...filters: F
  ): ResettableQuery<F> {
    const query = this.entityManager.createQuery(...filters);

    return new ResettableQuery(query);
  }

  /**
   * Create a system handle to invoke the given system.
   *
   * @overload
   * @typeParam Q - The corresponding SystemQuery type
   * @param system - A System instance to define the system
   * @returns A callable system handle
   */
  public addSystem<Q extends SystemQuery>(system: System<Q>): SystemHandle;

  /**
   * Create a system using the given queries and callback.
   *
   * @overload
   * @typeParam Q - The corresponding SystemQuery type
   * @param queries - The queries to match against
   * @param callback - The system callback
   * @returns A callable system handle
   */
  public addSystem<Q extends SystemQuery>(
    queries: Q,
    callback: SystemCallback<Q>
  ): SystemHandle;

  /**
   * @internal
   * @param systemOrQueries - A System instance or a SystemQuery object
   * @param systemCallback - The system callback
   *  if systemOrQueries is a SystemQuery object
   * @returns A callable system handle
   */
  public addSystem<Q extends SystemQuery>(
    systemOrQueries: System<Q> | Q,
    systemCallback?: SystemCallback<Q>
  ): SystemHandle {
    let queries: Q;
    let callback: SystemCallback<Q>;
    if (systemOrQueries instanceof System) {
      queries = systemOrQueries.queries;
      callback = systemOrQueries.callback;
    } else if (systemCallback === undefined) {
      throw new Error("Missing system callback");
    } else {
      queries = systemOrQueries;
      callback = systemCallback;
    }

    const eventQueues: Record<string, Set<Event>> = {};
    const eventSets: Array<Set<Event>> = [];
    const querySets: Record<string, Query<any>> = {};
    const queryBuilders: Array<QueryBuilder<Component, Entity, any>> = [];
    let resourceQueryBuilder:
      | QueryBuilder<Resource, ResourceContainer, any>
      | undefined;

    // Create queries and query sets for each filter
    for (const [key, filter] of Object.entries(queries)) {
      if ((filter as any).prototype instanceof Event) {
        const eventQueue = new Set<Event>();
        const constructor = filter as EventConcreteConstructor<any>;

        eventQueues[key] = eventQueue;
        eventSets.push(eventQueue);

        // Register the event queue to receive events
        this.eventQueues.get(constructor).add(new WeakRef(eventQueue));
      } else if (key === "resources") {
        resourceQueryBuilder = this.resourceManager.createQuery(
          ...(filter as FilterSet<Resource>)
        );
      } else {
        const query = this.entityManager.createQuery(
          ...(filter as FilterSet<Component>)
        );
        querySets[key] = new Query(query);
        queryBuilders.push(query);
      }
    }

    const commands: Command[] = [];
    const command = (pending: Command): void => {
      commands.push(pending);
    };

    const entityManager: WorldManager = {
      spawn: this.spawn.bind(this),
      remove: this.remove.bind(this),
      addResource: (constructor, ...args) =>
        this.resources.add(constructor, ...args).get(constructor),
      addNewResource: (constructor, ...args) =>
        this.resources.addNew(constructor, ...args).get(constructor),
      removeResource: (...args) => {
        this.resources.remove(...args);
      },
      dispatch: this.dispatch.bind(this),
      dispatchNew: this.dispatchNew.bind(this),
    };

    const handle = () => {
      // Only call the callback if all queries have results
      if (
        queryBuilders.every(({ containers }) => containers.size > 0) &&
        eventSets.every((set) => set.size > 0)
      ) {
        const events = Object.fromEntries(
          Object.entries(eventQueues).map(([key, queue]) => {
            const eventArray = [...queue];
            queue.clear();
            return [key, eventArray];
          })
        );

        const resources = resourceQueryBuilder
          ? resourceQueryBuilder.getResources()
          : [];

        if (resources) {
          callback({
            ...querySets,
            ...events,
            resources,
            command,
          } as SystemResult<Q>);
        }
      }

      // Execute all pending commands
      for (const pending of commands) {
        pending(entityManager);
      }

      // Clear resource query
      resourceQueryBuilder?.reset();

      // Clear component queries
      for (const query of queryBuilders) {
        query.reset();
      }
    };

    handle.reset = () => {
      // Clear resource query
      resourceQueryBuilder?.reset();

      // Clear component queries
      for (const query of queryBuilders) {
        query.reset();
      }
    };

    return handle;
  }

  /**
   * Dispose of the world
   */
  public clear(): void {
    this.entityManager.clear();
    this.resourceManager.clear(true);
  }
}
