import * as Ecs from "@crafts/ecs";
import { Scheduler, System, SystemSet } from "./system";

describe("Systems", () => {
  it("sets a label", () => {
    const testSystem = new System({}, vi.fn());
    testSystem.label("test");

    expect(testSystem._label).toEqual("test");
  });

  it("adds dependencies", () => {
    const testSystem = new System({}, vi.fn());
    testSystem.after("test", "dependency");

    expect([...testSystem._after]).toEqual(["test", "dependency"]);
  });

  it("appends to existing dependencies", () => {
    const testSystem = new System({}, vi.fn()).after("test", "dependency");
    testSystem.after("dependency2");

    expect([...testSystem._after]).toEqual([
      "test",
      "dependency",
      "dependency2",
    ]);
  });

  it("adds reverse depenedencies", () => {
    const testSystem = new System({}, vi.fn());
    testSystem.before("test", "dependency");

    expect([...testSystem._before]).toEqual(["test", "dependency"]);
  });

  it("appends to existing reverse dependencies", () => {
    const testSystem = new System({}, vi.fn()).before("test", "dependency");
    testSystem.before("dependency2");

    expect([...testSystem._before]).toEqual([
      "test",
      "dependency",
      "dependency2",
    ]);
  });

  it("clones systems", () => {
    const testSystem = new System({}, vi.fn())
      .label("testSystem")
      .after("B")
      .before("C");

    const clonedSystem = testSystem.clone();

    expect(clonedSystem.queries).toEqual(testSystem.queries);
    expect(clonedSystem.callback).toEqual(testSystem.callback);
    expect(clonedSystem._label).toEqual("testSystem");
    expect([...clonedSystem._after]).toEqual(["B"]);
    expect([...clonedSystem._before]).toEqual(["C"]);
  });

  it("runs the systems if the condition callback resolves to true", () => {
    const callback = vi.fn();
    const world = new Ecs.World();
    const testSystem = new System({}, callback)
      .runIf(() => true)
      .makeHandle(world);

    testSystem();

    expect(callback).toHaveBeenCalledOnce();
  });

  it("does not run the systems if the condition callback resolves to false", () => {
    const callback = vi.fn();
    const world = new Ecs.World();
    const testSystem = new System({}, callback)
      .runIf(() => false)
      .makeHandle(world);

    testSystem();

    expect(callback).not.toHaveBeenCalled();
  });

  it("resets systems even if they didn't run due to a run condition", () => {
    class TestComponent extends Ecs.Component {}

    let trigger = false;
    const callback = vi.fn();
    const world = new Ecs.World();
    const testSystem = new System({ query: [TestComponent.added()] }, callback)
      .runIf(() => trigger)
      .makeHandle(world);

    world.spawn().add(TestComponent);
    testSystem();
    expect(callback).not.toHaveBeenCalled();

    trigger = true;
    testSystem();
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("System sets", () => {
  const orderArray: string[] = [];

  beforeEach(() => {
    orderArray.length = 0;
  });

  const testSystemA = new System({}, () => {
    orderArray.push("A");
  });

  const testSystemB = new System({}, () => {
    orderArray.push("B");
  });

  const testSystemC = new System({}, () => {
    orderArray.push("C");
  });

  it("adds systems", () => {
    const callback = vi.fn();
    const testSystem = new System({}, callback);

    const world = new Ecs.World();
    const systemSet = new SystemSet().add(testSystem);
    const handle = systemSet.makeHandle(world);

    handle();

    expect(callback).toHaveBeenCalledOnce();
  });

  it("adds other system sets", () => {
    const world = new Ecs.World();
    const subSystemSet = new SystemSet().add(testSystemB).add(testSystemC);
    const systemSet = new SystemSet().add(testSystemA).add(subSystemSet);
    const handle = systemSet.makeHandle(world);

    handle();

    expect(orderArray).toEqual(["A", "B", "C"]);
  });

  it("clones correctly", () => {
    const world = new Ecs.World();
    const systemSet = new SystemSet()
      .add(testSystemA)
      .label("testSystemSet")
      .after("B")
      .before("C");
    const clone = systemSet.clone();
    const handle = clone.makeHandle(world);

    handle();

    expect(orderArray).toEqual(["A"]);
    expect(clone._label).toEqual("testSystemSet");
    expect([...clone._after]).toEqual(["B"]);
    expect([...clone._before]).toEqual(["C"]);
  });

  it("runs systems in the order they were added", () => {
    const world = new Ecs.World();
    const systemSet = new SystemSet()
      .add(testSystemA)
      .add(testSystemB)
      .add(testSystemC)
      .makeHandle(world);

    systemSet();
    expect(orderArray).toEqual(["A", "B", "C"]);
  });

  it("reorders systems such as one runs after the other", () => {
    const world = new Ecs.World();
    const systemSet = new SystemSet()
      .add(testSystemA.clone().after(testSystemC))
      .add(testSystemB)
      .add(testSystemC)
      .makeHandle(world);

    systemSet();

    expect(orderArray).toEqual(["B", "C", "A"]);
  });

  it("reorders systems such as one runs before the other", () => {
    const world = new Ecs.World();
    const systemSet = new SystemSet()
      .add(testSystemA)
      .add(testSystemB)
      .add(testSystemC.clone().before(testSystemA))
      .makeHandle(world);

    systemSet();

    expect(orderArray).toEqual(["B", "C", "A"]);
  });

  it("reorders systems based on priority", () => {
    const world = new Ecs.World();
    const systemSet = new SystemSet()
      .add(testSystemA.clone().after(testSystemB))
      .add(testSystemB)
      .add(testSystemC.clone().priority(2))
      .makeHandle(world);

    systemSet();

    expect(orderArray).toEqual(["C", "B", "A"]);
  });

  it("throws an error when a .after() system is not found", () => {
    const world = new Ecs.World();
    const systemSet = new SystemSet()
      .add(testSystemA.clone().label("A").after("missingSystem"))
      .makeHandle(world);

    expect(() => systemSet()).toThrowError(
      "The following systems have missing dependencies:\n" +
        ' - "A" needs: missingSystem'
    );
  });

  it("caches results when reordering handles", () => {
    const world = new Ecs.World();
    const systemSet = new SystemSet();
    const handle = systemSet.makeHandle(world);

    const testSystem = testSystemA.clone();
    const mockAfterAccess = vi
      .spyOn(testSystem, "_after", "get")
      .mockReturnValue(new Set());

    handle();
    expect(mockAfterAccess).not.toHaveBeenCalled();

    systemSet.add(testSystem);
    expect(mockAfterAccess).not.toHaveBeenCalled();

    handle();
    expect(mockAfterAccess).toHaveBeenCalled();

    mockAfterAccess.mockClear();
    handle();
    expect(mockAfterAccess).not.toHaveBeenCalled();
  });

  it("keeps the same handles when adding new systems", () => {
    class TestComponent extends Ecs.Component {}

    const callback = vi.fn();
    const world = new Ecs.World();
    const testSystem = new System(
      { query: [TestComponent.removed()] },
      callback
    );
    const dummySystem = new System({}, vi.fn());
    const systemSet = new SystemSet().add(testSystem);
    const handle = systemSet.makeHandle(world);
    const entity = world.spawn().add(TestComponent);
    handle();

    callback.mockClear();
    entity.remove(TestComponent);

    handle();
    expect(callback).toHaveBeenCalledOnce();

    callback.mockClear();
    entity.add(TestComponent);
    handle();
    expect(callback).not.toHaveBeenCalled();

    callback.mockClear();
    entity.remove(TestComponent);
    systemSet.add(dummySystem);

    handle();
    expect(callback).toHaveBeenCalledOnce();
  });

  it("resets all underlying handles", () => {
    class TestComponent extends Ecs.Component {}

    const callback = vi.fn();
    const world = new Ecs.World();
    const system = new System({ query: [TestComponent.added()] }, callback);
    const systemHandle = world.addSystem(system);
    const systemSet = new SystemSet().add(system).makeHandle(world);

    world.spawn().add(TestComponent);

    callback.mockClear();
    systemHandle();
    expect(callback).toHaveBeenCalledOnce();

    callback.mockClear();
    systemSet.reset();
    systemSet();
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("System schedules", () => {
  it("adds systems", () => {
    const callback = vi.fn();
    const testSystem = new System({}, callback);

    const world = new Ecs.World();
    const schedule = new Scheduler();
    const handle = schedule.makeHandle(world);

    handle();
    expect(callback).not.toHaveBeenCalled();

    schedule.add(testSystem);
    handle();
    expect(callback).toHaveBeenCalledOnce();
  });
});

describe("Generic run conditions", () => {
  class TestResource extends Ecs.Resource {}
  class TestComponent extends Ecs.Component {}

  it("runs the system when the given resource exists", () => {
    const callback = vi.fn();
    const testSystem = new System({}, callback);

    const world = new Ecs.World();
    const handle = new SystemSet()
      .add(testSystem.runIf(System.resourcePresent(TestResource)))
      .makeHandle(world);

    handle();
    expect(callback).not.toHaveBeenCalled();

    world.resources.add(TestResource);
    handle();
    expect(callback).toHaveBeenCalledOnce();
  });

  it("runs the system when the resource filter matches", () => {
    const callback = vi.fn();
    const testSystem = new System({}, callback);

    const world = new Ecs.World();
    world.resources.add(TestResource);

    const handle = new SystemSet()
      .add(testSystem.runIf(System.resourceFilter(TestResource.removed())))
      .makeHandle(world);

    handle();
    expect(callback).not.toHaveBeenCalled();

    world.resources.remove(TestResource);
    handle();
    expect(callback).toHaveBeenCalledOnce();
  });

  it("runs the system when the component filter matches", () => {
    const callback = vi.fn();
    const testSystem = new System({}, callback);

    const world = new Ecs.World();
    const entity = world.spawn().add(TestComponent);

    const handle = new SystemSet()
      .add(testSystem.runIf(System.componentFilter(TestComponent.removed())))
      .makeHandle(world);

    handle();
    expect(callback).not.toHaveBeenCalled();

    entity.remove(TestComponent);
    handle();
    expect(callback).toHaveBeenCalledOnce();
  });
});
