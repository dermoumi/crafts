import type { Component } from "./component";
import type Manager from "./manager";
import type { TraitConcreteConstructor } from "./trait";

import Container from "./container";

/**
 * An entity is a container of components.
 */
export default class Entity extends Container<Component> {
  /**
   * The entity's ID.
   */
  public readonly id: string;

  /**
   * @internal
   * @param id - The entity's ID
   * @param manager - The entity manager to use
   */
  public constructor(id: string, manager: Manager<Component, Entity>) {
    super(manager);

    this.id = id;
  }

  /**
   * Add a bundle of components.
   *
   * @typeParam BArgs - The type of the extra arguments that the bundle accepts
   * @param bundle - The bundle to add
   * @param args - The arguments to pass to the bundle
   * @returns This object
   */
  public addBundle<BArgs extends unknown[]>(
    bundle: Bundle<BArgs>,
    ...args: BArgs
  ): this {
    bundle(this, ...args);

    return this;
  }

  /**
   * @override
   */
  protected addTrait<C extends Component>(
    constructor: TraitConcreteConstructor<C, []>,
    trait: C
  ): this {
    // Remove unique components from all other entities
    if (
      (trait as any).__isUniqueComponent?.() &&
      !this.has(constructor) &&
      this.manager
    ) {
      const builder = this.manager.createQuery(constructor);

      for (const container of builder.containers) {
        container.remove(constructor);
      }
    }

    return super.addTrait(constructor, trait);
  }

  /**
   * Shows the correct name in exceptions.
   *
   * @returns The string representation of the container
   */
  public toString(): string {
    return `Entity ${this.id}`;
  }
}

/**
 * A reusable function that adds components to an entity.
 *
 * @typeParam TArgs - The type of the extra arguments that the bundle accepts
 * @param entity - The entity to add components to
 * @param args - Extra arguments passed to the bundle
 */
export type Bundle<TArgs extends unknown[]> = (
  entity: Entity,
  ...args: TArgs
) => void;
