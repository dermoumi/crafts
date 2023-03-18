import Component from "./component";
import Entity from "./entity";
import { ResettableQuery } from "./query";
import Resource from "./resource";
import System from "./system";
import World, { makeDefaultIDGenerator } from "./world";

class Position extends Component {
  public x = 0;
  public y = 0;
}

class AppInfo extends Resource {
  public name = "My App";
}

class FrameInfo extends Resource {
  public fps = 60;
}

describe("World entities", () => {
  it("spawns new entities", () => {
    const world = new World();
    const entity = world.spawn();

    expect(entity).toBeInstanceOf(Entity);
  });

  it("retrieves entities by their ID", () => {
    const world = new World();
    const entity = world.spawn();

    expect(world.get(entity.id)).toBe(entity);
  });

  it("removes entities", () => {
    const world = new World();
    const entity = world.spawn();

    expect(world.get(entity.id)).toBe(entity);

    world.remove(entity);

    expect(world.get(entity.id)).toBeUndefined();
  });

  it("generates IDs using the given generator", () => {
    let id = 0;
    function generator() {
      return `id-${id++}`;
    }

    const world = new World(generator);
    const entity1 = world.spawn();
    const entity2 = world.spawn();

    expect(entity1.id).toBe("id-0");
    expect(entity2.id).toBe("id-1");
  });
});

describe("World queries", () => {
  it("creates resettable queries", () => {
    const world = new World();
    const query = world.query();

    expect(query).toBeInstanceOf(ResettableQuery);
  });
});

describe("World systems", () => {
  it("creates a system that has a single query", () => {
    const systemResult = vi.fn();
    const TestSystem = new System({ query: [Position] }, ({ query }) => {
      systemResult([...query]);
    });
    const world = new World();
    const entity = world.spawn().add(Position);
    const system = world.addSystem(TestSystem);

    systemResult.mockClear();
    system();

    expect(systemResult).toHaveBeenCalledWith([entity]);
  });

  it("creates a system that has a multiple queries", () => {
    const systemResult = vi.fn();
    const TestSystem = new System(
      { queryA: [Position], queryB: [Position.absent()] },
      ({ queryA, queryB }) => {
        for (const components of queryA.asComponents()) {
          expectTypeOf(components).toEqualTypeOf<[Position]>();
        }

        for (const components of queryB.asComponents()) {
          expectTypeOf(components).toEqualTypeOf<[]>();
        }

        systemResult([...queryA], [...queryB]);
      }
    );

    const world = new World();
    const entityA = world.spawn().add(Position);
    const entityB = world.spawn();
    const system = world.addSystem(TestSystem);

    systemResult.mockClear();
    system();

    expect(systemResult).toHaveBeenCalledWith([entityA], [entityB]);
  });

  it("creates a system that can query resources", () => {
    const systemResult = vi.fn();
    const TestSystem = new System(
      { resources: [AppInfo, FrameInfo] },
      ({ resources }) => {
        expectTypeOf(resources).toEqualTypeOf<[AppInfo, FrameInfo]>();
        systemResult(resources);
      }
    );
    const world = new World();
    const { resources } = world;
    resources.add(AppInfo).add(FrameInfo);
    const appInfo = resources.get(AppInfo);
    const frameInfo = resources.get(FrameInfo);
    const system = world.addSystem(TestSystem);

    systemResult.mockClear();
    system();

    expect(systemResult).toHaveBeenCalledWith([appInfo, frameInfo]);
  });

  it("does not call the system's callback when resource query is not satisfied", () => {
    const systemCallback = vi.fn();
    const TestSystem = new System({ resources: [AppInfo] }, systemCallback);
    const world = new World();
    const system = world.addSystem(TestSystem);

    systemCallback.mockClear();
    system();

    expect(systemCallback).not.toHaveBeenCalled();
  });

  it("retrieves multiple queries correctly", () => {
    const queryAResult = vi.fn();
    const queryBResult = vi.fn();
    const resourcesResult = vi.fn();
    const TestSystem = new System(
      {
        queryA: [Position],
        queryB: [Position.absent()],
        resources: [AppInfo],
      },
      ({ queryA, queryB, resources }) => {
        queryAResult([...queryA]);
        queryBResult([...queryB]);
        resourcesResult(resources);
      }
    );
    const world = new World();
    const { resources } = world;
    resources.add(AppInfo).add(FrameInfo);
    const appInfo = resources.get(AppInfo);
    const entityA = world.spawn().add(Position);
    const entityB = world.spawn().add(Position);
    const entityC = world.spawn();
    const system = world.addSystem(TestSystem);

    queryAResult.mockClear();
    queryBResult.mockClear();
    resourcesResult.mockClear();
    system();

    expect(queryAResult).toHaveBeenCalledWith([entityA, entityB]);
    expect(queryBResult).toHaveBeenCalledWith([entityC]);
    expect(resourcesResult).toHaveBeenCalledWith([appInfo]);
  });

  it("runs commands after the system executes", () => {
    const SpawningSystem = new System({}, ({ command }) => {
      command(({ spawn }) => {
        spawn().add(Position, { x: 144, y: 42 });
      });
    });
    const world = new World();
    const spawner = world.addSystem(SpawningSystem);
    const query = world.query(Position);
    expect(query.size).toBe(0);

    spawner();

    expect(query.size).toBe(1);
    expect([...query.asComponents()]).toEqual([[{ x: 144, y: 42 }]]);
  });

  it("creates in-place systems", () => {
    const systemResult = vi.fn();
    const world = new World();
    const entity = world.spawn().add(Position);
    const system = world.addSystem({ query: [Position] }, ({ query }) => {
      systemResult([...query]);
    });

    systemResult.mockClear();
    system();

    expect(systemResult).toHaveBeenCalledWith([entity]);
  });

  it("fails if the callback is omitted when creating an in-place system", () => {
    const world = new World();

    expect(() => {
      // @ts-expect-error - Calling the non-overloaded version of addSystem
      world.addSystem({ query: [Position] });
    }).toThrowError("Missing system callback");
  });

  it("system component queries reset correctly after calls", () => {
    const world = new World();
    world.spawn().add(Position);

    const callback = vi.fn();
    const system = world.addSystem(
      { entities: [Position.added()] },
      ({ entities }) => {
        for (const entity of entities) {
          callback(entity);
        }
      }
    );

    expect(callback).not.toHaveBeenCalled();
    system();
    system();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("system resource queries reset correctly after calls", () => {
    const world = new World();
    world.resources.add(FrameInfo);

    const callback = vi.fn();
    const system = world.addSystem(
      { resources: [FrameInfo, FrameInfo.added()] },
      callback
    );

    expect(callback).not.toHaveBeenCalled();
    system();
    system();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("Default ID generator", () => {
  it("starts with the minimum safe integer", () => {
    const generator = makeDefaultIDGenerator();

    expect(generator()).toBe(Number.MIN_SAFE_INTEGER.toString());
  });

  it("increments the ID by 1 on each call", () => {
    const generator = makeDefaultIDGenerator();

    expect(generator()).toBe(Number.MIN_SAFE_INTEGER.toString());
    expect(generator()).toBe((Number.MIN_SAFE_INTEGER + 1).toString());
  });
});
