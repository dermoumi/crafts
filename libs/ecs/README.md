# ECS

An implementation of the Entity-Component-System pattern for Typescript.

Heavily inspired by `bevy_ecs`. With focus on ease of use and full TS typing.

## Concepts

ECS is a software pattern that involves breaking your program into Entities,
Components and Systems.

Entities are unique things in your game; characters, items, enemies etc... They
are identified by a unique ID, and can have any number of Components.

A component is a piece of data that is attached to an Entity. It can be anything
from a position, to a name, to a health value. Components are just data, and
they don't have any logic attached to them.

Systems are the logic that operates on the data. They are the brains of your
game. They can read and write data from the Components, and they can also
create and destroy Entities.

For example, one entity might have a `Position` and a `Velocity` component,
whereas another entity might have a `Position` and a `Health` component.
Then a system runs every game tick, grabs all entities with a `Position`
and `Velocity` components, then updates the former based on the latter.

This makes adding new behaviors to your game very easy, as you can just add
new components to existing entities, and define how they behave and interact
with other components using a system.

### Worlds

Entities, Components and Resources are stored in a `World`. They expose
operations to add, get, change and remove the data they store.

```ts
import * as Ecs from "@crafts/ecs";

const world = new Ecs.World();
```

### Entities

Entities are objects that are used to identify a set of Components.

```ts
import * as Ecs from "@crafts/ecs";

const world = new Ecs.World();

// Spawn a new entity
const entity = world.spawn();

// Retrieve an entity id
const id = entity.id; // A unique number in our world instance

// Remove an entity
world.remove(entity); // Removes the entity from the world
```

### Components

Components are normal classes that extend `Component`. They are data stored
in a `World`, and specific instances of Components correlate to Entities.

```ts
import * as Ecs from "@crafts/ecs";

// ...

class Position extends Ecs.Component {
  public x = 0;
  public y = 0;
}

// We cannot call the constructor directly,
// but we can use Entity.addNew() to pass arguments to the constructor
class Velocity extends Ecs.Component {
  public x = 0;
  public y = 0;

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }
}

// Components can not have anything, they'll serve as tags.
class Renderable extends Ecs.Component {}

// Add components
entity
  .add(Renderable) // with default values
  .add(Position, { x: 1, y: 1 }) // with initial values
  .addNew(Velocity, 1, 1) // pass arguments to constructor
  .add(Position); // Adding existing components overrides the original

// Retrieve components
const position = entity.get(Position); // Would throw an exception if Position is not found
const velocity = entity.tryGet(Velocity); // Would return undefined if Velocity is not found

// Check component existence
entity.has(Position); // true
entity.hasAny(Position, Renderable); // true
entity.hasAll(Position, Renderable); // False

// Remove components
entity.remove(Velocity); // Needs the component constructor, not the instance
```

### Bundles

A Bundle is just a utility for adding multiple components at once.

It is just any function that accepts a `Ecs.Entity` as its first component,
any other arguments can be passed to it when adding the bundle to an entity.

```ts
import * as Ecs from "@crafts/ecs";

const PlayerBundle = (entity: Ecs.Entity, name: string): void => {
  entity
    .add(Name, { name })
    .add(Renderable)
    .add(Position, { x: 0, y: 0 })
    .add(Velocity, { x: 0, y: 0 });
});

entityA.addBundle(PlayerBundle, "Mario");
entityB.addBundle(PlayerBundle, "Luigi");
```

Note: You can add bundles in bundles.

### Queries

Queries are used to retrieve entities that have a specific set of components.

```ts
import * as Ecs from "@crafts/ecs";

// ...

const entityA = world
  .spawn()
  .add(Position, { x: 0, y: 0 })
  .add(Velocity, { x: 1, y: 1 });

const entityB = world
  .spawn()
  .add(Position, { x: 0, y: 0 });
  .add(Velocity, { x: 1, y: 1 });

const entityC = world
  .spawn()
  .add(Position, { x: 1, y: 1 });

// Create a query for all entities with a Position component
const query = world.query(Position, Velocity); // entityA and entityB
```

After making a query, you can then loop over the entities that match the query.

```ts
// Loop over all entities in the query
for (const entity of query) {
  // Do something with entity
}

// Loop over only requested components.
// Returned array will contain components in the same order as the query
for (const [position, velocity] of query.asComponents()) {
  // ...
}

// Helper to retrieve the entities AND their components directly
for (const [entity, position, velocity] of query.withComponents()) {
  // ...
}
```

You can also use _filters_ to only match specific conditions.

```ts
// Note: Passing the component constructor implies the "present" filter.
const query = world.query(Position, Velocity.present(), Renderable.absent());
for (const [position] of query.asComponents()) {
  // ...
}

// Only component constructors are matched in the component list,
// and all filters are omitted from the result. Order is always kept.
const query = world.query(Position, Velocity.present(), Renderable);
query3.asComponents(); // Will return [Position, Renderable]

// Filter with newly added components
const query = world.query(Position, Velocity.added());
query.reset();

entityC.add(Velocity);
const entityD = world.spawn().add(Velocity);

for (const entities of query) {
  // Will only loop over entityC and entityD
  // They're the only ones who had the component Velocity added
  // since the last query reset.
}

// Filter with component changes
query = world.query(Position.changed());
query.reset();

entityA.get(Position).x = 1; // Value of a direct property changed
entityB.get(Position).x = 0; // Value did not change, it was already 0

for (const entities of query) {
  // Will only loop over entityA
  // It's the only one who had the component Position changed
  // since the last query reset.
}

// Note 1:
// Only direct properties are checked for changes,
// properties of sub-objects are ignored.

// Note 2:
// Adding an existing component with different values
// counts as a change.
```

You can also make composite filters using AND and OR operators:

```ts
// Will retrieve components that:
// - Have a Position component
// - AND Either:
//   - Had its Position component updated
//   - Has a Renderable component
//   - Has a Velocity component AND no Renderable component
// Note: AND is always implied at the top level.
query = world.query(
  Position,
  Renderable.present().or(
    Position.changed(),
    Velocity.present(),
    Renderable.absent()
  )
);
```

### Systems

Systems are functions that are paired with queries. Once defined, they can be
instantiated to then be called directly or using a [runner](#Runners).

```ts
import * as Ecs from "@crafts/ecs";

// ...

// Define the system
const SystemDefinition = new Ecs.System(
  { entities: [Position, Velocity] }, // Queries
  ({ entities }) => {
    // Receives the results as parameters
    for (const [position, velocity] of entities.asComponents()) {
      position.x += velocity.x * frameInfo.delta;
      position.y += velocity.y * frameInfo.delta;
    }
  }
);

// Instantiate the system
const system = world.addSystem(SystemDefinition);

// Run the system
system();
```

Systems can have multiple queries, their keys can be arbitrary except for
the world `resources` and `command` which are reserved.

```ts
const CollisionSystem = new Ecs.System(
  {
    entities: [Position, Position.changed()],
    otherEntities: [Position],
  },
  ({ entities, otherEntities }) => {
    for (const [entity, position] of entities.withComponents()) {
      for (const [other, otherPosition] of otherEntities.withComponents()) {
        if (entity === other) continue; // Skip self

        // Do stuff...
      }
    }
  }
);
```

### Resources

Sometimes you may need to share unique resources, such as the renderer instance,
or an asset manager.

Resources are a special kind of components that don't belong to any entity,
and is instead uniquely identified by its constructor.

```ts
import * as Ecs from "@crafts/ecs";

class FrameInfo extends Ecs.Resource {
  delta: number;
  time: number;
}

class Renderer extends Ecs.Resource {
  renderer: WebGLRenderer;

  constructor(...options: ConstructorParameters<WebGL2Renderer>) {
    super();
    this.renderer = new WebGLRenderer(...options);
  }
}

const world = new Ecs.World();

// Add a new resource
world.resources.add(FrameInfo).addNew(Renderer, { antialias: true });

// Retrieve a resource
const frameInfo = world.resources.get(FrameInfo); // Would throws if FrameInfo is not present
const renderer = world.resources.tryGet(Renderer); // Would return undefined if Renderer is not present

// Check for resources
world.resources.has(FrameInfo); // Returns true if FrameInfo resource is present
world.resources.hasAll(FrameInfo, Renderer); // Returns true if both are present
world.resources.hasAny(FrameInfo, Renderer); // Returns true if at least one is present

// Remove a resource
world.resources.remove(FrameInfo); // Needs the resource constructor, not the instance
```

When using systems, resources can be requested by passing a QueryTuple to the
`resources` key in the query list.

Note that the system will silently fail if called while the currently present
resources don't satisfy the query.

```ts
const SystemDefinition = new Ecs.System(
  {
    entities: [Position, Velocity],
    resources: [FrameInfo, Renderer], // `resources` is a special key
  },
  ({ entities, resources }) => {
    const [frameInfo, renderer] = resources;
    // ...
  }
);
```

### Component and resource disposal

If a component or resource has a `__dispose()` method, it will be
automatically called when it is removed or replaced.

This exclusively to free up external resources, any game logic
that would interact with the ECS world should run in a system instead.

```ts
class Mesh extends Component {
  public threeJsMesh: THREE.Mesh | undefined;

  public __dispose() {
    this.threeJsMesh?.dispose();
  }
}
```

### Commands

Commands allow you to queue operations on the world for execution after
the current system has finished.

It allows you, for instance, to mutate entities without altering the current
query.

```ts
import * as Ecs from "@crafts/ecs";

// ...

const CleanupSystem = new Ecs.System(
  { entities: [Despawn.present(), Mesh] }, // Using `command` in a query tuple is a disallowed
  ({ entities, command }) => {
    for (const [entity, { mesh }] of entities.withComponent()) {
      // The entity will be removed directly after this system's execution
      command(({ remove }) => {
        remove(entity);

        // Other clean up operations...
        mesh.dispose();
      });
    }
  }
);
```

## Usage example

```ts
import * as Ecs from "@crafts/ecs";

const NUM_ELEMENTS = 50;
const SPEED_MULTIPLIER = 0.3;
const SHAPE_SIZE = 50;
const SHAPE_HALF_SIZE = SHAPE_SIZE / 2;

// Resources
//----------------

class FrameInfo extends Ecs.Resource {
  delta: number;
  time: number;
}

class CanvasInfo extends Ecs.Resource {
  width: number;
  height: number;
  context: CanvasRenderingContext2D;
}

// Components
//----------------

class Velocity extends Ecs.Component {
  constructor(public x: number, public y: number) {
    super();
  }

  static random() {
    return new Velocity(
      (Math.random() - 0.5) * SPEED_MULTIPLIER,
      (Math.random() - 0.5) * SPEED_MULTIPLIER
    );
  }
}

class Position extends Ecs.Component {
  constructor(public x: number, public y: number) {
    super();
  }
}

class RandomPosition extends Ecs.Component {
  // Components can be empty
}

class Color extends Ecs.Component {
  constructor(public color: number = 0xffffff) {
    super();
  }
}

class Renderable extends Ecs.Component {
  // Components can be empty
}

// Systems
//----------------

// Assigns a random position to entities with the RandomPosition component
// But only when the RandomPosition component is newly added (e.g. on creation)
const PositionRandomizerSystem = new Ecs.System(
  { entities: [Position, RandomPosition.added()], resources: [CanvasInfo] },
  ({ entities, resources }) => {
    const [canvas] = resources;

    // RandomPosition.added() is only a filter and will not be included
    // when calling `entities.asComponents()`
    for (const [position] of entities.asComponents()) {
      position.x = Math.random() * canvas.width;
      position.y = Math.random() * canvas.height;
    }
  }
);

// Updates the positions of entities with the Position and Velocity components
const MovableSystem = new Ecs.System(
  // `resources` is a special key used to query global resources
  { moving: [Velocity, Position], resources: [FrameInfo, CanvasInfo] },
  ({ moving, resources }) => {
    // Resources are returned in the same order as the query.
    // In this case, `FrameInfo` will be the first resource,
    // and `CanvasInfo` the second.
    const [{ delta }, canvas] = resources;

    for (const [velocity, position] of moving.asComponents()) {
      position.x += velocity.x * delta;
      position.y += velocity.y * delta;

      if (position.x > canvas.width + SHAPE_HALF_SIZE) {
        position.x = -SHAPE_HALF_SIZE;
      }

      if (position.x < -SHAPE_HALF_SIZE) {
        position.x = canvas.width + SHAPE_HALF_SIZE;
      }

      if (position.y > canvas.height + SHAPE_HALF_SIZE) {
        position.y = -SHAPE_HALF_SIZE;
      }

      if (position.y < -SHAPE_HALF_SIZE) {
        position.y = canvas.height + SHAPE_HALF_SIZE;
      }
    }
  }
);

// Colors the entities red when colliding with others, and white when not.
// But only when the Position component has changed.
const CollisionSystem = new Ecs.System(
  // Both `entities` and `others` are queries.
  { entities: [Color, Position, Position.changed()], others: [Position] },
  ({ entities, others }) => {
    // We can choose to retrieve the entity along with other components
    for (const [entity, color, position] of entities.withComponents()) {
      color.color = 0xffffff;

      for (const [other, otherPosition] of others.withComponents()) {
        // Ignore the current entity
        if (entity === other) continue;

        if (
          Math.abs(position.x - otherPosition.x) < SHAPE_SIZE &&
          Math.abs(position.y - otherPosition.y) < SHAPE_SIZE
        ) {
          color.color = 0xff0000;
          break;
        }
      }
    }
  }
);

// Renders all entities with a Position and Color components
const RendererSystem = new Ecs.System(
  { renderables: [Position, Color], resources: [CanvasInfo] },
  ({ renderables, resources }) => {
    const [{ context, width, height }] = resources;

    context.fillStyle = "#ffcc00";
    context.fillRect(0, 0, width, height);

    // The components are returned in the same order as the queries.
    // So the first element is the position, and the second is the color.
    for (const [{ x, y }, { color }] of renderables.asComponents()) {
      context.fillStyle = `#${color.toString(16)}`;
      context.fillRect(
        x - SHAPE_HALF_SIZE,
        y - SHAPE_HALF_SIZE,
        SHAPE_SIZE,
        SHAPE_SIZE
      );
    }
  }
);

// World
//----------------

// Create our rendering canvas
const canvasElement = document.getElementById("canvas") as HTMLCanvasElement;

// Create the world
const world = new Ecs.World();

// Add resources
world
  .addResource(FrameInfo, {
    delta: 0,
    time: Performance.now(),
  })
  .addResource(CanvasInfo, {
    width: canvasElement.width,
    height: canvasElement.height,
    context: canvasElement.getContext("2d"),
  });

// A system runner is a function that manages and runs its systems
// and the same order they're added to it.
const update = world
  .addRunner()
  .add(PositionRandomizerSystem)
  .add(MovableSystem)
  .add(CollisionSystem)
  .add(RendererSystem);

// Spawn our entities
for (let i = 0; i < NUM_ELEMENTS; ++i) {
  world
    .spawn()
    .add(Velocity, Velocity.random()) // We affect components a value
    .addNew(Position, 0, 0) // Or we can pass their constructor aguments
    .add(RandomPosition)
    .add(Color)
    .add(Renderable);
}

// Start the game loop
const frameInfo = world.getResource(FrameInfo);
let lastTime = performance.now();

function run() {
  // Compute delta and elapsed time
  const time = performance.now();
  const delta = time - lastTime;
  frameInfo.time = time;
  frameInfo.delta = delta;

  // Run all the "update" systems
  update();

  lastTime = time;
  requestAnimationFrame(run);
}
run();
```
