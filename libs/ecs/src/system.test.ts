import Component from "./component";
import Resource from "./resource";
import System from "./system";
import World from "./world";

class Position extends Component {
  public x = 0;
  public y = 0;
}

class Rotation extends Component {
  public angle = 0;
}

class AppInfo extends Resource {
  public name = "My App";
}

class FrameInfo extends Resource {
  public frame = 0;
}

describe("System queries typing", () => {
  it("it ignores non-requested components", () => {
    const mockSpy = vi.fn();
    const system = new System(
      { query: [Position, Position.present(), Rotation] },
      ({ query }) => {
        for (const components of query.asComponents()) {
          mockSpy();

          expectTypeOf(components).toMatchTypeOf<[Position, Rotation]>();
          expect(components[0]).toBeInstanceOf(Position);
          expect(components[1]).toBeInstanceOf(Rotation);
        }
      }
    );

    const world = new World();
    world.spawn().add(Position).add(Rotation);

    const handle = world.addSystem(system);
    handle();

    expect(mockSpy).toHaveBeenCalledTimes(1);
  });

  it("it has correct typing with multiple queries", () => {
    const mockSpy = vi.fn();
    const system = new System(
      {
        queryA: [Position, Position.present(), Rotation],
        queryB: [Rotation, Position],
      },
      ({ queryA, queryB }) => {
        for (const components of queryA.asComponents()) {
          mockSpy();

          expectTypeOf(components).toMatchTypeOf<[Position, Rotation]>();
          expect(components[0]).toBeInstanceOf(Position);
          expect(components[1]).toBeInstanceOf(Rotation);
        }

        for (const components of queryB.asComponents()) {
          mockSpy();

          expectTypeOf(components).toMatchTypeOf<[Rotation, Position]>();
          expect(components[0]).toBeInstanceOf(Rotation);
          expect(components[1]).toBeInstanceOf(Position);
        }
      }
    );

    const world = new World();
    world.spawn().add(Position).add(Rotation);

    const handle = world.addSystem(system);
    handle();

    expect(mockSpy).toHaveBeenCalledTimes(2);
  });

  it("has correct resource typing", () => {
    const mockSpy = vi.fn();
    const system = new System(
      { resources: [AppInfo, FrameInfo] },
      ({ resources }) => {
        mockSpy();

        expectTypeOf(resources).toEqualTypeOf<[AppInfo, FrameInfo]>();
        expect(resources[0]).toBeInstanceOf(AppInfo);
        expect(resources[1]).toBeInstanceOf(FrameInfo);
      }
    );

    const world = new World();
    world.resources.add(AppInfo).add(FrameInfo);

    const handle = world.addSystem(system);
    handle();

    expect(mockSpy).toHaveBeenCalledTimes(1);
  });

  it("can accept an empty query", () => {
    const mockSpy = vi.fn();
    const system = new System({}, () => {
      mockSpy();
    });

    const world = new World();
    world.spawn().add(Position).add(Rotation);

    const handle = world.addSystem(system);
    handle();

    expect(mockSpy).toHaveBeenCalledTimes(1);
  });
});
