import * as Ecs from "@crafts/ecs";
import { System, createSystemGroup } from "./system";

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

describe("System ordering", () => {
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

  it("runs systems in the order they were added", () => {
    const world = new Ecs.World();
    const systemGroup = createSystemGroup(world)
      .add(testSystemA)
      .add(testSystemB)
      .add(testSystemC);

    systemGroup();
    expect(orderArray).toEqual(["A", "B", "C"]);
  });

  it("reorders systems as necessary", () => {
    const world = new Ecs.World();
    const systemGroup = createSystemGroup(world)
      .add(testSystemA.clone().runAfter(testSystemC))
      .add(testSystemB)
      .add(testSystemC);

    systemGroup();

    expect(orderArray).toEqual(["B", "C", "A"]);
  });

  it("throws an error when a runAfter system is not found", () => {
    const world = new Ecs.World();
    const systemGroup = createSystemGroup(world).add(
      testSystemA.clone().setLabel("A").runAfter("missingSystem")
    );

    expect(() => systemGroup()).toThrowError(
      'The following systems have missing dependencies:\n - "A" needs: missingSystem'
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
