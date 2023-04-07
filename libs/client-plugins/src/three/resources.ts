import { Resource } from "@crafts/ecs";
import { WebGLRenderer } from "three";

/**
 * The main ThreeJS renderer.
 */
export class Renderer extends Resource {
  /**
   * The three.js renderer instance.
   */
  public readonly renderer = new WebGLRenderer();

  /**
   * The element where the renderer is mounted.
   */
  public readonly element: HTMLElement;

  /**
   * @param element - The element where the renderer will be mounted
   */
  public constructor(element: HTMLElement) {
    super();
    this.element = element;
  }
}
