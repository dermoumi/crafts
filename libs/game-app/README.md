# GameApp

Manages a game application. Inspired by bevy.

## Concepts

GameApp works alongside [ECS](../ecs/README.md) to manage the game application
and manages the world and its systems.

It introduces schedulers, system-likes and plugins.

### Systems

Just like [ECS systems](../ecs/README.md#systems), systems are functions that
that operate on given requested entities, resources or events.

```ts
import { GameApp, System } from "@crafts/game-app";
import * as Ecs from "@crafts/ecs";

class MyResource extends Ecs.Resource {}

const mySystem = new System({}, ({ command }) => {
  command.addResource(MyResource);
});

const app = new GameApp().addStartupSystem(mySystem);
app.run();
```

Systems can run on a specific order relative to each other by optionally
labelling them and using `before` or `after` to specify the order.

```ts
const system1 = new System({}, ({ command }) => {
  command.addResource(MyResource);
});

const system2 = new System({ resources: MyResource }, ({ resources }) => {
  const [myResource] = resources;
  // Do something with myResource...
})
  .after(system1)
  .label("labelled-system");

const system3 = new System({}, ({ command }) => {
  command.spawn().add(MyComponent);
}).before("labelled-system");
```

You can also change order using `priority()`, a system with a higher priority
will always run first. The default priority is 0. `after()` and `before()` are
always respected.

Systems can have run conditions, using `runIf()` and `runUnless()`.

These methods accept a callback predicate that receives the ECS world,
and returns a boolean.

All the conditions must be satisfied for the system to run.

```ts
const system = new System({}, () => {
  // ...
})
  // Run only if the given resource is present
  .runIf((world) => world.resources.has(MyResource))
  // This is equivalent to the above
  .runIf(System.resourcePresent(MyResource))
  // Don't run if the given resource filter has results
  .runUnless(System.resourceFilter(MyResource.addedOrChanged()))
  // Don't run if the given component filter has results
  .runUnless(System.componentFilter(Position.added(), Rotation.removed())
```

### System sets

System sets are special systems that are used to group systems together.

```ts
import { GameApp, System, SystemSet } from "@crafts/game-app";

const system1 = new System({}, () => {
  // ...
});

const system2 = new System({}, () => {
  // ...
});

const systemSet = new SystemSet().add(system1).add(system2);

const app = new GameApp().addStartupSystem(systemSet);
app.run();
```

The `after()` and `before()` methods only change order of systems within a
system set; the entire system set runs as a single system.

### Schedulers

A scheduler is a collection of systems that are executed in a specific context.

For example, we have a `startup` scheduler that runs once at the beginning of
the application.

```ts
import { GameApp } from "@crafts/game-app";

const app = new GameApp();

// Since 'my-scheduler' does not already exist, it will be created.
const myScheduler = app.getScheduler("my-scheduler");

// Run the scheduler
myScheduler();
```

You can add systems to schedulers using `addSystem()`:

```ts
const app = new GameApp();

app.addSystem(mySystem, "my-scheduler");

// By default it adds to the 'update' scheduler
app.addSystem(mySystem2); // Same as app.addSystem(mySystem2, "update");

// There's also a shortcut for adding to the startup scheduler
app.addStartupSystem(mySystem3); // Same as app.addSystem(mySystem3, "startup");
```
