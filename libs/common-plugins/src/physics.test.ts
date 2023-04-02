import type { CommonSystemGroups } from ".";

import { Cuboid } from "@dimforge/rapier3d-compat";
import { GameApp } from "@crafts/game-app";
import {
  Collider,
  Physics,
  PhysicsWorld,
  pluginPhysics,
  RigidBody,
} from "./physics";
import { GameConfig, pluginGameConfig } from "./game-config";
import { Position, Velocity } from "./world-entities";

describe("Physics plugin", () => {
  it("adds a PhysicsWorld resource", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const physicsWorld = game.world.resources.tryGet(PhysicsWorld);

    expect(physicsWorld).toBeDefined();
    expect(physicsWorld).toBeInstanceOf(PhysicsWorld);
  });

  it("updates the physics' timestep when the fixed update rate changes", async () => {
    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginGameConfig)
      .addPlugin(pluginPhysics);
    await game.run();

    const physicsWorld = game.world.resources.get(PhysicsWorld);
    expect(physicsWorld.world.timestep).toBeCloseTo(1 / 60);

    game.world.resources.get(GameConfig).fixedUpdateRateMs = 1000 / 30;
    game.groupsProxy.fixed();

    expect(physicsWorld.world.timestep).toBeCloseTo(1 / 30);
  });
});

describe("Physics component", () => {
  it("does not fail when a Physics entity's position changes", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(Physics).add(Position);
    game.groupsProxy.fixed();

    entity.get(Position).x = 1;

    expect(() => {
      game.groupsProxy.fixed();
    }).not.toThrowError();
  });
});

describe("Physics coliders", () => {
  it("adds a collider to the world when a Collider component is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(Physics).add(Position);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    expect(world.colliders.getAll()).toHaveLength(0);

    entity.addNew(Collider, "cuboid", 1, 1, 1);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Physics);
    expect(collider).toBeDefined();
    expect(world.colliders.getAll()).toContain(collider);
  });

  it("adds a collider to the world when a Physics component is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Position)
      .addNew(Collider, "cuboid", 1, 1, 1);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    expect(world.colliders.getAll()).toHaveLength(0);

    entity.add(Physics);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Physics);
    expect(collider).toBeDefined();
    expect(world.colliders.getAll()).toContain(collider);
  });

  it("adds a collider to the world when a Position component is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .addNew(Collider, "cuboid", 1, 1, 1);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    expect(world.colliders.getAll()).toHaveLength(0);

    entity.add(Position);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Physics);
    expect(collider).toBeDefined();
    expect(world.colliders.getAll()).toContain(collider);
  });

  it("updates the collider when replacing the Collider component", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(Collider, "cuboid", 1, 1, 1);
    game.groupsProxy.fixed();

    entity.addNew(Collider, "cuboid", 2, 2, 2);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Physics);
    const shape = collider?.shape as Cuboid;
    expect(shape).toBeInstanceOf(Cuboid);
    expect(shape.halfExtents).toEqual({ x: 2, y: 2, z: 2 });
  });

  it("removes the old collider from the world when replaced", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .addNew(Collider, "cuboid", 1, 1, 1);
    game.groupsProxy.fixed();

    const { collider: oldCollider } = entity.get(Physics);

    entity.addNew(Collider, "cuboid", 2, 2, 2);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    expect(world.colliders.getAll()).not.toContain(oldCollider);
  });

  it("removes colliders from the world when a Collider is removed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(Collider, "cuboid", 1, 1, 1);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    const { collider: oldCollider } = entity.get(Physics);
    expect(world.colliders.getAll()).toContain(oldCollider);

    entity.remove(Collider);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Physics);
    expect(collider).toBeUndefined();
    expect(world.colliders.getAll()).not.toContain(oldCollider);
  });

  it("removes colliders from the world when a Position component is removed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(Collider, "cuboid", 1, 1, 1);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    const { collider: oldCollider } = entity.get(Physics);
    expect(world.colliders.getAll()).toContain(oldCollider);

    entity.remove(Position);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Physics);
    expect(collider).toBeUndefined();
    expect(world.colliders.getAll()).not.toContain(oldCollider);
  });

  it.todo(
    "removes colliders from the world when a Physics component is removed",
    async () => {
      // TODO
    }
  );

  it("updates the collider's position when the Position component is updated", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .addNew(Collider, "cuboid", 1, 1, 1)
      .add(Position, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    const position = entity.get(Position);
    position.x = 4;
    position.y = 5;
    position.z = 6;
    game.groupsProxy.fixed();

    const { collider } = entity.get(Physics);
    const colliderPosition = collider?.translation();

    expect(colliderPosition).toBeDefined();
    expect(colliderPosition).toEqual({ x: 4, y: 5, z: 6 });
  });
});

describe("Physics rigid bodies", () => {
  it("adds a rigid body to the world when a RigidBody component is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(Physics).add(Position);
    game.groupsProxy.fixed();

    entity.addNew(RigidBody, "dynamic");
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    const { rigidBody } = entity.get(Physics);
    expect(rigidBody).toBeDefined();
    expect(world.bodies.getAll()).toContain(rigidBody);
  });

  it("adds a collider to the world when a Physics component is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .addNew(RigidBody, "dynamic")
      .add(Position);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    expect(world.bodies.getAll()).toHaveLength(0);

    entity.add(Physics);
    game.groupsProxy.fixed();

    const { rigidBody } = entity.get(Physics);
    expect(rigidBody).toBeDefined();
    expect(world.bodies.getAll()).toContain(rigidBody);
  });

  it("adds a collider to the world when a Position component is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().addNew(RigidBody, "dynamic").add(Physics);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    expect(world.bodies.getAll()).toHaveLength(0);

    entity.add(Position);
    game.groupsProxy.fixed();

    const { rigidBody } = entity.get(Physics);
    expect(rigidBody).toBeDefined();
    expect(world.bodies.getAll()).toContain(rigidBody);
  });

  it("updates the rigid body when replacing the RigidBody component", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic");
    game.groupsProxy.fixed();

    const { rigidBody: oldRigidBody } = entity.get(Physics);
    expect(oldRigidBody).toBeDefined();

    entity.addNew(RigidBody, "fixed");
    game.groupsProxy.fixed();

    const { rigidBody } = entity.get(Physics);
    expect(rigidBody).toBeDefined();
    expect(rigidBody).not.toBe(oldRigidBody);
  });

  it("removes the old rigid body from the world when replaced", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic");
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    const { rigidBody: oldRigidBody } = entity.get(Physics);
    expect(world.bodies.getAll()).toContain(oldRigidBody);

    entity.addNew(RigidBody, "fixed");
    game.groupsProxy.fixed();

    expect(world.bodies.getAll()).not.toContain(oldRigidBody);
  });

  it("attaches the collider to the rigid body when RigidBody is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(Collider, "cuboid", 1, 1, 1);
    game.groupsProxy.fixed();

    const { collider: oldCollider } = entity.get(Physics);
    expect(oldCollider).toBeDefined();
    expect(oldCollider?.parent()).toBeNull();

    entity.addNew(RigidBody, "dynamic");
    game.groupsProxy.fixed();

    const { rigidBody, collider } = entity.get(Physics);
    expect(collider).toBeDefined();
    expect(collider).not.toBe(oldCollider);
    expect(collider?.parent()).toBe(rigidBody);
  });

  it("attaches the collider to the rigid body when RigidBody is replaced", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(Collider, "cuboid", 1, 1, 1)
      .addNew(RigidBody, "dynamic");
    game.groupsProxy.fixed();

    const physics = entity.get(Physics);
    const { rigidBody: oldRigidBody, collider: oldCollider } = physics;
    expect(oldCollider).toBeDefined();
    expect(oldCollider?.parent()).toBe(oldRigidBody);

    entity.addNew(RigidBody, "fixed");
    game.groupsProxy.fixed();

    const { rigidBody, collider } = physics;
    expect(collider).toBeDefined();
    expect(collider).not.toBe(oldCollider);
    expect(collider?.parent()).toBe(rigidBody);
  });

  it("removes rigid bodies from the world when a RigidBody is removed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic");
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    const { rigidBody } = entity.get(Physics);
    expect(world.bodies.getAll()).toContain(rigidBody);

    entity.remove(RigidBody);
    game.groupsProxy.fixed();

    expect(world.bodies.getAll()).not.toContain(rigidBody);
  });

  it("removes rigid bodies from the world when a Position component is removed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic");
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(PhysicsWorld);
    const { rigidBody } = entity.get(Physics);
    expect(world.bodies.getAll()).toContain(rigidBody);

    entity.remove(Position);
    game.groupsProxy.fixed();

    expect(world.bodies.getAll()).not.toContain(rigidBody);
  });

  it.todo(
    "removes rigid bodies from the world when a Physics component is removed",
    async () => {
      // TODO
    }
  );

  it("reattaches colliders without parent when RigidBody is removed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic")
      .addNew(Collider, "cuboid", 1, 1, 1);
    game.groupsProxy.fixed();

    const { collider: oldCollider, rigidBody } = entity.get(Physics);
    expect(oldCollider?.parent()).toBe(rigidBody);

    entity.remove(RigidBody);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Physics);
    expect(collider).toBeDefined();
    expect(collider?.parent()).toBeNull();
  });

  it("updates the rigid body's position when the Position component is updated", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic");
    game.groupsProxy.fixed();

    const { rigidBody } = entity.get(Physics);
    expect(rigidBody?.translation()).toEqual({ x: 0, y: 0, z: 0 });

    const position = entity.get(Position);
    Object.assign(position, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    expect(rigidBody?.translation()).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("does not update the collider's position when a rigid body exists", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "fixed")
      .addNew(Collider, "cuboid", 1, 1, 1);
    game.groupsProxy.fixed();

    const { collider, rigidBody } = entity.get(Physics);
    expect(collider?.translation()).toEqual(rigidBody?.translation());

    const position = entity.get(Position);
    Object.assign(position, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    expect(rigidBody?.translation()).toEqual({ x: 1, y: 2, z: 3 });
    expect(collider?.translation()).toEqual(rigidBody?.translation());
  });

  it("updates the rigid body's collider when the Collider component is updated", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic")
      .addNew(Collider, "cuboid", 1, 1, 1);
    game.groupsProxy.fixed();

    const { collider: oldCollider } = entity.get(Physics);
    expect(oldCollider?.shape).toBeInstanceOf(Cuboid);

    entity.addNew(Collider, "cuboid", 2, 2, 2);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Physics);
    const shape = collider?.shape as Cuboid;
    expect(shape).toBeInstanceOf(Cuboid);
    expect(shape.halfExtents).toEqual({ x: 2, y: 2, z: 2 });
  });

  it("updates the rigid body's position when Position is changed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic");
    game.groupsProxy.fixed();

    const { rigidBody } = entity.get(Physics);
    expect(rigidBody?.translation()).toEqual({ x: 0, y: 0, z: 0 });

    const position = entity.get(Position);
    Object.assign(position, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    expect(rigidBody?.translation()).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("updates the entity's Position when the rigid body is updated", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic");
    game.groupsProxy.fixed();

    const { rigidBody } = entity.get(Physics);
    const position = entity.get(Position);
    expect(position).toEqual({ x: 0, y: 0, z: 0 });

    rigidBody?.setTranslation({ x: 1, y: 2, z: 3 }, true);
    game.groupsProxy.fixed();

    expect(position).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe("RigidBody with Velocity", () => {
  it("updates the rigid body's velocity when Velocity is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic")
      .add(Velocity, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    const { rigidBody } = entity.get(Physics);
    expect(rigidBody?.linvel()).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("updates the rigid body's velocity when Velocity is changed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic")
      .add(Velocity, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    const { rigidBody } = entity.get(Physics);
    expect(rigidBody?.linvel()).toEqual({ x: 1, y: 2, z: 3 });

    const velocity = entity.get(Velocity);
    Object.assign(velocity, { x: 4, y: 5, z: 6 });
    game.groupsProxy.fixed();

    expect(rigidBody?.linvel()).toEqual({ x: 4, y: 5, z: 6 });
  });

  it("updates the entities Velocity when the rigid body is updated", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic");
    game.groupsProxy.fixed();

    const { rigidBody } = entity.get(Physics);
    expect(rigidBody?.linvel()).toEqual({ x: 0, y: 0, z: 0 });

    rigidBody?.setLinvel({ x: 1, y: 2, z: 3 }, true);
    game.groupsProxy.fixed();

    expect(rigidBody?.linvel()).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("does not update Velocity if a rigid body's linear veloctiy changed without waking it up", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic")
      .add(Velocity, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    const { rigidBody } = entity.get(Physics);
    expect(rigidBody?.linvel()).toEqual({ x: 1, y: 2, z: 3 });

    rigidBody?.setLinvel({ x: 4, y: 5, z: 6 }, false);
    rigidBody?.sleep();
    game.groupsProxy.fixed();

    const velocity = entity.get(Velocity);
    expect(velocity).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("updates the Position with a non-zero Velocity when there's a rigid body", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    game.world.resources.add(GameConfig, { fixedUpdateRateMs: 1000 / 10 });

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .addNew(RigidBody, "dynamic")
      .add(Velocity, { x: 1, y: 2, z: 3 });

    for (let i = 0; i < 10; i++) {
      game.groupsProxy.fixed();
    }

    const position = entity.get(Position);
    expect(position.x).toBeCloseTo(1);
    expect(position.y).toBeCloseTo(2);
    expect(position.z).toBeCloseTo(3);
  });

  it("does not update position based on Velocity whene there's no RigidBody", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(Physics)
      .add(Position)
      .add(Velocity, { x: 1, y: 2, z: 3 });

    game.groupsProxy.fixed();

    const position = entity.get(Position);
    expect(position).toEqual({ x: 0, y: 0, z: 0 });
  });
});
