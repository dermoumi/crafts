import { Event } from "./event";

class TestEvent extends Event {
  public value = 0;
}

describe("Event class", () => {
  it("is an event", () => {
    expect(new TestEvent().__isEvent()).toBe(true);
  });
});
