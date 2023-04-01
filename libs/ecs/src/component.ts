import {
  AbsentFilter,
  AddedFilter,
  ChangedFilter,
  PresentFilter,
  RemovedFilter,
} from "./filter";

/**
 * A base class for Components.
 */
export default abstract class Component {
  /**
   * Marker to identify components.
   *
   * @returns true
   */
  public __isComponent(): boolean {
    return true;
  }

  /**
   * Called when the component is disposed of
   */
  public __dispose(): void {
    // Nothing to do
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
}

export abstract class UniqueComponent extends Component {
  /**
   * Marker to identify unique components.
   *
   * @returns true
   */
  public __isUniqueComponent(): boolean {
    return true;
  }
}
