import { Component } from "@crafts/ecs";

/**
 * Position of a game entity in the world.
 */
export class Position extends Component {
  public x = 0;
  public y = 0;
  public z = 0;
}

/**
 * Linear velocity of a game entity.
 */
export class Velocity extends Component {
  public x = 0;
  public y = 0;
  public z = 0;
}

export type RotationOrder = "xyz" | "xzy" | "yxz" | "yzx" | "zxy" | "zyx";

/**
 * Rotation of a game entity.
 */
export class Rotation extends Component {
  public x = 0;
  public y = 0;
  public z = 0;
  public w = 1;

  public constructor(x = 0, y = 0, z = 0, w: number | RotationOrder = 1) {
    super();

    if (typeof w === "string") {
      this.setFromEuler(x, y, z, w);
    } else {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    }
  }

  public setFromEuler(x: number, y: number, z: number, order: RotationOrder) {
    const { cos, sin } = Math;

    const c1 = cos(x / 2);
    const c2 = cos(y / 2);
    const c3 = cos(z / 2);

    const s1 = sin(x / 2);
    const s2 = sin(y / 2);
    const s3 = sin(z / 2);

    switch (order) {
      case "xyz": {
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      }

      case "yxz": {
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      }

      case "zxy": {
        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      }

      case "zyx": {
        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      }

      case "yzx": {
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      }

      case "xzy": {
        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      }

      default: {
        throw new Error(`Unknown rotation order: ${order}`);
      }
    }
  }
}
