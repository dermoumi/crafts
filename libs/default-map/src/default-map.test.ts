import { DefaultMap, ArrayMap, MapMap, SetMap } from "./default-map";

describe("DefaultMap utility", () => {
  it("provides a default value for missing keys", () => {
    const map = new DefaultMap(() => 0);
    expect(map.get("foo")).toBe(0);
  });

  it("passes a key to the factory function", () => {
    const map = new DefaultMap((key: string) => key.length);

    expect(map.get("foo")).toBe(3);
    expect(map.get("foobar")).toBe(6);
  });

  it("retrieves existing values", () => {
    const map = new DefaultMap((): number[] => []);
    expect(map.get("foo")).toEqual([]);

    map.get("foo").push(1);
    expect(map.get("foo")).toEqual([1]);
  });

  it("initializes from initial iterable", () => {
    const map = new DefaultMap(
      () => 0,
      [
        ["foo", 42],
        ["bar", 144],
      ]
    );

    expect(map.get("foo")).toEqual(42);
  });

  it("keeps `undefined` values if set explicitly", () => {
    const map = new DefaultMap<string, number | undefined>(() => 0);

    map.set("foo", undefined);
    expect(map.get("foo")).toBeUndefined();
  });
});

describe("ArrayMap utility", () => {
  it("provides a default empty array for missing keys", () => {
    const map = new ArrayMap();
    expect(map.get("foo")).toEqual([]);
  });
});

describe("MapMap utility", () => {
  it("provides a default empty map for missing keys", () => {
    const map = new MapMap();
    expect(map.get("foo")).toEqual(new Map());
  });
});

describe("SetMap utility", () => {
  it("provides a default empty set for missing keys", () => {
    const map = new SetMap();
    expect(map.get("foo")).toEqual(new Set());
  });
});
