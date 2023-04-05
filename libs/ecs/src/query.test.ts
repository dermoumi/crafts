import type { PresentFilter } from "./filter";

import Component from "./component";
import Entity from "./entity";
import Manager from "./manager";
import { Query, QueryBuilder, ResettableQuery } from "./query";
import { Optional } from "./trait";

class Position extends Component {
  public x = 0;
  public y = 0;
}

class Velocity extends Component {
  public x = 0;
  public y = 0;
}

class Rotation extends Component {
  public angle = 0;
}

describe("Query builder", () => {
  it("extracts the related traits", () => {
    const entityPool = new Map<string, Entity>();
    const builder = new QueryBuilder<Component, Entity>(
      [Position, Velocity.present()],
      entityPool.values()
    );

    const relatedTraits = [...builder.getRelatedTraits()];

    expect(relatedTraits).toHaveLength(2);
    expect(relatedTraits).toContain(Position);
    expect(relatedTraits).toContain(Velocity);
  });

  it("initializes the initial container list", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entityA = new Entity("a", manager).add(Position);
    const entityB = new Entity("b", manager).add(Position).add(Velocity);
    entityPool.set(entityA.id, entityA);
    entityPool.set(entityB.id, entityB);

    const builder = new QueryBuilder<Component, Entity>(
      [Position, Velocity.present()],
      entityPool.values()
    );

    const { containers } = builder;
    expect(containers.size).toBe(1);
    expect(containers.has(entityA)).toBe(false);
    expect(containers.has(entityB)).toBe(true);
  });

  it("adds container if the newly added trait matches the filter", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const builder = new QueryBuilder<Component, Entity>(
      [Position.added()],
      entityPool.values()
    );
    const { containers } = builder;
    expect(containers.size).toBe(0);

    const entity = new Entity("a", manager).add(Position);
    builder.onTraitAdded(entity, Position);

    expect(containers.size).toBe(1);
    expect([...containers]).toContain(entity);
  });

  it("ignores container if the newly added does not match the filter", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const builder = new QueryBuilder<Component, Entity>(
      [Position.added()],
      entityPool.values()
    );
    const { containers } = builder;
    expect(containers.size).toBe(0);

    const entity = new Entity("a", manager).add(Velocity);
    builder.onTraitAdded(entity, Velocity);

    expect(containers.size).toBe(0);
  });

  it("removes the container if not longer matches the filter", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager).add(Position).add(Velocity);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<Component, Entity>(
      [Position],
      entityPool.values()
    );
    const { containers } = builder;
    expect(containers.size).toBe(1);

    entity.remove(Position);
    builder.onTraitRemoved(entity, Position);
    expect(containers.size).toBe(0);
  });

  it("adds newly spawned container if it matches the filter", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const builder = new QueryBuilder<Component, Entity>(
      [Position.absent()],
      entityPool.values()
    );
    const { containers } = builder;
    expect(containers.size).toBe(0);

    const entity = new Entity("a", manager);
    builder.onContainerAdded(entity);

    expect(containers.size).toBe(1);
    expect([...containers]).toContain(entity);
  });

  it("ignores newly spawned container when not tracking absence", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const builder = new QueryBuilder<Component, Entity>(
      [Position.present()],
      entityPool.values()
    );
    const { containers } = builder;
    expect(containers.size).toBe(0);

    const entity = new Entity("a", manager);
    builder.onContainerAdded(entity);

    expect(containers.size).toBe(0);
  });

  it("removes newly removed containers", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager).add(Position);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<Component, Entity>(
      [Position],
      entityPool.values()
    );
    const { containers } = builder;
    expect(containers.size).toBe(1);

    builder.onContainerRemoved(entity);
    expect(containers.size).toBe(0);
    expect([...containers]).not.toContain(entity);
  });

  it("clears tracked result when reset() is called", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager).add(Position);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<Component, Entity>(
      [Position.changed()],
      entityPool.values()
    );
    const { containers } = builder;
    expect(containers.size).toBe(1);

    builder.reset();
    expect(containers.size).toBe(0);
  });

  it("does nothing when reset() is called but no trait is tracking", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager).add(Position);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<Component, Entity>(
      [Position],
      entityPool.values()
    );
    const { containers } = builder;
    expect(containers.size).toBe(1);

    builder.reset();
    expect(containers.size).toBe(1);
  });

  it("adds newly changed containers if it matches the filter", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager).add(Position, { x: 11, y: 22 });
    entityPool.set(entity.id, entity);
    const builder = new QueryBuilder<Component, Entity>(
      [Position.changed()],
      entityPool.values()
    );
    builder.reset();

    const { containers } = builder;
    expect(containers.size).toBe(0);

    entity.get(Position).x = 22;
    builder.onTraitChanged(entity, Position);

    expect(containers.size).toBe(1);
    expect([...containers]).toContain(entity);
  });

  it("ignores newly changed containers if the trait are not tracked", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager)
      .add(Position, { x: 11, y: 22 })
      .add(Velocity);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<Component, Entity>(
      [Velocity.changed()],
      entityPool.values()
    );
    const { containers } = builder;
    expect(containers.size).toBe(1);

    builder.reset();
    expect(containers.size).toBe(0);

    entity.get(Position).x = 22;
    builder.onTraitChanged(entity, Position);

    expect(containers.size).toBe(0);
  });

  it("retrieves request trait values", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager)
      .add(Position, { x: 11, y: 22 })
      .add(Rotation, { angle: 69 }) // Nice
      .add(Velocity);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<
      Component,
      Entity,
      [typeof Rotation, PresentFilter<Component>, typeof Position]
    >([Rotation, Velocity.present(), Position], entityPool.values());

    const instances = builder.getTraitInstances(entity);
    expect(instances).toHaveLength(2);
    expect(instances[0]).toBeInstanceOf(Rotation);
    expect(instances[0]?.angle).toBe(69);
    expect(instances[1]).toBeInstanceOf(Position);
    expect(instances[1]?.x).toBe(11);
    expect(instances[1]?.y).toBe(22);
  });
});

describe("Query", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
    // Nothing to do
  });

  afterEach(() => {
    warnSpy.mockClear();
  });

  it("iterates directly over entities", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entityA = new Entity("a", manager).add(Position);
    const entityB = new Entity("b", manager).add(Position).add(Velocity);
    entityPool.set(entityA.id, entityA);
    entityPool.set(entityB.id, entityB);

    const builder = new QueryBuilder<Component, Entity, [typeof Position]>(
      [Position],
      entityPool.values()
    );
    const query = new Query(builder);

    expect([...query]).toEqual([entityA, entityB]);
  });

  it("iterates directly over entities' components", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager).add(Position).add(Velocity);
    const position = entity.get(Position);
    const velocity = entity.get(Velocity);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<
      Component,
      Entity,
      [typeof Position, typeof Velocity]
    >([Position, Velocity], entityPool.values());
    const query = new Query(builder);

    const components = [...query.asComponents()];
    expect(components).toEqual([[position, velocity]]);
    expectTypeOf(components).toEqualTypeOf<Array<[Position, Velocity]>>();
  });

  it("iterates over tuples of entities with their componenents", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager).add(Position).add(Velocity);
    const position = entity.get(Position);
    const velocity = entity.get(Velocity);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<
      Component,
      Entity,
      [typeof Position, typeof Velocity]
    >([Position, Velocity], entityPool.values());
    const query = new Query(builder);

    const entities = [...query.withComponents()];
    expect(entities).toEqual([[entity, position, velocity]]);
    expectTypeOf(entities).toEqualTypeOf<Array<[Entity, Position, Velocity]>>();
  });

  it("can check if an entity is in the query set", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager).add(Position);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<Component, Entity, [typeof Position]>(
      [Position],
      entityPool.values()
    );
    const query = new Query(builder);

    expect(query.has(entity)).toBe(true);
  });

  it("can check if an entity is not in the query set", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager).add(Position);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<
      Component,
      Entity,
      [typeof Position, typeof Velocity]
    >([Position, Velocity], entityPool.values());
    const query = new Query(builder);

    expect(query.has(entity)).toBe(false);
  });

  it("can count the number of entities in the queryset", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entityA = new Entity("a", manager).add(Position);
    const entityB = new Entity("b", manager).add(Position);
    const entityC = new Entity("c", manager).add(Position);
    entityPool.set(entityA.id, entityA);
    entityPool.set(entityB.id, entityB);
    entityPool.set(entityC.id, entityC);

    const builder = new QueryBuilder<Component, Entity, [typeof Position]>(
      [Position],
      entityPool.values()
    );
    const query = new Query(builder);

    expect(query.size).toBe(3);
  });

  it("can retrieve a single entity in the queryset", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entityA = new Entity("a", manager).add(Position);
    entityPool.set(entityA.id, entityA);

    const builder = new QueryBuilder<Component, Entity, [typeof Position]>(
      [Position],
      entityPool.values()
    );
    const query = new Query(builder);

    expect(query.getOne()).toBe(entityA);
  });

  it("throws an error if there are no entities in the queryset", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;

    const builder = new QueryBuilder<Component, Entity, [typeof Position]>(
      [Position],
      entityPool.values()
    );
    const query = new Query(builder);

    expect(() => query.getOne()).toThrowError();
  });

  it("warns if there are more than one entities in the queryset", () => {
    const manager = new Manager<Component, Entity>();
    const entityA = new Entity("a", manager).add(Position);
    const entityB = new Entity("b", manager).add(Position);

    const entityPool = manager.containers;
    entityPool.set(entityA.id, entityA);
    entityPool.set(entityB.id, entityB);

    const builder = new QueryBuilder<Component, Entity, [typeof Position]>(
      [Position],
      entityPool.values()
    );
    const query = new Query(builder);

    const result = query.getOne();

    expect(query.size).toBe(2);
    expect(result).toBe(entityA);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("can retrieve a single entity as components", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entityA = new Entity("a", manager).add(Position);
    entityPool.set(entityA.id, entityA);

    const builder = new QueryBuilder<Component, Entity, [typeof Position]>(
      [Position],
      entityPool.values()
    );
    const query = new Query(builder);

    expect(query.getOneAsComponents()).toEqual([entityA.get(Position)]);
  });

  it("can retrieve a single entity with its components", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entityA = new Entity("a", manager).add(Position);
    entityPool.set(entityA.id, entityA);

    const builder = new QueryBuilder<Component, Entity, [typeof Position]>(
      [Position],
      entityPool.values()
    );
    const query = new Query(builder);

    expect(query.getOneWithComponents()).toEqual([
      entityA,
      entityA.get(Position),
    ]);
  });
});

describe("ResettableQuery", () => {
  it("calls the builder's reset method", () => {
    const entityPool = new Map<string, Entity>();
    const builder = new QueryBuilder<Component, Entity, [typeof Position]>(
      [Position],
      entityPool.values()
    );
    const query = new ResettableQuery(builder);

    const mockReset = vi.spyOn(builder, "reset");
    query.reset();
    expect(mockReset).toHaveBeenCalled();
  });
});

describe("Optional traits", () => {
  it("retreieves optional traits", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager).add(Position);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<Component, Entity, [Optional<Component>]>(
      [new Optional(Position)],
      entityPool.values()
    );
    const query = new Query(builder);

    const entities = [...query.asComponents()];
    const position = entity.get(Position);
    expect(entities).toEqual([[position]]);
  });

  it("retrieves optional traits that don't exist", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<Component, Entity, [Optional<Component>]>(
      [new Optional(Position)],
      entityPool.values()
    );
    const query = new Query(builder);

    const entities = [...query.asComponents()];
    expect(entities).toEqual([[undefined]]);
  });

  it("retrieves optional traits added after the query is created", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<Component, Entity, [Optional<Component>]>(
      [new Optional(Position)],
      entityPool.values()
    );

    const query = new Query(builder);

    entity.add(Position);

    const entities = [...query.asComponents()];
    const position = entity.get(Position);
    expect(entities).toEqual([[position]]);
  });

  it("retrieves optional traits added after the query is reset", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<Component, Entity, [Optional<Component>]>(
      [new Optional(Position)],
      entityPool.values()
    );

    const query = new ResettableQuery(builder);

    entity.add(Position);

    query.reset();

    const entities = [...query.asComponents()];
    const position = entity.get(Position);
    expect(entities).toEqual([[position]]);
  });

  it("retrieves optional traits removed after the query is created", () => {
    const manager = new Manager<Component, Entity>();
    const entityPool = manager.containers;
    const entity = new Entity("a", manager).add(Position);
    entityPool.set(entity.id, entity);

    const builder = new QueryBuilder<Component, Entity, [Optional<Component>]>(
      [new Optional(Position)],
      entityPool.values()
    );

    const query = new Query(builder);

    entity.remove(Position);

    const entities = [...query.asComponents()];
    expect(entities).toEqual([[undefined]]);
  });
});
