import Filter, {
  AggregateFilter,
  AllFilter,
  AnyFilter,
  CompositeFilter,
} from "./filter";
import World from "./world";
import Component from "./component";

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

describe("Filter class", () => {
  class TestFilter extends Filter<Component> {
    public matches() {
      return true;
    }
  }

  it("exposes a shortcut to AllFilter", () => {
    const filter = new TestFilter();
    const position = Position.present();
    const velocity = Velocity.present();

    const allFilter = filter.and(position, velocity);

    expect(allFilter instanceof AllFilter).toBe(true);
    // @ts-expect-error 2341 - We want to check its private property
    expect(allFilter.subFilters).toEqual([filter, position, velocity]);
  });

  it("exposes a shortcut to AnyFilter", () => {
    const testFilter = new TestFilter();
    const position = Position.present();
    const velocity = Velocity.present();

    const anyFilter = testFilter.or(position, velocity);

    expect(anyFilter instanceof AnyFilter).toBe(true);
    // @ts-expect-error 2341 - We want to check its private property
    const [filter, allFilter] = anyFilter.subFilters;
    expect(filter).toBe(testFilter);
    expect(allFilter instanceof AllFilter).toBe(true);
    // @ts-expect-error 2341 - We want to check its private property
    expect(allFilter.subFilters).toEqual([position, velocity]);
  });
});

describe("querying for trait presence", () => {
  it("is not a tracking filter", () => {
    const filter = Position.present();

    expect([...filter.getTrackingTraits()]).toEqual([]);
  });

  it("gets containers that have the given trait", () => {
    const world = new World();
    const entity = world.spawn().add(Position);

    const query = world.query(Position.present());

    expect([...query]).toContain(entity);
  });

  it("ignores containers lacking the given trait", () => {
    const world = new World();
    const entity = world.spawn();

    const query = world.query(Position.present());

    expect([...query]).not.toContain(entity);
  });

  it("ignores containers that had their trait removed", () => {
    const world = new World();
    const entity = world.spawn().add(Position);

    const query = world.query(Position.present());
    expect([...query]).toContain(entity);

    entity.remove(Position);
    expect([...query]).not.toContain(entity);
  });

  it("ignores removed containers", () => {
    const world = new World();
    const entity = world.spawn().add(Position);

    const query = world.query(Position.present());
    expect([...query]).toContain(entity);

    world.remove(entity);
    expect([...query]).not.toContain(entity);
  });
});

describe("querying for trait absence", () => {
  it("is not a tracking filter", () => {
    const filter = Position.absent();

    expect([...filter.getTrackingTraits()]).toHaveLength(0);
  });

  it("gets containers lacking the given trait", () => {
    const world = new World();
    const entity = world.spawn();

    const query = world.query(Position.absent());

    expect([...query]).toContain(entity);
  });

  it("ignores containers that have the given trait", () => {
    const world = new World();
    const entity = world.spawn().add(Position);

    const query = world.query(Position.absent());

    expect([...query]).not.toContain(entity);
  });

  it("gets containers that had their trait removed", () => {
    const world = new World();
    const entity = world.spawn().add(Position);

    const query = world.query(Position.absent());
    expect([...query]).not.toContain(entity);

    entity.remove(Position);
    expect([...query]).toContain(entity);
  });

  it("ignores removed containers", () => {
    const world = new World();
    const entity = world.spawn();

    const query = world.query(Position.absent());
    expect([...query]).toContain(entity);

    world.remove(entity);
    expect([...query]).not.toContain(entity);
  });

  it("gets containers added after the query's creation", () => {
    const world = new World();

    const query = world.query(Position.absent());
    expect([...query]).toHaveLength(0);

    const entity = world.spawn();
    expect([...query]).toContain(entity);
  });

  it("test1", () => {
    const world = new World();
    const entityA = world.spawn().add(Position);
    const entityB = world.spawn();

    const queryA = world.query(Position);
    const queryB = world.query(Position.absent());

    expect([...queryA]).toEqual([entityA]);
    expect([...queryB]).toEqual([entityB]);
  });
});

describe("querying for trait gain", () => {
  it("is a tracking filter", () => {
    const filter = Position.added();

    const trackingTraits = [...filter.getTrackingTraits()];
    expect(trackingTraits).toHaveLength(1);
    expect(trackingTraits).toContain(Position);
  });

  it("gets containers that gained the given trait since last reset", () => {
    const world = new World();
    const entity = world.spawn();

    const query = world.query(Position.added());
    query.reset();

    entity.add(Position);

    expect([...query]).toContain(entity);
  });

  it("gets containers that had their trait added then changed since the last reset", () => {
    const world = new World();
    const entity = world.spawn();

    const query = world.query(Position.added());
    query.reset();

    entity.add(Position, { x: 0, y: 0 });
    entity.get(Position).x = 42;
    expect([...query]).toContain(entity);
  });

  it("ignores containers that didn't gain the given trait since last reset", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.added());

    query.reset();
    expect([...query]).not.toContain(entity);
  });

  it("gets containers with the given trait when the query is created", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.added());

    expect([...query]).toContain(entity);
  });

  it("ignores containers that had their trait replaced with a different one", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.added());
    query.reset();

    entity.add(Position, { x: 42, y: 0 }); // Different from initial value
    expect([...query]).not.toContain(entity);
  });

  it("ignores containers that had their trait replaced with an identical one", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.added());
    query.reset();

    entity.add(Position, { x: 0, y: 0 }); // Same as initial value
    expect([...query]).not.toContain(entity);
  });

  it("ignores containers that do not have the given trait", () => {
    const world = new World();
    const entity = world.spawn();

    const query = world.query(Position.added());

    expect([...query]).not.toContain(entity);
  });

  it("ignores containers that had the trait added after being removed since last reset", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.added());

    query.reset();

    entity.remove(Position);
    entity.add(Position);

    expect([...query]).not.toContain(entity);
  });
});

describe("querying for trait change", () => {
  it("is a tracking filter", () => {
    const filter = Position.changed();

    const trackingTraits = [...filter.getTrackingTraits()];
    expect(trackingTraits).toHaveLength(1);
    expect(trackingTraits).toContain(Position);
  });

  it("gets containers that had the given trait changed since last reset", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });
    const position = entity.get(Position);

    const query = world.query(Position.changed());
    query.reset();

    position.x = 42; // Different value from initial value
    expect([...query]).toContain(entity);
  });

  it("ignores containers that didn't have the given trait changed since last reset", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });
    const position = entity.get(Position);

    const query = world.query(Position.changed());
    query.reset();

    position.x = 0; // Same as initial value
    expect([...query]).not.toContain(entity);
  });

  it("gets containers with the given trait when the query is created", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.changed());
    expect([...query]).toContain(entity);
  });

  it("get containers that had their trait replaced with a different one", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.changed());
    query.reset();

    entity.add(Position, { x: 42, y: 0 }); // Different from initial value
    expect([...query]).toContain(entity);
  });

  it("gets containers that had their traits replaced with an identical one", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.changed());
    query.reset();

    entity.add(Position, { x: 0, y: 0 }); // Same as initial value
    expect([...query]).toContain(entity);
  });

  it("ignores containers that had their trait added without changes since the last reset", () => {
    const world = new World();
    const entity = world.spawn();

    const query = world.query(Position.changed());
    query.reset();

    entity.add(Position, { x: 0, y: 0 });
    expect([...query]).not.toContain(entity);
  });

  it("ignores containers that had their trait added then changed since the last reset", () => {
    const world = new World();
    const entity = world.spawn();

    const query = world.query(Position.changed());
    query.reset();

    entity.add(Position, { x: 0, y: 0 });
    entity.get(Position).x = 42;
    expect([...query]).not.toContain(entity);
  });

  it("ignores containers that do not have the given trait", () => {
    const world = new World();
    const entity = world.spawn();

    const query = world.query(Position.changed());

    expect([...query]).not.toContain(entity);
  });

  it("ignores containers that had another, untracked trait changed", () => {
    const world = new World();
    const entity = world.spawn().add(Position).add(Velocity);
    const velocity = entity.get(Velocity);

    const query = world.query(Position.changed(), Velocity.present());
    query.reset();

    velocity.y += 1;
    expect([...query]).not.toContain(entity);
  });

  it("gets containers that had their trait removed then re-added since the last reset", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.changed());
    query.reset();

    entity.remove(Position);
    entity.add(Position, { x: 42, y: 0 });
    expect([...query]).toContain(entity);
  });
});

describe("querying for trait removal", () => {
  it("is a tracking filter", () => {
    const filter = Position.removed();

    const trackingTraits = [...filter.getTrackingTraits()];
    expect(trackingTraits).toHaveLength(1);
    expect(trackingTraits).toContain(Position);
  });

  it("gets containers that had the given trait removed since last reset", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.removed());
    query.reset();

    entity.remove(Position);
    expect([...query]).toContain(entity);
  });

  it("ignores traits that were replaced", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.removed());
    query.reset();

    entity.add(Position, { x: 42, y: 0 });
    expect([...query]).not.toContain(entity);
  });

  it("ignores containers that had another, untracked trait removed", () => {
    const world = new World();
    const entity = world.spawn().add(Position).add(Velocity);

    const query = world.query(Position.removed(), Velocity.present());
    query.reset();

    entity.remove(Velocity);
    expect([...query]).not.toContain(entity);
  });

  it("ignores containers that had the component added after it was removed", () => {
    const world = new World();
    const entity = world.spawn().add(Position, { x: 0, y: 0 });

    const query = world.query(Position.removed());
    query.reset();

    entity.remove(Position);
    entity.add(Position, { x: 42, y: 0 });
    expect([...query]).not.toContain(entity);
  });
});

describe("matching for the composite filter", () => {
  class TestFilter extends CompositeFilter<Component> {
    public matches() {
      return true;
    }
  }

  it("aggregates related traits from its filters", () => {
    const filter = new TestFilter(Position.present(), Velocity.present());

    const { relatedTraits } = filter;
    expect(relatedTraits.size).toBe(2);
    expect(relatedTraits.has(Position)).toBe(true);
    expect(relatedTraits.has(Velocity)).toBe(true);
    expect(relatedTraits.has(Rotation)).toBe(false);
  });

  it("tracks changes if any of its filters track changes", () => {
    const filter = new TestFilter(Position.present(), Velocity.changed());

    const trackingTraits = [...filter.getTrackingTraits()];
    expect(trackingTraits).toHaveLength(1);
    expect(trackingTraits).toContain(Velocity);
    expect(trackingTraits).not.toContain(Position);
  });

  it("does not track changes if none of its filters track changes", () => {
    const filter = new TestFilter(Position.present(), Rotation.present());

    const trackingTraits = [...filter.getTrackingTraits()];
    expect(trackingTraits).toHaveLength(0);
  });
});

describe("matching for aggregate filter", () => {
  class TestFilter extends AggregateFilter<Component> {
    // Nothing to do
  }

  it("retrieves traits that match all the given filters", () => {
    const world = new World();
    const entity = world.spawn().add(Position);

    const query = world.query(
      new TestFilter(Position.present(), Velocity.absent())
    );

    expect([...query]).toContain(entity);
  });

  it("ignores containers that don't match all the filters", () => {
    const world = new World();
    const entity = world.spawn().add(Position);

    const query = world.query(
      new TestFilter(Position.present(), Velocity.present())
    );

    expect([...query]).not.toContain(entity);
  });
});

describe("matching for all filters", () => {
  it("flattens AllFilter instances", () => {
    const filterA = Position.present();
    const filterB = Velocity.absent();
    const filterC = Position.added();
    const filterD = Position.changed();

    const allFilter = filterA.and(new AllFilter(filterB, filterC).and(filterD));

    // @ts-expect-error 2445 - We need to access inner value
    const { subFilters } = allFilter;
    expect(subFilters).toEqual([filterA, filterB, filterC, filterD]);
  });
});

describe("matching for any filters", () => {
  it("retrieves containers that match any of the filters", () => {
    const world = new World();
    const entity = world.spawn().add(Position);

    const query = world.query(
      new AnyFilter(Position.present(), Velocity.present())
    );

    expect([...query]).toContain(entity);
  });

  it("ignores containers that do not match any of the filters", () => {
    const world = new World();
    const entity = world.spawn().add(Position);

    const query = world.query(
      new AnyFilter(Position.absent(), Velocity.present())
    );

    expect([...query]).not.toContain(entity);
  });

  it("flattens AnyFilter instances", () => {
    const filterA = Position.present();
    const filterB = Velocity.absent();
    const filterC = Position.added();
    const filterD = Position.changed();

    const anyFilter = filterA.or(new AnyFilter(filterB, filterC).or(filterD));

    // @ts-expect-error 2445 - We need to access inner value
    const { subFilters } = anyFilter;
    expect(subFilters).toEqual([filterA, filterB, filterC, filterD]);
  });
});
