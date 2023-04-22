import type { TraitConstructor } from "./trait";
import {
  AbsentFilter,
  AddedFilter,
  AnyFilter,
  ChangedFilter,
  PresentFilter,
  RemovedFilter,
} from "./filter";
import { BaseTrait } from "./trait";

/**
 * A base class for Components.
 */
export abstract class Component extends BaseTrait {
  /**
   * Marker to identify components.
   *
   * @returns true
   */
  public __isComponent(): boolean {
    return true;
  }

  /**
   * Create a filter that only allows containers that have the trait.
   *
   * @returns An instance of PresentFilter
   */
  public static present(): PresentFilter<Component> {
    return new PresentFilter(this);
  }

  /**
   * Create a filter that only allows containers that do not have the trait.
   *
   * @returns An instance of AbsentFilter
   */
  public static absent(): AbsentFilter<Component> {
    return new AbsentFilter(this);
  }

  /**
   * Create a filter that only allows containers that gained trait
   * since last query reset.
   *
   * @returns An instance of AddedFilter
   */
  public static added(): AddedFilter<Component> {
    return new AddedFilter(this);
  }

  /**
   * Create a filter that only allows containers that had the trait
   * changed since last query reset.
   *
   * @returns An instance of ChangedFilter
   */
  public static changed(): ChangedFilter<Component> {
    return new ChangedFilter(this);
  }

  /**
   * Create a filters that only allows containers that had the trait
   * removed since the last query reset.
   *
   * @returns An instance of RemovedFilter
   */
  public static removed(): RemovedFilter<Component> {
    return new RemovedFilter(this);
  }

  /**
   * Create a filter for components that were added or changed since the last
   * query reset.
   *
   * @returns An instance of AnyFilter
   *  composed of AddedFilter and ChangedFilter
   */
  public static addedOrChanged(): AnyFilter<Component> {
    return new AnyFilter(new AddedFilter(this), new ChangedFilter(this));
  }

  /**
   * Create a filter for components that were changed or removed since the last
   * query reset.
   *
   * @returns An instance of AnyFilter
   *  composed of ChangedFilter and RemovedFilter
   */
  public static changedOrRemoved(): AnyFilter<Component> {
    return new AnyFilter(new ChangedFilter(this), new RemovedFilter(this));
  }
}

/**
 * A constructor for a Component.
 */
export type ComponentConstructor = TraitConstructor<Component>;

/**
 * Decorator to mark a component as unique.
 * Only one entity can have this component at a time.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function unique<T extends new (...args: any) => Component>(
  Base: T,
  _context: ClassDecoratorContext
) {
  return class extends Base {
    /**
     * Marker to identify unique components.
     *
     * @returns true
     */
    public __isUniqueComponent(): boolean {
      return true;
    }
  };
}
