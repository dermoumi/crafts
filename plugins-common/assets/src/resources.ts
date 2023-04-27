import { Resource, state } from "@crafts/ecs";

/**
 * A parent state for all assets loading states.
 */
export class AssetsLoadingState extends Resource {}

/**
 * A state for when assets are being loaded.
 */
@state(AssetsLoadingState)
export class AssetsLoadingOngoing extends AssetsLoadingState {
  public total = 0;
  public done = 0;

  public get progress(): number {
    if (this.total === 0) return 1;

    return this.done / this.total;
  }
}

/**
 * A state for when all currently requested assets have been loaded.
 */
@state(AssetsLoadingState)
export class AssetsLoadingDone extends AssetsLoadingState {}

/**
 * A resource to handle loading assets.
 */
export class Assets extends Resource {
  // TODO
}
