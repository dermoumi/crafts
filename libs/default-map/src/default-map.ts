/**
 * The type of a function that can be used to create a default value.
 */
export type DefaultFactory<A, B> = (key: A) => B;

/**
 * A map that provides a default value for a missing key.
 */
export class DefaultMap<A, B> extends Map<A, B> {
  private readonly factory: DefaultFactory<A, B>;

  /**
   * @param factory - A function that returns a default value
   *    for a missing key.
   * @param iterable - An iterable object that is used to populate
   *    the map initially.
   */
  public constructor(
    factory: DefaultFactory<A, B>,
    iterable: Iterable<[A, B]> = []
  ) {
    super(iterable);
    this.factory = factory;
  }

  /**
   * Retrieve the value for the given key.
   *
   * @param key - The key to get the value for.
   * @returns - The value for the key, or a newly added value
   *    if the key is not found.
   */
  public get(key: A): B {
    if (this.has(key)) {
      return super.get(key) as B;
    }

    const value = this.factory(key);
    this.set(key, value);
    return value;
  }
}

/**
 * A map that provides a default empty array for missing keys.
 */
export class ArrayMap<A, B> extends DefaultMap<A, B[]> {
  /**
   * @param iterable - An iterable object that is used to populate
   *    the map initially.
   */
  public constructor(iterable?: Iterable<[A, B[]]>) {
    super(() => [], iterable);
  }
}

/**
 * A map that provides a default empty map for missing keys.
 */
export class MapMap<A, B, C> extends DefaultMap<A, Map<B, C>> {
  /**
   * @param iterable - An iterable object that is used to populate
   *    the map initially.
   */
  public constructor(iterable?: Iterable<[A, Map<B, C>]>) {
    super(() => new Map(), iterable);
  }
}

/**
 * A map that provides a default empty set for missing keys.
 */
export class SetMap<A, B> extends DefaultMap<A, Set<B>> {
  /**
   * @param iterable - An iterable object that is used to populate
   *    the map initially.
   */
  public constructor(iterable?: Iterable<[A, Set<B>]>) {
    super(() => new Set(), iterable);
  }
}
