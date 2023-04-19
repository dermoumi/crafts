export abstract class Event {
  /**
   * Marker that this class is an event.
   *
   * @returns true
   */
  public __isEvent() {
    return true;
  }
}

/**
 * A constructor for an event.
 */
export type EventConcreteConstructor<
  T extends Event,
  TArgs extends unknown[] = any
> = new (...args: TArgs) => T;
