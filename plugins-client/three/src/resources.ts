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

  public __dispose(): void {
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
}

/**
 * Handler for the window resize event.
 */
export class WindowResizeHandler extends Resource {
  private handler: () => void;

  public constructor(handler: () => void) {
    super();

    this.handler = handler;
    this.handleResize = this.handleResize.bind(this);

    window.addEventListener("resize", this.handleResize, { passive: true });
  }

  public __dispose(): void {
    window.removeEventListener("resize", this.handleResize);
  }

  private handleResize = (): void => {
    this.handler();
  };
}
