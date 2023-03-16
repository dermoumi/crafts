import Resource from "./resource";
import World from "./world";

class TestResource extends Resource {
  public value = 0;
}

describe("Resource container", () => {
  it("shows the correct container name when an error is thrown", () => {
    const { resources } = new World();

    expect(() => resources.get(TestResource)).toThrow(
      "TestResource is not present in ResourceContainer"
    );
  });
});

describe("Resource manager's onUpdate", () => {
  it("runs the listener when a resource is added", () => {
    const { resources } = new World();

    const listener = vi.fn();
    resources.onUpdate(TestResource, listener);

    expect(listener).not.toHaveBeenCalled();

    resources.add(TestResource);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("runs the listener when a resource is removed", () => {
    const { resources } = new World();

    const listener = vi.fn();
    resources.onUpdate(TestResource, listener);

    resources.add(TestResource);

    listener.mockClear();
    resources.remove(TestResource);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("runs the listener when a resource is updated with a different value", () => {
    const { resources } = new World();

    const listener = vi.fn();
    resources.onUpdate(TestResource, listener);

    resources.add(TestResource);
    const resource = resources.get(TestResource);

    listener.mockClear();
    resource.value = 42;
    expect(listener).toHaveBeenCalledOnce();
  });

  it("does not run the listener when a resource is updated with the same value", () => {
    const { resources } = new World();

    const listener = vi.fn();
    resources.onUpdate(TestResource, listener);

    resources.add(TestResource);
    const resource = resources.get(TestResource);

    listener.mockClear();
    resource.value = 0;
    expect(listener).not.toHaveBeenCalled();
  });

  it("removes the listeners when the returned callback is called", () => {
    const { resources } = new World();

    const listener = vi.fn();
    const removeListener = resources.onUpdate(TestResource, listener);

    resources.add(TestResource);
    expect(listener).toHaveBeenCalledOnce();

    listener.mockClear();

    removeListener();
    resources.add(TestResource);
    expect(listener).not.toHaveBeenCalled();
  });

  it("only keeps other listeners when removing a listener for a given resource", () => {
    const { resources } = new World();

    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const removeListener1 = resources.onUpdate(TestResource, listener1);
    resources.onUpdate(TestResource, listener2);

    resources.add(TestResource);
    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();

    resources.remove(TestResource);
    listener1.mockClear();
    listener2.mockClear();
    removeListener1();
    resources.add(TestResource);
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledOnce();
  });
});
