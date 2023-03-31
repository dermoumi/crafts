import {
  AbsentFilter,
  AddedFilter,
  ChangedFilter,
  PresentFilter,
  RemovedFilter,
} from "./filter";

/**
 * A base class for Resources.
 */
export default abstract class Resource {
  /**
   * Marker to identify resoruces.
   *
   * @returns true
   */
  public __isResource(): boolean {
    return true;
  }

  /**
   * Called when the resource is disposed of
   */
  public __dispose(): void {
    // Nothing to do
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
}
