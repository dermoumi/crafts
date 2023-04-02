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
