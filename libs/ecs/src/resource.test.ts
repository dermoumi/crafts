import { Resource } from "./resource";
import {
  AbsentFilter,
  AddedFilter,
  AnyFilter,
  ChangedFilter,
  NotAddedFilter,
  NotChangedFilter,
  PresentFilter,
  RemovedFilter,
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

  it("provides a shortcut to NotAddedFilter", () => {
    const filter = AppInfo.notAdded();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(NotAddedFilter);
    expect(trait).toBe(AppInfo);
  });

  it("provides a shortcut to ChangedFilter", () => {
    const filter = AppInfo.changed();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(ChangedFilter);
    expect(trait).toBe(AppInfo);
  });

  it("provides a shortcut to NotChangedFilter", () => {
    const filter = AppInfo.notChanged();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(NotChangedFilter);
    expect(trait).toBe(AppInfo);
  });

  it("provides a shortcut to RemovedFilter", () => {
    const filter = AppInfo.removed();
    // @ts-expect-error 2341 - We want to check its private property
    const { trait } = filter;

    expect(filter).toBeInstanceOf(RemovedFilter);
    expect(trait).toBe(AppInfo);
  });

  it("provides a shortcut to Added-or-Changed filters", () => {
    const filter = AppInfo.addedOrChanged();

    expect(filter).toBeInstanceOf(AnyFilter);
    expect(filter).toEqual(
      new AnyFilter(new AddedFilter(AppInfo), new ChangedFilter(AppInfo))
    );
  });

  it("provides a shortcut to Changed-or-Removed filters", () => {
    const filter = AppInfo.changedOrRemoved();

    expect(filter).toBeInstanceOf(AnyFilter);
    expect(filter).toEqual(
      new AnyFilter(new ChangedFilter(AppInfo), new RemovedFilter(AppInfo))
    );
  });
});
