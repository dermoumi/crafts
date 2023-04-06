import Component from "./component";
import { Optional, state } from "./trait";

class Position extends Component {
  public x = 0;
  public y = 0;
}

describe("Trait shortcuts", () => {
  it("provides a shortcut to Optional", () => {
    const optional = Position.optional();
    const { trait } = optional;

    expect(optional).toBeInstanceOf(Optional);
    expect(trait).toBe(Position);
  });
});

describe("State trait decorator", () => {
  abstract class TestState extends Component {}

  it("fails if the base component does not inherit from the State trait", () => {
    expect(() => {
      @state(TestState)
      class TestComponent extends Component {}

      // Just to mark it as used
      vi.fn(() => TestComponent);
    }).toThrowError(
      'State trait "TestComponent" must inherit from parent state "TestState"'
    );
  });

  it("does not fail if the base component inherits inderectly from the State trait", () => {
    abstract class TestState2 extends TestState {}

    expect(() => {
      @state(TestState)
      class TestComponent extends TestState2 {}

      // Just to mark it as used
      vi.fn(() => TestComponent);
    }).not.toThrowError();
  });

  it("fails if the parent state component is also a state component", () => {
    @state(TestState)
    class TestState2 extends TestState {}

    expect(() => {
      @state(TestState2)
      class TestComponent extends TestState2 {}

      // Just to mark it as used
      vi.fn(() => TestComponent);
    }).toThrowError("The parent of a state trait must not be a state trait");
  });
});
