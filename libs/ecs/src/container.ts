import type Manager from "./manager";
import type {
  Trait,
  TraitConcreteConstructor,
  TraitConstructor,
} from "./trait";

/**
 * A base class with shared functionality for Entities and ResourceContainer.
 */
export default abstract class Container<T extends Trait> {
  /**
   * @internal
   */
  private readonly traitMap = new Map<TraitConstructor<T>, T>();

  /**
   * @internal
   */
  protected readonly manager: Manager<T, Container<T>>;

  /**
   * @internal
   * @param manager - The container manager to use
   */
  public constructor(manager: Manager<T, Container<T>>) {
    this.manager = manager;
  }

  /**
   * Enumerate trait types and their values.
   */
  public *traits(): IterableIterator<TraitConstructor<T>> {
    yield* this.traitMap.keys();
  }

  /**
   * Remove all traits from this container.
   */
  public clear(): void {
    for (const trait of this.traitMap.values()) {
      trait.__dispose();
    }

    this.traitMap.clear();
  }

  /**
   * Add a trait to the container.
   *
   * @typeParam C - The type of the trait
   * @param constructor - The trait to add
   * @param initialValue - The initial value of the trait
   * @returns This object
   */
  public add<C extends T>(
    constructor: TraitConcreteConstructor<C, []>,
    initialValue?: Partial<C>
  ): this {
    const trait = new constructor();

    if (initialValue !== undefined) {
      Object.assign(trait, initialValue);
    }

    return this.addTrait(constructor, trait);
  }

  /**
   * Instantiate a trait and add it to the container.
   *
   * @typeParam C - The type of the trait
   * @typeParam CArgs - The type of the arguments that the constructor accepts
   * @param constructor - The trait to add
   * @param args - Values to pass to the constructor when creating the trait
   * @returns This object
   */
  public addNew<C extends T, CArgs extends unknown[]>(
    constructor: TraitConcreteConstructor<C, CArgs>,
    ...args: CArgs
  ): this {
    const trait = new constructor(...args);

    return this.addTrait(constructor, trait);
  }

  /**
   * Remove a trait from the container.
   *
   * @param constructor - The trait to remove
   * @returns This object
   */
  public remove(constructor: TraitConstructor<T>): this {
    const trait = this.tryGet(constructor);

    if (trait !== undefined) {
      // Dispose of the trait
      trait.__dispose();

      this.traitMap.delete(constructor);
      this.manager.onTraitRemoved(this, constructor);
    }

    return this;
  }

  /**
   * Get a trait from the container.
   *
   * @typeParam C - The type of the trait
   * @param constructor - The trait to get
   * @returns The retrieved trait
   * @throws If the trait is not present
   */
  public get<C extends T>(constructor: TraitConstructor<C>): C {
    const trait = this.tryGet(constructor);

    if (trait === undefined) {
      throw new Error(`${constructor.name} is not present in ${this}`);
    }

    return trait;
  }

  /**
   * Get a trait from the container if it exists.
   *
   * @typeParam C - The type of the trait
   * @param constructor - The trait to get
   * @returns The trait, or undefined if it is not present
   */
  public tryGet<C extends T>(constructor: TraitConstructor<C>): C | undefined {
    return this.traitMap.get(constructor) as C | undefined;
  }

  /**
   * Check if a given trait is present in the container.
   *
   * @param constructor - The trait to check for
   * @returns True if the trait is present, false otherwise
   */
  public has(constructor: TraitConstructor<T>): boolean {
    return this.traitMap.has(constructor);
  }

  /**
   * Check if the given traits are all present in the container.
   *
   * @param constructors - The traits to check for
   * @returns True if all traits are present, false otherwise
   */
  public hasAll(...constructors: ReadonlyArray<TraitConstructor<T>>): boolean {
    return constructors.every((constructor) => this.has(constructor));
  }

  /**
   * Check if any of the given traits are present in the container.
   *
   * @param constructors - The traits to check for
   * @returns True if any of the traits is present, false otherwise
   */
  public hasAny(...constructors: ReadonlyArray<TraitConstructor<T>>): boolean {
    return constructors.some((constructor) => this.has(constructor));
  }

  /**
   * Add and wrap a trait instance to the container.
   *
   * @internal
   * @param constructor - The trait type to add
   * @param trait - The trait instance to add
   * @returns This object
   */
  protected addTrait(constructor: TraitConstructor<T>, trait: T): this {
    // Wrap the trait with a proxy to monitor changes
    const proxy = new Proxy(trait, {
      set: (target, key, value): boolean => {
        const originalValue = Reflect.get(target, key) as unknown;

        const noTriggerChange =
          key === "__noTriggerChange__" ||
          Boolean(Reflect.get(target, "__noTriggerChange__"));

        const result = Reflect.set(target, key, value);

        // Make sure to trigger the hook after the trait has been updated
        if (value !== originalValue && !noTriggerChange) {
          this.manager.onTraitChanged(this, constructor);
        }

        return result;
      },
    });

    const previousTrait = this.traitMap.get(constructor);
    this.traitMap.set(constructor, proxy);
    if (previousTrait) {
      // Dispose of the previous trait if it exists
      previousTrait.__dispose();
      // Notify the query manager about the change
      this.manager.onTraitChanged(this, constructor);
    } else {
      // Notify the query manager about the addition
      this.manager.onTraitAdded(this, constructor);
    }

    return this;
  }
}
