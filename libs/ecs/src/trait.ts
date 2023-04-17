import type { Component } from "./component";
import type Resource from "./resource";

/**
 * Common base type to traits
 */
export abstract class BaseTrait {
  /**
   * Create a modifier to mark the resource as optional
   */
  public static optional<T extends Component>(
    this: TraitConstructor<T>
  ): Optional<T> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new Optional(this);
  }

  /**
   * Called when the component is disposed of
   */
  public __dispose(): void {
    // Nothing to do
  }
}

/**
 * Supported trait types.
 */
export type Trait = Component | Resource;

/**
 * Type for a Trait constructor.
 *
 * @typeParam T - Trait type
 * @typeParam TArgs - Arguments for the constructor
 */
export type TraitConstructor<
  T extends Trait,
  TArgs extends unknown[] = any
> = abstract new (...args: TArgs) => T;

/**
 * Type for a Trait concrete constructor.
 *
 * @typeParam T - Trait type
 * @typeParam TArgs - Arguments for the constructor
 */
export type TraitConcreteConstructor<
  T extends Trait,
  TArgs extends unknown[] = any
> = new (...args: TArgs) => T;

/**
 * Marks the containing trait as optional, and this may not be included
 */
export class Optional<T extends Trait> {
  /**
   * The trait to mark as optional
   */
  public trait: TraitConstructor<T>;

  public constructor(trait: TraitConstructor<T>) {
    this.trait = trait;
  }
}

/**
 * A decorator to mark a component/resource as a state.
 */
export function state<
  P extends TraitConstructor<Trait>,
  T extends new (...args: any) => InstanceType<P>
>(parentState: P) {
  // Make sure the parent state is not a State trait itself
  if ("__stateTrait" in parentState.prototype) {
    throw new TypeError(
      "The parent of a state trait must not be a state trait"
    );
  }

  return (Base: T, _context: ClassDecoratorContext) => {
    if (!(Base.prototype instanceof parentState)) {
      throw new TypeError(
        `State trait "${Base.name}" must inherit from parent state "${parentState.name}"`
      );
    }

    // @ts-expect-error - We can't satisfy this constraint cleanly
    return class extends Base {
      /**
       * Get the exclusion group for this trait.
       *
       * @returns The exclusion group's name
       */
      public __stateTrait(): TraitConstructor<Trait> {
        return parentState;
      }
    };
  };
}
