import type Resource from "./resource";
import type { TraitConstructor } from "./trait";

import { SetMap } from "@crafts/default-map";
import Container from "./container";
import Manager from "./manager";

/**
 * A container for resources.
 */
export default class ResourceContainer extends Container<Resource> {
  /**
   * Shows the correct name in exceptions.
   *
   * @returns The string representation of the container
   */
  public toString(): string {
    return "ResourceContainer";
  }

  /**
   * Triggers whenever the given resource updates.
   *
   * @param resource - The resource to monitor
   * @param callback - The callback to trigger
   * @returns A function to remove the listener
   */
  public onUpdate<T extends Resource, TArgs extends unknown[]>(
    resource: new (...args: TArgs) => T,
    callback: () => void
  ): () => void {
    return (this.manager as ResourceManager).addChangeListener(
      resource,
      callback
    );
  }
}

/**
 * A manager for resources
 * @internal
 */
export class ResourceManager extends Manager<Resource, ResourceContainer> {
  /**
   * @internal
   */
  private readonly changeListeners = new SetMap<
    TraitConstructor<Resource>,
    () => void
  >();

  /**
   * Add a listener for container changes.
   * This includes adding and removing traits, as well as trait changes.
   *
   * @internal
   * @param trait - The trait to monitor
   * @param listener - The listener to add
   * @returns A function to remove the listener
   */
  public addChangeListener(
    trait: TraitConstructor<Resource>,
    listener: () => void
  ): () => void {
    const traitListeners = this.changeListeners.get(trait);
    traitListeners.add(listener);

    return () => {
      traitListeners.delete(listener);

      if (traitListeners.size === 0) {
        this.changeListeners.delete(trait);
      }
    };
  }

  /**
   * Notifies the related queries that the trait has been added to the
   * given container.
   *
   * @internal
   * @param container - The container that changed
   * @param trait - The trait that was added
   */
  public onTraitAdded(
    container: ResourceContainer,
    trait: TraitConstructor<Resource>
  ): void {
    super.onTraitAdded(container, trait);

    for (const listener of this.changeListeners.get(trait)) {
      listener();
    }
  }

  /**
   * Notifies the related queries that the trait has been removed from the
   * given container.
   *
   * @internal
   * @param container - The container that has changed
   * @param trait - The trait that was removed
   */
  public onTraitRemoved(
    container: ResourceContainer,
    trait: TraitConstructor<Resource>
  ): void {
    super.onTraitRemoved(container, trait);

    for (const listener of this.changeListeners.get(trait)) {
      listener();
    }
  }

  /**
   * Notifies the related queries that the trait has been changed on the
   * given container.
   *
   * @internal
   * @param container - The container that has changed
   * @param trait - The trait that has changed
   */
  public onTraitChanged(
    container: ResourceContainer,
    trait: TraitConstructor<Resource>
  ): void {
    super.onTraitChanged(container, trait);

    for (const listener of this.changeListeners.get(trait)) {
      listener();
    }
  }
}
