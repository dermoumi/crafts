import type Entity from "./entity";

import Component from "./component";
import World from "./world";

class TestComponent extends Component {
  public x = 0;
  public y = 0;
  public readonly readOnlyField = 42;
}

class TestConstructibleComponent extends Component {
  public x = 0;
  public y = 0;

  public constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }
}

describe("Component management", () => {
  it("adds component bundles", () => {
    const testBundle = (entity: Entity, x: number, y: number) => {
      entity
        .add(TestComponent, { x, y })
        .addNew(TestConstructibleComponent, x * 2, y * 2);
    };

    const world = new World();
    const entity = world.spawn();
    entity.addBundle(testBundle, 1, 2);

    const componentA = entity.get(TestComponent);
    expect(componentA).toBeDefined();
    expect(componentA?.x).toBe(1);
    expect(componentA?.y).toBe(2);

    const componentB = entity.get(TestConstructibleComponent);
    expect(componentB).toBeDefined();
    expect(componentB?.x).toBe(2);
    expect(componentB?.y).toBe(4);
  });

  it("shows the correct container name when an error is thrown", () => {
    const world = new World();
    const entity = world.spawn();

    expect(() => entity.get(TestComponent)).toThrow(
      `TestComponent is not present in Entity ${entity.id}`
    );
  });
});