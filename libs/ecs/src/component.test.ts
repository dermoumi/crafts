import Component from "./component";
import {
  AbsentFilter,
  AddedFilter,
  ChangedFilter,
  PresentFilter,
} from "./filter";

class Position extends Component {
  public x = 0;
  public y = 0;
}

describe("Component class", () => {
  it("is a component", () => {
    expect(new Position().__isComponent()).toBe(true);
  });
});

describe("component filter shortcuts", () => {
  it("provides a shortcut to PresentFilter", () => {
    const filter = Position.present();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(PresentFilter);
    expect(trait).toBe(Position);
  });

  it("provides a shortcut to AbsentFilter", () => {
    const filter = Position.absent();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(AbsentFilter);
    expect(trait).toBe(Position);
  });

  it("provides a shortcut to AddedFilter", () => {
    const filter = Position.added();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(AddedFilter);
    expect(trait).toBe(Position);
  });

  it("provides a shortcut to ChangedFilter", () => {
    const filter = Position.changed();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(ChangedFilter);
    expect(trait).toBe(Position);
  });
});
