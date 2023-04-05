import type Component from "./component";
import type Container from "./container";
import type Entity from "./entity";
import type { FilterSet, TraitFilter, TraitInstances } from "./filter";
import type { Trait, TraitConstructor } from "./trait";

import Filter, {
  AbsentFilter,
  AllFilter,
  ChangeTrackMap,
  PresentFilter,
} from "./filter";
import { Optional } from "./trait";

/**
 * Extracts only the trait constructors from a query filter tuple
 *
 * @internal
 * @typeParam T - Lock to a single type of traits (Component, Resource...)
 * @typeParam F - The Filter tuple to match against
 */
export type TraitConstructorTuple<
  T extends Trait,
  F extends FilterSet<T>
> = F extends []
  ? []
  : F extends [infer C, ...infer R extends Array<TraitFilter<T>>]
  ? C extends TraitConstructor<T>
    ? [C, ...TraitConstructorTuple<T, R>]
    : C extends Optional<T>
    ? [C, ...TraitConstructorTuple<T, R>]
    : TraitConstructorTuple<T, R>
  : never;

/**
 * A builder that maintains and updates a query set.
 *
 * @internal
 * @typeParam T - The type of the trait (Component, Resource...)
 * @typeParam C - The type of the container (Entity, Resource container...)
 * @typeParam F - The filter tuple to match against
 */
export class QueryBuilder<
  T extends Trait,
  C extends Container<T> = Container<T>,
  F extends FilterSet<T> = any
> {
  /**
   * @internal
   */
  private readonly filter: Filter<T>;

  /**
   * @internal
   */
  private readonly absenceFilters = new Set<TraitConstructor<T>>();

  /**
   * @internal
   */
  private readonly trackingTraits = new Set<TraitConstructor<T>>();

  /**
   * @internal
   */
  private readonly changeTrackMap = new ChangeTrackMap<T>();

  /**
   * The containers that are currently matched by this query
   *
   * @internal
   */
  public readonly containers = new Set<C>();

  /**
   * The traits that are requested by this query
   *
   * @internal
   */
  public readonly requestedTraits: TraitConstructorTuple<T, F>;

  /**
   * @param filters - Filters to use for the query
   * @param sourceContainers - Iterator over containers
   */
  public constructor(filters: F, sourceContainers: IterableIterator<C>) {
    const requestedTraits: Array<TraitConstructor<T> | Optional<T>> = [];
    const relatedTraits = new Set<TraitConstructor<T>>();

    const filterObjs = filters.flatMap((filter) => {
      if (filter instanceof Optional) {
        requestedTraits.push(filter);
        return [];
      }

      if (!(filter instanceof Filter)) {
        requestedTraits.push(filter);
        relatedTraits.add(filter);
        return [new PresentFilter(filter)];
      }

      if (filter instanceof AbsentFilter) {
        for (const trait of filter.relatedTraits) {
          this.absenceFilters.add(trait);
        }
      }

      // Some filters track changes (AddedFilter, ChangedFilter...)
      // Setting this will allow some optimizations down the line
      for (const trait of filter.getTrackingTraits()) {
        this.trackingTraits.add(trait);
      }

      return [filter];
    });

    this.filter = AllFilter.wrapIfMany(...filterObjs);
    this.requestedTraits = requestedTraits as TraitConstructorTuple<T, F>;

    // Update the query with all existing containers
    for (const container of sourceContainers) {
      this.updateWith(container, true);
    }
  }

  /**
   * Handles the addition of a trait to a container.
   *
   * @internal
   * @param container - The container that changed
   * @param trait - The trait that was added
   */
  public onTraitAdded(container: C, trait: TraitConstructor<T>): void {
    const { trackingTraits, changeTrackMap } = this;

    if (trackingTraits.has(trait)) {
      // If it's in the removed set, remove it and add it to the changed set
      if (changeTrackMap.get("removed").get(container).delete(trait)) {
        changeTrackMap.get("changed").get(container).add(trait);
      } else {
        changeTrackMap.get("added").get(container).add(trait);
      }
    }

    this.updateWith(container);
  }

  /**
   * Handles the removal of a trait from a container.
   *
   * @internal
   * @param container - The container that changed
   * @param trait - The trait that was removed
   */
  public onTraitRemoved(container: C, trait: TraitConstructor<T>): void {
    if (this.trackingTraits.has(trait)) {
      this.changeTrackMap.get("removed").get(container).add(trait);
    }

    this.updateWith(container);
  }

  /**
   * Handles the change of a trait on a container.
   *
   * @internal
   * @param container - The container that changed
   * @param trait - The trait that was changed
   */
  public onTraitChanged(container: C, trait: TraitConstructor<T>): void {
    if (this.trackingTraits.has(trait)) {
      this.changeTrackMap.get("changed").get(container).add(trait);
      this.updateWith(container);
    }
  }

  /**
   * Handles addition of a container.
   *
   * @internal
   * @param container - The container that was removed
   */
  public onContainerAdded(container: C): void {
    // Only needed when the query is tracking the absence of a trait
    if (this.absenceFilters.size === 0) return;

    this.updateWith(container);
  }

  /**
   * Handles removal of a container.
   *
   * @internal
   * @param container - The container that was removed
   */
  public onContainerRemoved(container: C): void {
    this.containers.delete(container);
  }

  /**
   * Resets the query.
   * If the query does not track changes, this method does nothing.
   *
   * @internal
   */
  public reset(): void {
    if (this.trackingTraits.size > 0) {
      this.containers.clear();
      this.changeTrackMap.clear();
    }
  }

  /**
   * Get the traits that are related to this query
   *
   * @internal
   */
  public getRelatedTraits(): Iterable<TraitConstructor<T>> {
    return this.filter.relatedTraits;
  }

  /**
   * Get the trait instances of a given container.
   *
   * @internal
   * @param container - The container to get the trait instances of
   * @returns The trait instances
   */
  public getTraitInstances(container: C): TraitInstances<T, F> {
    return this.requestedTraits.map(
      (trait: TraitConstructor<T> | Optional<T>) =>
        trait instanceof Optional
          ? container.tryGet(trait.trait)
          : container.get(trait)
    ) as TraitInstances<T, F>;
  }

  /**
   * Extracts the first result from the query.
   * This is used to extract the current resources if any.
   *
   * @internal
   */
  public getResources(): TraitInstances<T, F> | undefined {
    return this.containers.size > 0
      ? this.getTraitInstances(this.containers.values().next().value)
      : undefined;
  }

  /**
   * Clears the query results.
   *
   * @internal
   */
  public clear(): void {
    this.containers.clear();
  }

  /**
   * Update the query with the given container.
   *
   * @param container - The container to update with
   * @param initial - Whether this is the initial update
   */
  private updateWith(container: C, initial = false): void {
    const { filter, containers, changeTrackMap } = this;

    // Check if the container matches the query
    const matches = filter.matches(container, changeTrackMap, initial);

    // Add or remove the container from the query
    if (matches) {
      containers.add(container);
    } else {
      containers.delete(container);
    }
  }
}

/**
 * A wrapper that provides iterators over entities and components
 * of the results of a query.
 *
 * @typeParam F - The filter set to extract from
 */
export class Query<F extends FilterSet<Component>> {
  /**
   * @internal
   */
  protected query: QueryBuilder<Component, Entity, F>;

  /**
   * @internal
   * @param query - The query to wrap
   */
  public constructor(query: QueryBuilder<Component, Entity, F>) {
    this.query = query;
  }

  /**
   * Get the components of the query's entities.
   */
  public *[Symbol.iterator](): IterableIterator<Entity> {
    yield* this.query.containers;
  }

  /**
   * Get the components of the query's entities.
   *
   * @returns An array of tuples of the components requested for this query,
   * for each entity matching the query.
   */
  public *asComponents(): IterableIterator<TraitInstances<Component, F>> {
    for (const entity of this.query.containers) {
      yield this.query.getTraitInstances(entity);
    }
  }

  /**
   * Get the entities AND the components of the query's entities.
   *
   * @returns An array of tuples, where the first element is the entity and the
   * rest are the components requested for each entity matching the query.
   */
  public *withComponents(): IterableIterator<
    [Entity, ...TraitInstances<Component, F>]
  > {
    for (const entity of this.query.containers) {
      yield [entity, ...this.query.getTraitInstances(entity)];
    }
  }

  /**
   * Get a single entity from the query.
   *
   * @throws If the query has no entities
   * @returns The first entity in the query
   */
  public getOne(): Entity {
    const { containers } = this.query;

    if (containers.size === 0) {
      throw new Error("Query has no entities");
    } else if (containers.size > 1) {
      console.warn("Query has more than one entity");
    }

    return containers.values().next().value;
  }

  /**
   * Get a single entity from the query as a component tuple.
   *
   * @throws If the query has no entities
   * @returns A tuple containing the components requested for the first entity
   */
  public getOneAsComponents(): TraitInstances<Component, F> {
    const entity = this.getOne();
    return this.query.getTraitInstances(entity);
  }

  /**
   * Get a single entity from the query along with its components an a tuple.
   *
   * @throws If the query has no entities
   */
  public getOneWithComponents(): [Entity, ...TraitInstances<Component, F>] {
    const entity = this.getOne();
    return [entity, ...this.query.getTraitInstances(entity)];
  }

  /**
   * Check if a given entity is in the query.
   *
   * @param entity - The entity to check for
   * @returns `true` if the entity is in the query
   */
  public has(entity: Entity): boolean {
    return this.query.containers.has(entity);
  }

  /**
   * Get the number of entities in the query.
   */
  public get size(): number {
    return this.query.containers.size;
  }
}

/**
 * A queryset that allows resetting the underlying query result.
 *
 * @typeParam F - The filter set to extract from
 */
export class ResettableQuery<F extends FilterSet<Component>> extends Query<F> {
  /**
   * Reset the query's tracked entities.
   */
  public reset(): void {
    this.query.reset();
  }
}
