import Component from "./component";
import { Optional } from "./trait";

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
