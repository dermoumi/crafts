import type Component from "./component";
import type Resource from "./resource";

/**
 * Common base type to traits
 */
export abstract class BaseTrait {
  public static assignNoChange<T extends object>(obj: T, value: Partial<T>): T {
    try {
      (obj as any).__noTriggerChange__ = true;
      return Object.assign(obj, value);
    } finally {
      delete (obj as any).__noTriggerChange__;
    }
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
