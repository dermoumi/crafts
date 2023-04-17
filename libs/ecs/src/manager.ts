import type { Container } from "./container";
import type { FilterSet } from "./filter";
import type { Trait, TraitConstructor } from "./trait";

import { SetMap } from "@crafts/default-map";
import { QueryBuilder } from "./query";

/**
 * A manager that maintains containers and indexes queries.
 *
 * @internal
 * @typeParam T - The type of the trait (Component, Resource...)
 */
export class Manager<T extends Trait, C extends Container<T> = Container<T>> {
  /**
   * @internal
   */
  private readonly queries = new Set<WeakRef<QueryBuilder<T, C>>>();

  /**
   * @internal
   */
  public readonly containers = new Map<string, C>();

  /**
   * @internal
   */
  private readonly index = new SetMap<
    TraitConstructor<T>,
    WeakRef<QueryBuilder<T, C>>
  >();

  /**
   * Create a new query.
   *
   * @internal
   * @param filter - The trait filters to use for the query
   * @returns The new query
   */
  public createQuery<F extends FilterSet<T>>(
    ...filter: F
  ): QueryBuilder<T, C, F> {
    const query = new QueryBuilder<T, C, F>(filter, this.containers.values());

    // The weak ref will allow the query to be garbage collected
    // when it's not longer referenced by the user
    const queryRef = new WeakRef(query);

    this.queries.add(queryRef);
    for (const trait of query.getRelatedTraits()) {
      this.index.get(trait).add(queryRef);
    }

    return query;
  }

  /**
   * Notifies the related queries that the trait has been added to the
   * given container.
   *
   * @internal
   * @param container - The container that changed
   * @param trait - The trait that was added
   */
  public onTraitAdded(container: C, trait: TraitConstructor<T>): void {
    for (const query of this.getRefSet(trait)) {
      query.onTraitAdded(container, trait);
    }
  }

  /**
   * Notifies the related queries that the trait has been removed from the
   * given container.
   *
   * @internal
   * @param container - The container that has changed
   * @param trait - The trait that was removed
   */
  public onTraitRemoved(container: C, trait: TraitConstructor<T>): void {
    for (const query of this.getRefSet(trait)) {
      query.onTraitRemoved(container, trait);
    }
  }

  /**
   * Notifies the related queries that the trait has been changed on the
   * given container.
   *
   * @internal
   * @param container - The container that has changed
   * @param trait - The trait that has changed
   */
  public onTraitChanged(container: C, trait: TraitConstructor<T>): void {
    for (const query of this.getRefSet(trait)) {
      query.onTraitChanged(container, trait);
    }
  }

  /**
   * Notifies the queries that a container has been added.
   *
   * @internal
   * @param container - The container that has been added
   */
  public onContainerAdded(container: C): void {
    for (const query of this.cleanRefSet(this.queries)) {
      query.onContainerAdded(container);
    }
  }

  /**
   * Notifies the queries that a container has been removed.
   *
   * @internal
   * @param container - The container that has been removed
   */
  public onContainerRemoved(container: C): void {
    for (const query of this.cleanRefSet(this.queries)) {
      query.onContainerRemoved(container);
    }

    container.clear();
    (container as any).manager = undefined;
  }

  /**
   * Removes all containers and queries.
   */
  public clear(keepContainers = false): void {
    // Dispose of the containers' traits
    for (const container of this.containers.values()) {
      container.clear();
    }

    // Clear existing queries
    for (const query of this.cleanRefSet(this.queries)) {
      query.clear();
    }

    this.index.clear();
    this.queries.clear();

    if (!keepContainers) {
      this.containers.clear();
    }
  }

  /**
   * Loops over only queries of the given trait that were not garbage collected.
   *
   * @internal
   * @param trait - The trait to get the queries for
   * @returns An iterable of the queries that are not garbage collected yet
   */
  private *getRefSet(
    trait: TraitConstructor<T>
  ): IterableIterator<QueryBuilder<T, C>> {
    if (!this.index.has(trait)) return;

    const refSet = this.index.get(trait);

    yield* this.cleanRefSet(refSet);
  }

  /**
   * Loops over only queries of the given trait that were not garbage collected.
   *
   * @internal
   * @param refSet - The set of query weak refs to clean
   * @returns An iterable of the queries that are not garbage collected yet
   */
  private *cleanRefSet(
    refSet: Set<WeakRef<QueryBuilder<T, C>>>
  ): IterableIterator<QueryBuilder<T, C>> {
    for (const ref of refSet) {
      const query = ref.deref();

      if (query === undefined) {
        refSet.delete(ref);
      } else {
        yield query;
      }
    }
  }
}
