import Resource from "./resource";
import {
  AbsentFilter,
  AddedFilter,
  ChangedFilter,
  PresentFilter,
} from "./filter";

class AppInfo extends Resource {
  public name = "My App";
}

describe("Resource class", () => {
  it("is a resource", () => {
    expect(new AppInfo().__isResource()).toBe(true);
  });
});

describe("resource filter shortcuts", () => {
  it("provides a shortcut to PresentFilter", () => {
    const filter = AppInfo.present();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(PresentFilter);
    expect(trait).toBe(AppInfo);
  });

  it("provides a shortcut to AbsentFilter", () => {
    const filter = AppInfo.absent();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(AbsentFilter);
    expect(trait).toBe(AppInfo);
  });

  it("provides a shortcut to AddedFilter", () => {
    const filter = AppInfo.added();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(AddedFilter);
    expect(trait).toBe(AppInfo);
  });

  it("provides a shortcut to ChangedFilter", () => {
    const filter = AppInfo.changed();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(ChangedFilter);
    expect(trait).toBe(AppInfo);
  });
});
