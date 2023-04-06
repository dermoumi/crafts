import type { ClientPlugin } from ".";
import { FrameInfo } from "./variable-update";
import { GameConfig, Position, Rotation } from "@crafts/common-plugins";
import { Component } from "@crafts/ecs";
import { Node } from "./three";

/**
 * Tracks the tween animaiton for a Node's position.
 */
export class TweenPosition extends Component {
  public fromX = 0;
  public fromY = 0;
  public fromZ = 0;
  public progress = 1;
}

/**
 * Tracks the tween animaiton for a Node's rotation.
 */
export class TweenRotation extends Component {
  public fromX = 0;
  public fromY = 0;
  public fromZ = 0;
  public fromW = 1;
  public progress = 1;
}

/**
 * Handles interpolation of position and rotation components,
 * to hide the fixed update rate.
 */
export const pluginTween: ClientPlugin = (_, { preupdate }) => {
  preupdate
    .add({ positions: [Position, Node, Position.added()] }, ({ positions }) => {
      for (const [
        entity,
        { x, y, z },
        { node },
      ] of positions.withComponents()) {
        node.position.set(x, y, z);
        entity.add(TweenPosition, {
          fromX: x,
          fromY: y,
          fromZ: z,
          progress: 1,
        });
      }
    })
    .add({ positions: [Node, Position.changed()] }, ({ positions }) => {
      for (const [entity, { node }] of positions.withComponents()) {
        const { x, y, z } = node.position;

        entity.add(TweenPosition, {
          fromX: x,
          fromY: y,
          fromZ: z,
          progress: 0,
        });
      }
    })
    .add(
      {
        positions: [Position, TweenPosition, Node],
        resources: [FrameInfo, GameConfig],
      },
      ({ positions, resources }) => {
        const [frameInfo, gameConfig] = resources;
        const animationFactor =
          (1000 * frameInfo.delta) / gameConfig.fixedUpdateRateMs;

        for (const [
          entity,
          { x, y, z },
          tween,
          { node },
        ] of positions.withComponents()) {
          const { progress, fromX, fromY, fromZ } = tween;
          const animation = Math.min(1, progress + animationFactor);
          node.position.set(
            fromX + (x - fromX) * animation,
            fromY + (y - fromY) * animation,
            fromZ + (z - fromZ) * animation
          );

          if (animation >= 1) {
            entity.remove(TweenPosition);
          } else {
            tween.progress = animation;
          }
        }
      }
    )
    .add({ rotations: [Rotation, Node, Rotation.added()] }, ({ rotations }) => {
      for (const [
        entity,
        { x, y, z, w },
        { node },
      ] of rotations.withComponents()) {
        node.quaternion.set(x, y, z, w);
        entity.add(TweenRotation, {
          fromX: x,
          fromY: y,
          fromZ: z,
          fromW: w,
          progress: 1,
        });
      }
    })
    .add({ rotations: [Node, Rotation.changed()] }, ({ rotations }) => {
      for (const [entity, { node }] of rotations.withComponents()) {
        const { x, y, z, w } = node.quaternion;

        entity.add(TweenRotation, {
          fromX: x,
          fromY: y,
          fromZ: z,
          fromW: w,
          progress: 0,
        });
      }
    })
    .add(
      {
        rotations: [TweenRotation, Rotation, Node],
        resources: [FrameInfo, GameConfig],
      },
      ({ rotations, resources }) => {
        const [frameInfo, gameConfig] = resources;
        const animationFactor =
          (1000 * frameInfo.delta) / gameConfig.fixedUpdateRateMs;

        for (const [
          entity,
          tween,
          { x, y, z, w },
          { node },
        ] of rotations.withComponents()) {
          const { progress, fromX, fromY, fromZ, fromW } = tween;
          const animation = Math.min(1, progress + animationFactor);
          node.quaternion.set(
            fromX + (x - fromX) * animation,
            fromY + (y - fromY) * animation,
            fromZ + (z - fromZ) * animation,
            fromW + (w - fromW) * animation
          );

          if (animation >= 1) {
            entity.remove(TweenRotation);
          } else {
            tween.progress = animation;
          }
        }
      }
    );
};
