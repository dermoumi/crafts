import type Entity from "./entity";
import { Component } from "./component";
import { QueryBuilder } from "./query";
import { World } from "./world";

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

  it("fails when a query does not contain any filters", () => {
    const world = new World();
    expect(() => world.query()).toThrowError(
      "Query must contain at least one filter or non-optional trait"
    );
  });

  it("fails when a query only has optional filters", () => {
    const entityPool = new Map<string, Entity>();
    expect(() => {
      // eslint-disable-next-line no-new
      new QueryBuilder<Component, Entity>(
        [Position.optional(), Velocity.optional()],
        entityPool.values()
      );
    }).toThrowError(
      "Query must contain at least one filter or non-optional trait"
    );
  });

  it("initializes the initial container list", () => {
    const world = new World();
    const entityA = world.spawn().add(Position);
    const entityB = world.spawn().add(Position).add(Velocity);
    const query = world.query(Position, Velocity.present());

    expect(query.size).toBe(1);
    expect(query.has(entityA)).toBe(false);
    expect(query.has(entityB)).toBe(true);
  });

  it("adds container if the newly added trait matches the filter", () => {
    const world = new World();
    const query = world.query(Position.added());

    expect(query.size).toBe(0);

    const onTraitAddedSpy = vi.spyOn(QueryBuilder.prototype, "onTraitAdded");
    const entity = world.spawn().add(Position);

    expect(onTraitAddedSpy).toHaveBeenCalledOnce();
    expect(query.size).toBe(1);
    expect([...query]).toContain(entity);
  });

  it("ignores container if the newly added does not match the filter", () => {
    const world = new World();
    const query = world.query(Position.added());

    expect(query.size).toBe(0);

    const onTraitAddedSpy = vi.spyOn(QueryBuilder.prototype, "onTraitAdded");
    world.spawn().add(Velocity);

    expect(onTraitAddedSpy).not.toHaveBeenCalled();
    expect(query.size).toBe(0);
  });

  it("removes the container if not longer matches the filter", () => {
    const world = new World();
    const query = world.query(Position);

    const entity = world.spawn().add(Position).add(Velocity);
    expect(query.size).toBe(1);

    const onTraitRemovedSpy = vi.spyOn(
      QueryBuilder.prototype,
      "onTraitRemoved"
    );
    entity.remove(Position);

    expect(onTraitRemovedSpy).toHaveBeenCalledOnce();
    expect(query.size).toBe(0);
  });

  it("adds newly spawned container if it matches the filter", () => {
    const world = new World();
    const query = world.query(Position);

    expect(query.size).toBe(0);

    const onContainerAddedSpy = vi.spyOn(
      QueryBuilder.prototype,
      "onContainerAdded"
    );
    const entity = world.spawn().add(Position);

    expect(onContainerAddedSpy).toHaveBeenCalledOnce();
    expect(query.size).toBe(1);
    expect([...query]).toContain(entity);
  });

  it("ignores newly spawned container when not tracking absence", () => {
    const world = new World();
    const query = world.query(Position.present());

    expect(query.size).toBe(0);

    const onContainerAddedSpy = vi.spyOn(
      QueryBuilder.prototype,
      "onContainerAdded"
    );
    world.spawn();

    expect(onContainerAddedSpy).toHaveBeenCalled();
    expect(query.size).toBe(0);
  });

  it("removes newly removed containers", () => {
    const world = new World();
    const query = world.query(Position);

    const entity = world.spawn().add(Position);
    expect(query.size).toBe(1);

    const onContainerRemovedSpy = vi.spyOn(
      QueryBuilder.prototype,
      "onContainerRemoved"
    );
    world.remove(entity);

    expect(onContainerRemovedSpy).toHaveBeenCalledOnce();
    expect(query.size).toBe(0);
    expect([...query]).not.toContain(entity);
  });

  it("clears tracked result when reset() is called", () => {
    const world = new World();
    world.spawn().add(Position);

    const query = world.query(Position.changed());
    expect(query.size).toBe(1);

    query.reset();
    expect(query.size).toBe(0);
  });

  it("does nothing when reset() is called but no trait is tracking", () => {
    const world = new World();
    world.spawn().add(Position);

    const query = world.query(Position);
    expect(query.size).toBe(1);

    query.reset();
    expect(query.size).toBe(1);
  });

  it("adds newly changed containers if it matches the filter", () => {
    const world = new World();
    const entity = world.spawn().add(Position);
    const query = world.query(Position.changed()).reset();

    expect(query.size).toBe(0);

    const spyOnTraitChanged = vi.spyOn(
      QueryBuilder.prototype,
      "onTraitChanged"
    );
    entity.get(Position).x = 22;

    expect(spyOnTraitChanged).toHaveBeenCalledOnce();
    expect(query.size).toBe(1);
    expect([...query]).toContain(entity);
  });

  it("ignores newly changed containers if the trait are not tracked", () => {
    const world = new World();
    const entity = world.spawn().add(Position).add(Velocity);
    const query = world.query(Velocity.changed()).reset();

    expect(query.size).toBe(0);

    const spyOnTraitChanged = vi.spyOn(
      QueryBuilder.prototype,
      "onTraitChanged"
    );
    entity.get(Position).x = 22;

    expect(spyOnTraitChanged).not.toHaveBeenCalled();
    expect(query.size).toBe(0);
  });

  it("retrieves requested trait values", () => {
    const world = new World();
    const entity = world
      .spawn()
      .add(Position, { x: 11, y: 22 })
      .add(Rotation, { angle: 69 }) // Nice
      .add(Velocity);
    const query = world.query(Rotation, Velocity.present(), Position);

    const spyGetTraitInstances = vi.spyOn(
      QueryBuilder.prototype,
      "getTraitInstances"
    );
    const instances = query.getOneAsComponents();

    expect(spyGetTraitInstances).toHaveBeenCalledOnce();
    expect(spyGetTraitInstances).toHaveBeenCalledWith(entity);

    const [rotation, position] = instances;
    expect(rotation).toBeInstanceOf(Rotation);
    expect(rotation?.angle).toBe(69);
    expect(position).toBeInstanceOf(Position);
    expect(position?.x).toBe(11);
    expect(position?.y).toBe(22);
  });

  it("does not track components from removed entities", () => {
    const world = new World();
    const entity = world.spawn();
    const query = world.query(Position.added()).reset();

    expect(query.size).toBe(0);

    world.remove(entity);
    entity.add(Position);

    expect(query.size).toBe(0);
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
    const world = new World();
    const entityA = world.spawn().add(Position);
    const entityB = world.spawn().add(Position).add(Velocity);

    const query = world.query(Position);

    expect([...query]).toEqual([entityA, entityB]);
  });

  it("iterates directly over entities' components", () => {
    const world = new World();
    const entity = world.spawn().add(Position).add(Velocity);
    const position = entity.get(Position);
    const velocity = entity.get(Velocity);
    const query = world.query(Position, Velocity);

    const components = [...query.asComponents()];
    expect(components).toEqual([[position, velocity]]);
    expectTypeOf(components).toEqualTypeOf<Array<[Position, Velocity]>>();
  });

  it("iterates over tuples of entities with their componenents", () => {
    const world = new World();
    const entity = world.spawn().add(Position).add(Velocity);
    const position = entity.get(Position);
    const velocity = entity.get(Velocity);
    const query = world.query(Position, Velocity);

    const entities = [...query.withComponents()];
    expect(entities).toEqual([[entity, position, velocity]]);
    expectTypeOf(entities).toEqualTypeOf<Array<[Entity, Position, Velocity]>>();
  });

  it("can check if an entity is in the query set", () => {
    const world = new World();
    const entity = world.spawn().add(Position);
    const query = world.query(Position);

    expect(query.has(entity)).toBe(true);
  });

  it("can check if an entity is not in the query set", () => {
    const world = new World();
    const entity = world.spawn().add(Position);
    const query = world.query(Position, Velocity);

    expect(query.has(entity)).toBe(false);
  });

  it("can count the number of entities in the queryset", () => {
    const world = new World();
    const query = world.query(Position);
    for (let i = 0; i < 3; ++i) {
      world.spawn().add(Position);
    }

    expect(query.size).toBe(3);
  });

  it("can retrieve a single entity in the queryset", () => {
    const world = new World();
    const entity = world.spawn().add(Position);
    const query = world.query(Position);

    expect(query.getOne()).toBe(entity);
  });

  it("throws an error if there are no entities in the queryset", () => {
    const world = new World();
    const query = world.query(Position);

    expect(() => query.getOne()).toThrowError();
  });

  it("warns if there are more than one entities in the queryset", () => {
    const world = new World();
    const query = world.query(Position);
    const entityA = world.spawn().add(Position);
    world.spawn().add(Position);

    const result = query.getOne();

    expect(query.size).toBe(2);
    expect(result).toBe(entityA);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("can retrieve a single entity as components", () => {
    const world = new World();
    const entity = world.spawn().add(Position);
    const query = world.query(Position);

    expect(query.getOneAsComponents()).toEqual([entity.get(Position)]);
  });

  it("can retrieve a single entity with its components", () => {
    const world = new World();
    const entity = world.spawn().add(Position);
    const position = entity.get(Position);
    const query = world.query(Position);

    expect(query.getOneWithComponents()).toEqual([entity, position]);
  });
});

describe("ResettableQuery", () => {
  it("calls the builder's reset method", () => {
    const world = new World();
    const query = world.query(Position);

    const mockReset = vi.spyOn(QueryBuilder.prototype, "reset");
    query.reset();
    expect(mockReset).toHaveBeenCalled();
  });
});

describe("Optional traits", () => {
  it("retreieves optional traits", () => {
    const world = new World();
    const entity = world.spawn().add(Position).add(Velocity);
    const query = world.query(Velocity, Position.optional());

    const entities = [...query];
    expect(entities).toEqual([entity]);

    const position = entity.get(Position);
    const velocity = entity.get(Velocity);
    const components = [...query.asComponents()];
    expect(components).toEqual([[velocity, position]]);
  });

  it("retrieves optional traits that don't exist", () => {
    const world = new World();
    const entity = world.spawn().add(Velocity);
    const query = world.query(Velocity, Position.optional());

    const entities = [...query];
    expect(entities).toEqual([entity]);

    const velocity = entity.get(Velocity);
    const components = [...query.asComponents()];
    expect(components).toEqual([[velocity, undefined]]);
  });

  it("retrieves optional traits added after the query is created", () => {
    const world = new World();
    const entity = world.spawn().add(Velocity);
    const query = world.query(Velocity, Position.optional());

    entity.add(Position);

    const entities = [...query];
    expect(entities).toEqual([entity]);

    const position = entity.get(Position);
    const velocity = entity.get(Velocity);
    const components = [...query.asComponents()];
    expect(components).toEqual([[velocity, position]]);
  });

  it("retrieves optional traits added before the query is reset", () => {
    const world = new World();
    const entity = world.spawn().add(Velocity);
    const query = world.query(Velocity, Position.optional());

    entity.add(Position);
    query.reset();

    const entities = [...query];
    expect(entities).toEqual([entity]);

    const position = entity.get(Position);
    const velocity = entity.get(Velocity);
    const components = [...query.asComponents()];
    expect(components).toEqual([[velocity, position]]);
  });

  it("retrieves optional traits removed after the query is created", () => {
    const world = new World();
    const entity = world.spawn().add(Velocity).add(Position);
    const query = world.query(Velocity, Position.optional());

    entity.remove(Position);

    const entities = [...query];
    expect(entities).toEqual([entity]);

    const velocity = entity.get(Velocity);
    const components = [...query.asComponents()];
    expect(components).toEqual([[velocity, undefined]]);
  });
});
