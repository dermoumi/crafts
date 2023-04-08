import * as Ecs from "@crafts/ecs";
import { System, SystemSet, createSystemGroup } from "./system";

describe("Systems", () => {
  it("sets a label", () => {
    const testSystem = new System({}, vi.fn());
    testSystem.setLabel("test");

    expect(testSystem.label).toEqual("test");
  });

  it("adds dependencies", () => {
    const testSystem = new System({}, vi.fn());
    testSystem.runAfter("test", "dependency");

    expect([...testSystem.after]).toEqual(["test", "dependency"]);
  });

  it("appends to existing dependencies", () => {
    const testSystem = new System({}, vi.fn()).runAfter("test", "dependency");
    testSystem.runAfter("dependency2");

    expect([...testSystem.after]).toEqual([
      "test",
      "dependency",
      "dependency2",
    ]);
  });

  it("adds reverse depenedencies", () => {
    const testSystem = new System({}, vi.fn());
    testSystem.runBefore("test", "dependency");

    expect([...testSystem.before]).toEqual(["test", "dependency"]);
  });

  it("appends to existing reverse dependencies", () => {
    const testSystem = new System({}, vi.fn()).runBefore("test", "dependency");
    testSystem.runBefore("dependency2");

    expect([...testSystem.before]).toEqual([
      "test",
      "dependency",
      "dependency2",
    ]);
  });

  it("clones systems", () => {
    const testSystem = new System({}, vi.fn())
      .setLabel("test")
      .runAfter("dependency");

    const clonedSystem = testSystem.clone();

    expect(clonedSystem.queries).toEqual(testSystem.queries);
    expect(clonedSystem.callback).toEqual(testSystem.callback);
    expect(clonedSystem.label).toEqual("test");
    expect([...clonedSystem.after]).toEqual(["dependency"]);
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
    const handle = systemSet.getHandle(world);

    handle();

    expect(callback).toHaveBeenCalledOnce();
  });

  it("adds other system sets", () => {
    const world = new Ecs.World();
    const subSystemSet = new SystemSet().add(testSystemB).add(testSystemC);
    const systemSet = new SystemSet().add(testSystemA).add(subSystemSet);
    const handle = systemSet.getHandle(world);

    handle();

    expect(orderArray).toEqual(["A", "B", "C"]);
  });

  it("fails when adding a non-supported system-like object", () => {
    class TestClass {
      public label = "test";
      public after = new Set<string>();
      public before = new Set<string>();

      public setLabel(label: string) {
        this.label = label;
        return this;
      }

      public runAfter() {
        return this;
      }

      public runBefore() {
        return this;
      }

      public clone() {
        return new TestClass();
      }
    }

    const world = new Ecs.World();
    const systemSet = new SystemSet().add(new TestClass());
    const handle = systemSet.getHandle(world);

    expect(() => {
      handle();
    }).toThrow("Unsupported system-like object");
  });

  it("clones correctly", () => {
    const world = new Ecs.World();
    const systemSet = new SystemSet().add(testSystemA);
    const clone = systemSet.clone();
    const handle = clone.getHandle(world);

    handle();

    expect(orderArray).toEqual(["A"]);
  });

  it("runs systems in the order they were added", () => {
    const world = new Ecs.World();
    const systemGroup = createSystemGroup(world)
      .add(testSystemA)
      .add(testSystemB)
      .add(testSystemC);

    systemGroup();
    expect(orderArray).toEqual(["A", "B", "C"]);
  });

  it("reorders systems such as one runs after the other", () => {
    const world = new Ecs.World();
    const systemGroup = createSystemGroup(world)
      .add(testSystemA.clone().runAfter(testSystemC))
      .add(testSystemB)
      .add(testSystemC);

    systemGroup();

    expect(orderArray).toEqual(["B", "C", "A"]);
  });

  it("reorders systems such as one runs before the other", () => {
    const world = new Ecs.World();
    const systemGroup = createSystemGroup(world)
      .add(testSystemA)
      .add(testSystemB)
      .add(testSystemC.clone().runBefore(testSystemA));

    systemGroup();

    expect(orderArray).toEqual(["B", "C", "A"]);
  });

  it("throws an error when a runAfter system is not found", () => {
    const world = new Ecs.World();
    const systemGroup = createSystemGroup(world).add(
      testSystemA.clone().setLabel("A").runAfter("missingSystem")
    );

    expect(() => systemGroup()).toThrowError(
      "The following systems have missing dependencies:\n" +
        ' - "A" needs: missingSystem'
    );
  });

  it("caches results when reordering handles", () => {
    const world = new Ecs.World();
    const systemGroup = createSystemGroup(world);

    const testSystem = testSystemA.clone();
    const mockAfterAccess = vi
      .spyOn(testSystem, "after", "get")
      .mockReturnValue(new Set());

    systemGroup();
    expect(mockAfterAccess).not.toHaveBeenCalled();

    systemGroup.add(testSystem);
    expect(mockAfterAccess).not.toHaveBeenCalled();

    systemGroup();
    expect(mockAfterAccess).toHaveBeenCalled();

    mockAfterAccess.mockClear();
    systemGroup();
    expect(mockAfterAccess).not.toHaveBeenCalled();
  });
});
