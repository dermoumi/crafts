import type Component from "./component";
import type Resource from "./resource";

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
