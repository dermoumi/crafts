import type Entity from "./entity";

import Component from "./component";
import World from "./world";
import { exclusive } from "./trait";

class TestTrait extends Component {
  public x = 0;
  public y = 0;
}

class TestConstructibleTrait extends Component {
  public x = 0;
  public y = 0;

  public constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }
}

describe("Trait management", () => {
  it("instanciates with no traits", () => {
    const world = new World();
    const entity = world.spawn();

    const traits = [...entity.traits()];
    expect(traits).toHaveLength(0);
  });

  it("can add new traits", () => {
    const world = new World();
    const entity = world.spawn();

    entity.add(TestTrait);

    const traits = [...entity.traits()];
    expect(traits).toHaveLength(1);
    expect(traits).toContain(TestTrait);

    const trait = entity.get(TestTrait);
    expect(trait?.x).toBe(0);
    expect(trait?.y).toBe(0);
  });

  it("can give traits an initial value", () => {
    const world = new World();
    const entity = world.spawn();

    entity.add(TestTrait, { x: 1, y: 2 });

    const traits = [...entity.traits()];
    expect(traits).toHaveLength(1);
    expect(traits).toContain(TestTrait);

    const trait = entity.get(TestTrait);
    expect(trait.x).toBe(1);
    expect(trait.y).toBe(2);
  });

  it("instanciates traits", () => {
    const world = new World();
    const entity = world.spawn();

    entity.addNew(TestConstructibleTrait, 1, 2);

    const traits = [...entity.traits()];
    expect(traits).toHaveLength(1);
    expect(traits).toContain(TestConstructibleTrait);

    const trait = entity.get(TestConstructibleTrait);
    expect(trait.x).toBe(1);
    expect(trait.y).toBe(2);
  });

  it("removes traits", () => {
    const world = new World();
    const entity = world.spawn();

    entity.add(TestTrait);

    const traits = [...entity.traits()];
    expect(traits).toHaveLength(1);
    expect(traits).toContain(TestTrait);

    entity.remove(TestTrait);
    expect([...entity.traits()]).toHaveLength(0);
  });

  it("does nothing when removing inexistant traits", () => {
    const world = new World();
    const entity = world.spawn();

    expect([...entity.traits()]).toHaveLength(0);

    expect(() => entity.remove(TestTrait)).not.toThrow();

    const traits = [...entity.traits()];
    expect(traits).toHaveLength(0);
  });

  it("can add component bundles", () => {
    const TestBundle = (entity: Entity, x: number, y: number) => {
      entity
        .add(TestTrait, { x: 10, y: 42 })
        .addNew(TestConstructibleTrait, x, y);
    };

    const world = new World();
    const entity = world.spawn();
    entity.addBundle(TestBundle, 1, 2);

    const componentA = entity.get(TestTrait);
    expect(componentA).toBeDefined();
    expect(componentA?.x).toBe(10);
    expect(componentA?.y).toBe(42);

    const componentB = entity.get(TestConstructibleTrait);
    expect(componentB).toBeDefined();
    expect(componentB?.x).toBe(1);
    expect(componentB?.y).toBe(2);
  });
});

describe("Trait retrieval", () => {
  it("retrieves existing traits", () => {
    const world = new World();
    const entity = world.spawn();

    entity.add(TestTrait);

    const trait = entity.get(TestTrait);
    expect(trait).toBeInstanceOf(TestTrait);
  });

  it("throws when retrieving a non-existent trait", () => {
    const world = new World();
    const entity = world.spawn();

    expect(() => entity.get(TestTrait)).toThrow();
  });

  it("tries to retrieve inexisting trait", () => {
    const world = new World();
    const entity = world.spawn();

    const trait = entity.tryGet(TestTrait);
    expect(trait).toBeUndefined();
  });
});

describe("Exclusive trait handling", () => {
  @exclusive("TestGroup")
  class ExclusiveTraitA extends Component {}

  @exclusive("TestGroup")
  class ExclusiveTraitB extends Component {
    public value = 0;
  }

  it("removes other traits of an exclusion group when adding an exclusive trait", () => {
    const world = new World();
    const entity = world.spawn();

    entity.add(ExclusiveTraitA);
    entity.add(ExclusiveTraitB);

    const traits = [...entity.traits()];
    expect(traits).toHaveLength(1);
    expect(traits).toContain(ExclusiveTraitB);
    expect(traits).not.toContain(ExclusiveTraitA);
  });
});

describe("Testing for traits", () => {
  it("checks if the given trait is present", () => {
    const world = new World();
    const entity = world.spawn().add(TestTrait);

    expect(entity.has(TestTrait)).toBe(true);
  });

  it("checks if the given trait is not present", () => {
    const world = new World();
    const entity = world.spawn();

    expect(entity.has(TestTrait)).toBe(false);
  });

  it("checks if all given trait are present", () => {
    const world = new World();
    const entity = world
      .spawn()
      .add(TestTrait)
      .addNew(TestConstructibleTrait, 1, 2);

    expect(entity.hasAll(TestTrait, TestConstructibleTrait)).toBe(true);
  });

  it("checks if any of the given traits is not present", () => {
    const world = new World();
    const entity = world.spawn().add(TestTrait);

    expect(entity.hasAll(TestTrait, TestConstructibleTrait)).toBe(false);
  });

  it("checks if any of the given traits is present", () => {
    const world = new World();
    const entity = world.spawn().add(TestTrait);

    expect(entity.hasAny(TestTrait, TestConstructibleTrait)).toBe(true);
  });

  it("checks if none of the given traits is present", () => {
    const world = new World();
    const entity = world.spawn();

    expect(entity.hasAny(TestTrait, TestConstructibleTrait)).toBe(false);
  });
});
