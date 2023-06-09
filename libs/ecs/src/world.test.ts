import { Component } from "./component";
import { Entity } from "./entity";
import { ResettableQuery } from "./query";
import { Resource } from "./resource";
import { System } from "./system";
import { Event } from "./event";
import { World, makeDefaultIDGenerator } from "./world";

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

class Renderer extends Resource {
  public constructor(public readonly value: number) {
    super();
  }
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
    function generator(): string {
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
    const query = world.query(Position);

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
      { queryA: [Position], queryB: [Position.notPresent()] },
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

  it("does not call the system's callback when any of the component queries is empty", () => {
    const systemCallback = vi.fn();
    const TestSystem = new System(
      { queryA: [Position], queryB: [Position.notPresent()] },
      systemCallback
    );
    const world = new World();
    world.spawn().add(Position);
    const system = world.addSystem(TestSystem);

    systemCallback.mockClear();
    system();

    expect(systemCallback).not.toHaveBeenCalled();
  });

  it("calls the system's callback when there's no resource or component queries", () => {
    const systemCallback = vi.fn();
    const TestSystem = new System({}, systemCallback);
    const world = new World();
    const system = world.addSystem(TestSystem);

    systemCallback.mockClear();
    system();

    expect(systemCallback).toHaveBeenCalledOnce();
  });

  it("retrieves multiple queries correctly", () => {
    const queryAResult = vi.fn();
    const queryBResult = vi.fn();
    const resourcesResult = vi.fn();
    const TestSystem = new System(
      {
        queryA: [Position],
        queryB: [Position.notPresent()],
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

  it("system component queries reset correctly after calls", () => {
    const callback = vi.fn();
    const testSystem = new System(
      { entities: [Position.added()] },
      ({ entities }) => {
        for (const entity of entities) {
          callback(entity);
        }
      }
    );

    const world = new World();
    world.spawn().add(Position);
    const system = world.addSystem(testSystem);

    expect(callback).not.toHaveBeenCalled();
    system();
    system();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("system resource queries reset correctly after calls", () => {
    const callback = vi.fn();
    const testSystem = new System(
      { resources: [FrameInfo, FrameInfo.added()] },
      callback
    );

    const world = new World();
    world.resources.add(FrameInfo);
    const system = world.addSystem(testSystem);

    expect(callback).not.toHaveBeenCalled();
    system();
    system();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("resets component queries correctly when .reset() is called", () => {
    const callback = vi.fn();
    const testSystem = new System({ query: [Position.added()] }, callback);

    const world = new World();
    world.spawn().add(Position);
    const system = world.addSystem(testSystem);

    system.reset();
    system();
    expect(callback).not.toHaveBeenCalled();
  });

  it("resets resource queries correctly when .reset() is called", () => {
    const callback = vi.fn();
    const testSystem = new System({ resources: [FrameInfo.added()] }, callback);

    const world = new World();
    world.resources.add(FrameInfo);
    const system = world.addSystem(testSystem);

    system.reset();
    system();
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("System commands", () => {
  it("spawns new entities", () => {
    const testSystem = new System({}, ({ command }) => {
      command(({ spawn }) => {
        spawn().add(Position);
      });
    });

    const world = new World();
    const query = world.query(Position);
    const system = world.addSystem(testSystem);

    expect(query.size).toBe(0);

    system();
    expect(query.size).toBe(1);
  });

  it("removes entities", () => {
    const testSystem = new System(
      { entities: [Position.present()] },
      ({ entities, command }) => {
        command(({ remove }) => {
          for (const entity of entities) {
            remove(entity);
          }
        });
      }
    );

    const world = new World();
    world.spawn().add(Position);
    const query = world.query(Position);

    const system = world.addSystem(testSystem);

    expect(query.size).toBe(1);

    system();
    expect(query.size).toBe(0);
  });

  it("adds resources", () => {
    const testSystem = new System({}, ({ command }) => {
      command(({ addResource }) => {
        addResource(FrameInfo);
      });
    });

    const world = new World();
    const system = world.addSystem(testSystem);

    expect(world.resources.has(FrameInfo)).toBe(false);

    system();
    expect(world.resources.has(FrameInfo)).toBe(true);
  });

  it("returns the resource when adding it", () => {
    const callback = vi.fn();
    const testSystem = new System({}, ({ command }) => {
      command(({ addResource }) => {
        const resource = addResource(FrameInfo);
        callback(resource);
      });
    });

    const world = new World();
    const system = world.addSystem(testSystem);

    expect(callback).not.toHaveBeenCalled();

    system();
    const resource = world.resources.get(FrameInfo);
    expect(callback).toHaveBeenCalledWith(resource);
  });

  it("instanciates resources", () => {
    const testSystem = new System({}, ({ command }) => {
      command(({ addNewResource }) => {
        addNewResource(Renderer, 42);
      });
    });

    const world = new World();
    const system = world.addSystem(testSystem);

    expect(world.resources.has(Renderer)).toBe(false);

    system();
    const renderer = world.resources.tryGet(Renderer);
    expect(renderer).not.toBeUndefined();
    expect(renderer).toBeInstanceOf(Renderer);
    expect(renderer?.value).toBe(42);
  });

  it("returns the resource when instanciating it", () => {
    const callback = vi.fn();
    const testSystem = new System({}, ({ command }) => {
      command(({ addNewResource }) => {
        const resource = addNewResource(Renderer, 42);
        callback(resource);
      });
    });

    const world = new World();
    const system = world.addSystem(testSystem);

    expect(callback).not.toHaveBeenCalled();

    system();
    const renderer = world.resources.tryGet(Renderer);
    expect(callback).toHaveBeenCalledWith(renderer);
  });

  it("removes resources", () => {
    const testSystem = new System({}, ({ command }) => {
      command(({ removeResource }) => {
        removeResource(FrameInfo);
      });
    });

    const world = new World();
    world.resources.add(FrameInfo);
    const system = world.addSystem(testSystem);

    expect(world.resources.has(FrameInfo)).toBe(true);

    system();
    expect(world.resources.has(FrameInfo)).toBe(false);
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

describe("Trait disposal", () => {
  const disposeMock = vi.fn();

  class DisposableComponent extends Component {
    public __dispose(): void {
      disposeMock();
    }
  }

  class DisposableResource extends Resource {
    public __dispose(): void {
      disposeMock();
    }
  }

  beforeEach(() => {
    disposeMock.mockClear();
  });

  it("disposes components when they're removed", () => {
    const world = new World();
    const entity = world.spawn().add(DisposableComponent);

    entity.remove(DisposableComponent);

    expect(disposeMock).toHaveBeenCalledOnce();
  });

  it("disposes components when they're replaced", () => {
    const world = new World();
    const entity = world.spawn().add(DisposableComponent);

    entity.add(DisposableComponent);

    expect(disposeMock).toHaveBeenCalledOnce();
  });

  it("disposes components when their containing entities are removed", () => {
    const world = new World();
    const entity = world.spawn().add(DisposableComponent);

    world.remove(entity);

    expect(disposeMock).toHaveBeenCalledOnce();
  });

  it("disposes components when the world is disposed", () => {
    const world = new World();
    world.spawn().add(DisposableComponent);

    world.clear();

    expect(disposeMock).toHaveBeenCalledOnce();
  });

  it("disposes resources when they're removed", () => {
    const world = new World();
    world.resources.add(DisposableResource);

    world.resources.remove(DisposableResource);

    expect(disposeMock).toHaveBeenCalledOnce();
  });

  it("disposes resources when they're replaced", () => {
    const world = new World();
    world.resources.add(DisposableResource);

    world.resources.add(DisposableResource);

    expect(disposeMock).toHaveBeenCalledOnce();
  });

  it("disposes resources when the world is disposed", () => {
    const world = new World();
    world.resources.add(DisposableResource);

    world.clear();

    expect(disposeMock).toHaveBeenCalledOnce();
  });
});

describe("World disposal", () => {
  it("removes all entities", () => {
    const world = new World();
    const entity = world.spawn().add(Position);

    world.clear();

    expect(world.get(entity.id)).toBeUndefined();
  });

  it("removes all resources", () => {
    const world = new World();
    world.resources.add(FrameInfo);

    world.clear();

    expect(world.resources.has(FrameInfo)).toBe(false);
  });

  it("invalidates created queries", () => {
    const world = new World();
    const query = world.query(Position);

    world.spawn().add(Position);
    expect([...query]).toHaveLength(1);

    world.clear();
    world.spawn().add(Position);
    expect([...query]).toHaveLength(0);
  });

  it("invalidates systems that query resources", () => {
    const callback = vi.fn();
    const testSystem = new System({ resources: [FrameInfo] }, callback);

    const world = new World();
    const system = world.addSystem(testSystem);

    world.resources.add(FrameInfo);
    system();
    expect(callback).toHaveBeenCalledOnce();

    world.clear();
    callback.mockClear();
    system();
    expect(callback).not.toHaveBeenCalled();
  });

  test("systems can still query resources after disposal", () => {
    // The `.resources` object is just another container
    // This test ensure that the `.resources` object is not removed
    // from the resources manager after a `.clear()`

    const callback = vi.fn();
    const testSystem = new System({ resources: [FrameInfo] }, callback);

    const world = new World();
    world.clear();

    world.resources.add(FrameInfo);
    const system = world.addSystem(testSystem);
    system();

    expect(callback).toHaveBeenCalledOnce();
  });
});

describe("System events", () => {
  class TestEvent extends Event {
    public value = 0;

    public constructor(value = 0) {
      super();

      this.value = value;
    }
  }

  it("emits events to systems", () => {
    const callback = vi.fn();
    const testSystem = new System({ events: TestEvent }, ({ events }) => {
      callback(events.map(({ value }) => value));
    });

    const world = new World();
    const system = world.addSystem(testSystem);

    world.emit(TestEvent, { value: 42 });
    world.emitNew(TestEvent, 144);

    system();

    expect(callback).toHaveBeenCalledWith([42, 144]);
  });

  it("can iterate over the same event queue multiple times", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const testSystem = new System(
      { testEvents: TestEvent },
      ({ testEvents }) => {
        callback1(testEvents.map(({ value }) => value));
        callback2(testEvents.map(({ value }) => value));
      }
    );

    const world = new World();
    const system = world.addSystem(testSystem);

    world.emit(TestEvent, { value: 42 });
    world.emitNew(TestEvent, 144);

    system();

    expect(callback1).toHaveBeenCalledWith([42, 144]);
    expect(callback2).toHaveBeenCalledWith([42, 144]);
  });

  it("can retrieve multiple event queues", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const testSystem = new System(
      { testEvents1: TestEvent, testEvents2: TestEvent },
      ({ testEvents1, testEvents2 }) => {
        callback1(testEvents1.map(({ value }) => value));
        callback2(testEvents2.map(({ value }) => value));
      }
    );

    const world = new World();
    const system = world.addSystem(testSystem);

    world.emit(TestEvent, { value: 42 });
    world.emitNew(TestEvent, 144);

    system();

    expect(callback1).toHaveBeenCalledWith([42, 144]);
    expect(callback2).toHaveBeenCalledWith([42, 144]);
  });

  it("only emits events to systems that listen to them", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const testSystem1 = new System({ events: TestEvent }, ({ events }) => {
      callback1(events.map(({ value }) => value));
    });
    const testSystem2 = new System({ events: TestEvent }, ({ events }) => {
      callback2(events.map(({ value }) => value));
    });

    const world = new World();

    world.emit(TestEvent, { value: 42 });

    const system1 = world.addSystem(testSystem1);

    world.emit(TestEvent, { value: 144 });

    const system2 = world.addSystem(testSystem2);

    world.emit(TestEvent, { value: 256 });

    system1();
    system2();

    expect(callback1).toHaveBeenCalledWith([144, 256]);
    expect(callback2).toHaveBeenCalledWith([256]);
  });

  it("resets events between calls", () => {
    const callback = vi.fn();
    const testSystem = new System({ events: TestEvent }, ({ events }) => {
      callback(events.map(({ value }) => value));
    });

    const world = new World();
    const system = world.addSystem(testSystem);

    world.emit(TestEvent, { value: 42 });
    system();
    expect(callback).toHaveBeenCalledWith([42]);

    world.emit(TestEvent, { value: 144 });

    callback.mockClear();
    system();

    expect(callback).toHaveBeenCalledWith([144]);
  });

  it("doesn't affect other systems when resetting events", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const testSystem1 = new System({ events: TestEvent }, ({ events }) => {
      callback1(events.map(({ value }) => value));
    });
    const testSystem2 = new System({ events: TestEvent }, ({ events }) => {
      callback2(events.map(({ value }) => value));
    });

    const world = new World();
    const system1 = world.addSystem(testSystem1);
    const system2 = world.addSystem(testSystem2);

    world.emit(TestEvent, { value: 42 });
    system1();

    world.emit(TestEvent, { value: 144 });
    system1();
    system2();

    expect(callback1).toHaveBeenLastCalledWith([144]);
    expect(callback2).toHaveBeenCalledWith([42, 144]);
  });

  it("does not call a system if it has no event", () => {
    const callback = vi.fn();
    const testSystem = new System({ events: TestEvent }, callback);

    const world = new World();
    const system = world.addSystem(testSystem);

    system();

    expect(callback).not.toHaveBeenCalled();
  });

  it("removes garbage collected event queues", () => {
    const testSystem = new System({ events: TestEvent }, vi.fn());
    const world = new World();
    world.addSystem(testSystem);

    // @ts-expect-error - We need to access the private property
    const queueSet = world.eventQueues.get(TestEvent);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const eventQueue = [...queueSet][0]!;
    vi.spyOn(eventQueue, "deref").mockReturnValue(undefined);

    expect(queueSet.size).toBe(1);

    world.emit(TestEvent, { value: 42 });

    expect(queueSet.size).toBe(0);
  });
});

describe("System command shortcuts", () => {
  it("spawns entities and adds components to them", () => {
    const testSystem = new System({}, ({ command }) => {
      command.spawn().add(Position);
    });

    const world = new World();
    const system = world.addSystem(testSystem);
    const query = world.query(Position.present());

    system();

    expect([...query]).toHaveLength(1);
  });

  it("spawns entities and intanciates components to them", () => {
    const testSystem = new System({}, ({ command }) => {
      command.spawn().addNew(Position);
    });

    const world = new World();
    const system = world.addSystem(testSystem);
    const query = world.query(Position.present());

    system();

    expect([...query]).toHaveLength(1);
  });

  it("spaws entities and adds bundles to them", () => {
    const bundle = (entity: Entity): void => {
      entity.add(Position);
    };

    const testSystem = new System({}, ({ command }) => {
      command.spawn().addBundle(bundle);
    });

    const world = new World();
    const system = world.addSystem(testSystem);
    const query = world.query(Position.present());

    system();

    expect([...query]).toHaveLength(1);
  });

  it("removes entities", () => {
    const testSystem = new System(
      { entities: [Position.present()] },
      ({ entities, command }) => {
        for (const entity of entities) {
          command.remove(entity);
        }
      }
    );

    const world = new World();
    const system = world.addSystem(testSystem);
    const query = world.query(Position.present());

    world.spawn().add(Position);

    system();

    expect([...query]).toHaveLength(0);
  });

  it("adds new resources", () => {
    const testSystem = new System({}, ({ command }) => {
      command.addResource(FrameInfo);
    });

    const world = new World();
    const system = world.addSystem(testSystem);

    expect(world.resources.has(FrameInfo)).toBe(false);

    system();

    expect(world.resources.has(FrameInfo)).toBe(true);
  });

  it("instantiates new resources", () => {
    const testSystem = new System({}, ({ command }) => {
      command.addNewResource(FrameInfo);
    });

    const world = new World();
    const system = world.addSystem(testSystem);

    expect(world.resources.has(FrameInfo)).toBe(false);

    system();

    expect(world.resources.has(FrameInfo)).toBe(true);
  });

  it("removes resources", () => {
    const testSystem = new System({}, ({ command }) => {
      command.removeResource(FrameInfo);
    });

    const world = new World();
    const system = world.addSystem(testSystem);

    world.resources.add(FrameInfo);

    expect(world.resources.has(FrameInfo)).toBe(true);

    system();

    expect(world.resources.has(FrameInfo)).toBe(false);
  });

  it("emits events", () => {
    class TestEvent extends Event {}

    const callback = vi.fn();
    const testSystemReceiver = new System({ events: TestEvent }, callback);
    const testSystemEmitter = new System({}, ({ command }) => {
      command.emit(TestEvent);
    });

    const world = new World();
    const systemReceiver = world.addSystem(testSystemReceiver);
    const systemEmitter = world.addSystem(testSystemEmitter);

    systemReceiver();
    expect(callback).not.toHaveBeenCalled();

    systemEmitter();

    systemReceiver();
    expect(callback).toHaveBeenCalled();
  });

  it("intantiates new events", () => {
    class TestEvent extends Event {}

    const callback = vi.fn();
    const testSystemReceiver = new System({ events: TestEvent }, callback);
    const testSystemEmitter = new System({}, ({ command }) => {
      command.emitNew(TestEvent);
    });

    const world = new World();
    const systemReceiver = world.addSystem(testSystemReceiver);
    const systemEmitter = world.addSystem(testSystemEmitter);

    systemReceiver();
    expect(callback).not.toHaveBeenCalled();

    systemEmitter();

    systemReceiver();
    expect(callback).toHaveBeenCalled();
  });
});
