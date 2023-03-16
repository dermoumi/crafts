import type { QueryBuilder } from "./query";

import Component from "./component";
import Manager from "./manager";
import Entity from "./entity";

class Position extends Component {
  public x = 0;
  public y = 0;
}

class Velocity extends Component {
  public x = 0;
  public y = 0;
}

// Utility to get a query reference from the index.
function getQueryRef<Q extends QueryBuilder<Component, Entity>>(
  query: Q,
  indexSet?: Set<WeakRef<Q>>
): WeakRef<Q> | undefined {
  if (indexSet === undefined) {
    return undefined;
  }

  for (const queryRef of indexSet) {
    if (queryRef.deref() === query) {
      return queryRef;
    }
  }

  return undefined;
}

describe("QueryManager", () => {
  it("creates a new query and adds it to the index", () => {
    const manager = new Manager<Component, Entity>();

    const query = manager.createQuery(Position);

    // Can't expose index as public because api-extractor breaks with WeakRef
    // @ts-expect-error - Accessing private property
    const positionIndex = manager.index.get(Position);
    expect(positionIndex).toBeDefined();
    expect(positionIndex?.size).toBe(1);

    const queryRef = getQueryRef(query, positionIndex);
    expect(queryRef).toBeDefined();
  });

  it("removes the queries from indexes when they's reclaimed by GC", () => {
    // Create a pool and a query manager
    const manager = new Manager<Component, Entity>();

    // Create a couple of queries
    const queryA = manager.createQuery(Position);
    const queryB = manager.createQuery(Position, Velocity);

    // By now we should have a position index
    // Can't expose index as public because api-extractor breaks with WeakRef
    // @ts-expect-error - Accessing private property
    const positionIndex = manager.index.get(Position);
    expect(positionIndex).toBeDefined();

    // Simulate queryA being reclaimed by GC
    // by making deref() return undefined when requested
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const queryAWeakRef = getQueryRef(queryA, positionIndex)!;
    vi.spyOn(queryAWeakRef, "deref").mockReturnValue(undefined);

    // Mimic world.spawn()
    const entity = new Entity("a", manager);
    manager.containers.set(entity.id, entity);
    manager.onTraitAdded(entity, Position);

    // The queryA should be removed from the index
    expect(positionIndex?.size).toBe(1);
    expect(getQueryRef(queryA, positionIndex)).toBeUndefined();
    expect(getQueryRef(queryB, positionIndex)).toBeDefined();
  });
});
