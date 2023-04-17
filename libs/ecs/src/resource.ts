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
 * A base class for Resources.
 */
export abstract class Resource extends BaseTrait {
  /**
   * Marker to identify resoruces.
   *
   * @returns true
   */
  public __isResource(): boolean {
    return true;
  }

  /**
   * Create a filter that only allows containers that have the trait.
   *
   * @returns An instance of PresentFilter
   */
  public static present(): PresentFilter<Resource> {
    return new PresentFilter(this);
  }

  /**
   * Create a filter that only allows containers that do not have the trait.
   *
   * @returns An instance of AbsentFilter
   */
  public static absent(): AbsentFilter<Resource> {
    return new AbsentFilter(this);
  }

  /**
   * Create a filter that only allows containers that gained trait
   * since last query reset.
   *
   * @returns An instance of AddedFilter
   */
  public static added(): AddedFilter<Resource> {
    return new AddedFilter(this);
  }

  /**
   * Create a filter that only allows containers that had the trait
   * changed since last query reset.
   *
   * @returns An instance of ChangedFilter
   */
  public static changed(): ChangedFilter<Resource> {
    return new ChangedFilter(this);
  }

  /**
   * Create a filters that only allows containers that had the trait
   * removed since the last query reset.
   *
   * @returns An instance of RemovedFilter
   */
  public static removed(): RemovedFilter<Resource> {
    return new RemovedFilter(this);
  }

  /**
   * Create a filter for resources that were added or changed since the last
   * query reset.
   *
   * @returns An instance of AnyFilter
   *  composed of AddedFilter and ChangedFilter
   */
  public static addedOrChanged(): AnyFilter<Resource> {
    return new AnyFilter(new AddedFilter(this), new ChangedFilter(this));
  }

  /**
   * Create a filter for resources that were changed or removed since the last
   * query reset.
   *
   * @returns An instance of AnyFilter
   *  composed of ChangedFilter and RemovedFilter
   */
  public static changedOrRemoved(): AnyFilter<Resource> {
    return new AnyFilter(new ChangedFilter(this), new RemovedFilter(this));
  }
}
