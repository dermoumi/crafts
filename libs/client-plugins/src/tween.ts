import type { ClientPlugin } from ".";
import { FrameInfo } from "./variable-update";
import { GameConfig, Position, Rotation } from "@crafts/common-plugins";
import { Component } from "@crafts/ecs";
import { Node } from "./three";

/**
 * The position of an entity in the world.
 *
 * This is different from Position,
 * in that it only tracks the position of an object in the current frame.
 */
export class TweenPosition extends Component {
  public x = 0;
  public y = 0;
  public z = 0;
  public progress = 1;
}

export class TweenRotation extends Component {
  public x = 0;
  public y = 0;
  public z = 0;
  public w = 1;
  public progress = 1;
}

export const pluginTween: ClientPlugin = (_, { preupdate }) => {
  preupdate
    .add({ positions: [Position, Node, Position.added()] }, ({ positions }) => {
      for (const [
        entity,
        { x, y, z },
        { node },
      ] of positions.withComponents()) {
        node.position.set(x, y, z);
        entity.add(TweenPosition, { x, y, z, progress: 1 });
      }
    })
    .add({ positions: [Node, Position.changed()] }, ({ positions }) => {
      for (const [entity, { node }] of positions.withComponents()) {
        const { x, y, z } = node.position;

        entity.add(TweenPosition, { x, y, z, progress: 0 });
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
          const { progress, x: fromX, y: fromY, z: fromZ } = tween;
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
        entity.add(TweenRotation, { x, y, z, w, progress: 1 });
      }
    })
    .add({ rotations: [Node, Rotation.changed()] }, ({ rotations }) => {
      for (const [entity, { node }] of rotations.withComponents()) {
        const { x, y, z, w } = node.quaternion;

        entity.add(TweenRotation, { x, y, z, w, progress: 0 });
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
          const { progress, x: fromX, y: fromY, z: fromZ, w: fromW } = tween;
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
