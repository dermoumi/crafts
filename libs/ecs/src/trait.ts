import type Component from "./component";
import type Resource from "./resource";

/**
 * Common base type to traits
 */
export abstract class BaseTrait {
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
 * A decorator to mark a component/resource as a trait.
 */
export function exclusive<T extends new (...args: any) => Trait>(
  exclusionGroup: string
) {
  return (Base: T, _context: ClassDecoratorContext) =>
    // @ts-expect-error - We can't satisfy this constraint cleanly
    class extends Base {
      /**
       * Get the exclusion group for this trait.
       *
       * @returns The exclusion group's name
       */
      public __exclusionGroup(): string {
        return exclusionGroup;
      }
    };
}
