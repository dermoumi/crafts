import type { ClientPlugin } from ".";
import { FrameInfo } from ".";
import { GameConfig, Position } from "@crafts/common-plugins";
import { Component } from "@crafts/ecs";

/**
 * Represents a ThreeJS scene.
 */
export class SceneNode extends Component {}

/**
 * Represents a ThreeJS camera.
 */
export class CameraNode extends Component {}

/**
 * Represents a ThreeJS mesh.
 */
export class MeshNode extends Component {}

/**
 * The position of an entity in the world.
 *
 * This is different from Position,
 * in that it only tracks the position of an object in the current frame.
 */
export class RenderPosition extends Component {
  public x = 0;
  public y = 0;
  public z = 0;
  public lastX = 0;
  public lastY = 0;
  public lastZ = 0;
  public progress = 1;
}

export const pluginWorldEntities: ClientPlugin = (_, { update }) => {
  update
    .add(
      { positions: [Position, RenderPosition, Position.added()] },
      ({ positions }) => {
        for (const [{ x, y, z }, renderPosition] of positions.asComponents()) {
          renderPosition.x = x;
          renderPosition.y = y;
          renderPosition.z = z;
          renderPosition.lastX = x;
          renderPosition.lastY = y;
          renderPosition.lastZ = z;
          renderPosition.progress = 1;
        }
      }
    )
    .add(
      { positions: [RenderPosition, Position.changed()] },
      ({ positions }) => {
        for (const [renderPosition] of positions.asComponents()) {
          const { x, y, z } = renderPosition;

          renderPosition.lastX = x;
          renderPosition.lastY = y;
          renderPosition.lastZ = z;
          renderPosition.progress = 0;
        }
      }
    )
    .add(
      {
        positions: [Position, RenderPosition],
        resources: [FrameInfo, GameConfig],
      },
      ({ positions, resources }) => {
        const [frameInfo, gameConfig] = resources;
        const animationFactor =
          (1000 * frameInfo.delta) / gameConfig.fixedUpdateRateMs;

        for (const [{ x, y, z }, renderPosition] of positions.asComponents()) {
          const { progress, lastX, lastY, lastZ } = renderPosition;
          if (progress >= 1) continue;

          const animation = Math.min(1, progress + animationFactor);
          renderPosition.progress = animation;
          renderPosition.x = lastX + (x - lastX) * animation;
          renderPosition.y = lastY + (y - lastY) * animation;
          renderPosition.z = lastZ + (z - lastZ) * animation;
        }
      }
    );
};
