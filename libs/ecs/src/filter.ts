import type Container from "./container";
import type { Optional, Trait, TraitConstructor } from "./trait";

import { DefaultMap, SetMap } from "@crafts/default-map";

/**
 * A default map to track different traits that change.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export class ChangeTrackMap<T extends Trait = any> extends DefaultMap<
  "added" | "changed" | "removed",
  SetMap<Container<T>, TraitConstructor<T>>
> {
  /**
   * @internal
   */
  public constructor() {
    super(() => new SetMap());
  }
}

/**
 * Common base for filters.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export default abstract class Filter<T extends Trait> {
  /**
   * Traits that this filter interacts with.
   */
  protected readonly internalRelatedTraits = new Set<TraitConstructor<T>>();

  /**
   * Check if the given container matches this filter.
   *
   * @param container - The container to match
   * @param tracked - The change tracker object of the query
   * @param initial - Whether this is run during the initial query population
   */
  public abstract matches(
    container: Container<T>,
    tracked: ChangeTrackMap,
    initial: boolean
  ): boolean;

  /**
   * Lists the traits that track changes.
   *
   * @virtual
   * @returns The traits that track changes
   */
  public *getTrackingTraits(): IterableIterator<TraitConstructor<T>> {
    // Nothing to do
  }

  /**
   * Makes a new filter that matches entities that match both this filter
   * and the given filters.
   *
   * @virtual
   * @param filters - The filters to combine with this one
   * @returns A new filter that matches if this filter
   * and all the given filters match
   */
  public and<N extends T>(...filters: Array<Filter<N>>): AllFilter<N> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new AllFilter(this as unknown as Filter<N>, ...filters);
  }

  /**
   * Make a new filter that matches entities that match either this filter
   * or the given filters.
   *
   * @virtual
   * @param filters - The filters to combine with this one
   * @returns A new filter that matches if either this filter
   * or all the given filters match
   */
  public or<N extends T>(...filters: Array<Filter<N>>): AnyFilter<N> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const filter = AllFilter.wrapIfMany(...filters);

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new AnyFilter(this as unknown as Filter<N>, filter);
  }

  /**
   * Access the related traits.
   * This is used internally to build query indexes.
   *
   * @returns A readonly set of related traits
   */
  public get relatedTraits(): ReadonlySet<TraitConstructor<T>> {
    return this.internalRelatedTraits;
  }
}

/**
 * Helper type to represent a tuple of N elements of a given type.
 *
 * @typeParam T - The type of the tuple elements
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type TupleOf<T> = ({} | [unknown]) & readonly T[];

/**
 * Defines a filter to be used in a query.
 *
 * @typeParam T - Lock to a single type of traits (Component, Resource...)
 */
export type TraitFilter<T extends Trait> =
  | TraitConstructor<T>
  | Filter<T>
  | Optional<T>;

/**
 * Defines a set of filters to be used in a query.
 *
 * @typeParam T - Lock to a single type of traits (Component, Resource...)
 */
export type FilterSet<T extends Trait> = TupleOf<TraitFilter<T>>;

/**
 * Helper type that extracts the Trait instances from a filter set.
 *
 * @typeParam T - The trait type to extract
 * @typeParam F - The filter set to extract from
 */
export type TraitInstances<
  T extends Trait,
  F extends FilterSet<any>
> = F extends []
  ? []
  : F extends [infer C, ...infer R extends ReadonlyArray<TraitFilter<any>>]
  ? C extends TraitConstructor<T>
    ? [InstanceType<C>, ...TraitInstances<T, R>]
    : C extends Optional<T>
    ? [InstanceType<C["trait"]> | undefined, ...TraitInstances<T, R>]
    : TraitInstances<T, R>
  : never;

/**
 * Common class for filters that work with a single trait.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export abstract class SingleFilter<T extends Trait> extends Filter<T> {
  /**
   * The trait that this filter interacts with.
   */
  protected readonly trait: TraitConstructor<T>;

  /**
   * @param trait - The trait that this filter interacts with
   */
  public constructor(trait: TraitConstructor<T>) {
    super();
    this.trait = trait;
    this.internalRelatedTraits.add(trait);
  }
}

/**
 * Filters containers that have a given trait.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export class PresentFilter<T extends Trait> extends SingleFilter<T> {
  /**
   * @override
   * @returns `true` if the container has this filter's trait.
   */
  public matches(container: Container<T>): boolean {
    return container.has(this.trait);
  }
}

/**
 * Filters containers that have a given trait.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export class AbsentFilter<T extends Trait> extends SingleFilter<T> {
  /**
   * @override
   * @returns `true` if the container does not have this filter's trait.
   */
  public matches(container: Container<T>): boolean {
    return !container.has(this.trait);
  }
}

/**
 * Filters containers that had the given trait added since the last reset.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export class AddedFilter<T extends Trait> extends SingleFilter<T> {
  /**
   * @override
   */
  public *getTrackingTraits(): IterableIterator<TraitConstructor<T>> {
    yield this.trait;
  }

  /**
   * @override
   * @returns `true` if the container has this filter's trait
   * added since the last query reset.
   */
  public matches(
    container: Container<T>,
    tracked: ChangeTrackMap,
    initial: boolean
  ): boolean {
    const { trait } = this;
    if (!container.has(trait)) return false;

    return initial || tracked.get("added").get(container).has(trait);
  }
}

/**
 * Filters container that had their instance of the given trait
 * changed since the last reset.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export class ChangedFilter<T extends Trait> extends SingleFilter<T> {
  /**
   * @override
   */
  public *getTrackingTraits(): IterableIterator<TraitConstructor<T>> {
    yield this.trait;
  }

  /**
   * @override
   * @returns `true` if the container has this filter's trait
   *  changed since the last query reset.
   */
  public matches(
    container: Container<T>,
    tracked: ChangeTrackMap,
    initial: boolean
  ): boolean {
    const { trait } = this;
    if (!container.has(trait)) return false;

    return (
      initial ||
      (tracked.get("changed").get(container).has(trait) &&
        !tracked.get("added").get(container).has(trait))
    );
  }
}

/**
 * Filters containers that had their instance of the given trait
 * removed since the last reset.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export class RemovedFilter<T extends Trait> extends SingleFilter<T> {
  /**
   * @override
   */
  public *getTrackingTraits(): IterableIterator<TraitConstructor<T>> {
    yield this.trait;
  }

  /**
   * @override
   * @returns `true` if the container has this filter's trait
   */
  public matches(
    container: Container<T>,
    tracked: ChangeTrackMap<any>
  ): boolean {
    const { trait } = this;
    if (container.has(trait)) return false;

    return tracked.get("removed").get(container).has(trait);
  }
}

/**
 * Common class for filters that encapsulate other filters.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export abstract class CompositeFilter<T extends Trait> extends Filter<T> {
  /**
   * The filters that this filter interacts with.
   */
  protected readonly subFilters: Array<Filter<T>>;

  /**
   * @param filters - The filters that this filter interacts with
   */
  public constructor(...filters: Array<Filter<T>>) {
    super();
    this.subFilters = [...this.flatten(filters)];

    for (const filter of filters) {
      for (const trait of filter.relatedTraits) {
        this.internalRelatedTraits.add(trait);
      }
    }
  }

  /**
   * @override
   */
  public *getTrackingTraits(): IterableIterator<TraitConstructor<T>> {
    for (const filter of this.subFilters) {
      yield* filter.getTrackingTraits();
    }
  }

  /**
   * Flattens filters of the same type.
   * @param filters - The filters to flatten
   * @returns A generator that loops over flattened filters
   */
  protected *flatten(filters: Array<Filter<T>>): IterableIterator<Filter<T>> {
    yield* filters;
  }
}

/**
 * Generic aggregation filter that matches against all of its sub-filters.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export abstract class AggregateFilter<
  T extends Trait
> extends CompositeFilter<T> {
  /**
   * @override
   * @returns `true` if _all_ of the filters this filter interacts with
   * matches.
   */
  public matches(
    container: Container<T>,
    tracked: ChangeTrackMap,
    initial: boolean
  ): boolean {
    return this.subFilters.every((filter) =>
      filter.matches(container, tracked, initial)
    );
  }
}

/**
 * Aggregates given filters such as they all must match for this filter to
 * match.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export class AllFilter<T extends Trait> extends AggregateFilter<T> {
  /**
   * It wraps the given tuple of filters in an AllFilter or returns
   * the single filter if there is only one.
   *
   * @param filters - The filters to wrap
   * @returns The wrapped filter
   */
  public static wrapIfMany<T extends Trait>(
    ...filters: Array<Filter<T>>
  ): Filter<T> {
    return filters.length === 1
      ? (filters[0] as Filter<T>)
      : new AllFilter(...filters);
  }

  /**
   * Flattens filters of the same type.
   * @param filters - The filters to flatten
   * @returns A generator that loops over flattened filters
   */
  protected *flatten(filters: Array<Filter<T>>): IterableIterator<Filter<T>> {
    for (const filter of filters) {
      if (filter instanceof AllFilter) {
        yield* this.flatten(filter.subFilters);
      } else {
        yield filter;
      }
    }
  }
}

/**
 * Aggregates given filters such as any of them must match for this filter to
 * match.
 *
 * @typeParam T - Lock to a type of the trait (Component, Resource...)
 */
export class AnyFilter<T extends Trait> extends CompositeFilter<T> {
  /**
   * @override
   * @returns `true` if _any_ of the filters this filter interacts with
   * matches.
   */
  public matches(
    container: Container<T>,
    tracked: ChangeTrackMap,
    initial: boolean
  ): boolean {
    return this.subFilters.some((filter) =>
      filter.matches(container, tracked, initial)
    );
  }

  /**
   * Flattens filters of the same type.
   * @param filters - The filters to flatten
   * @returns A generator that loops over flattened filters
   */
  protected *flatten(filters: Array<Filter<T>>): IterableIterator<Filter<T>> {
    for (const filter of filters) {
      if (filter instanceof AnyFilter) {
        yield* this.flatten(filter.subFilters);
      } else {
        yield filter;
      }
    }
  }
}
