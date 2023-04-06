import type { CommonSystemGroups } from ".";

import { GameApp } from "@crafts/game-app";
import {
  Collider,
  CuboidCollider,
  DynamicRigidBody,
  FixedRigidBody,
  Physics,
  pluginPhysics,
  RigidBody,
  Sleeping,
} from "./physics";
import { GameConfig, pluginGameConfig } from "./game-config";
import { Position, Rotation, Velocity } from "./world-entities";

describe("Physics plugin", () => {
  it("adds a Physics resource", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const physicsWorld = game.world.resources.tryGet(Physics);

    expect(physicsWorld).toBeDefined();
    expect(physicsWorld).toBeInstanceOf(Physics);
  });

  it("updates the physics' timestep when the fixed update rate changes", async () => {
    const game = new GameApp<CommonSystemGroups>()
      .addPlugin(pluginGameConfig)
      .addPlugin(pluginPhysics);
    await game.run();

    const physicsWorld = game.world.resources.get(Physics);
    expect(physicsWorld.world.timestep).toBeCloseTo(1 / 60);

    game.world.resources.get(GameConfig).fixedUpdateRateMs = 1000 / 30;
    game.groupsProxy.fixed();

    expect(physicsWorld.world.timestep).toBeCloseTo(1 / 30);
  });
});

describe("Physics colliders", () => {
  it("adds a collider to the world when a Collider component is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn();
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(Physics);
    expect(world.colliders.getAll()).toHaveLength(0);

    entity.addNew(CuboidCollider, 1, 1, 1);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Collider);
    expect(collider).toBeDefined();
    expect(world.colliders.getAll()).toEqual([collider]);
  });

  it("replaces the old collider when replacing the Collider component", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().addNew(CuboidCollider, 1, 1, 1);
    game.groupsProxy.fixed();

    const { collider: oldCollider } = entity.get(Collider);
    const { world } = game.world.resources.get(Physics);
    expect(world.colliders.getAll()).toEqual([oldCollider]);

    entity.addNew(CuboidCollider, 2, 2, 2);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Collider);
    expect(collider).not.toBe(oldCollider);
    expect(world.colliders.getAll()).toEqual([collider]);
  });

  it("removes colliders from the world when a Collider is removed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().addNew(CuboidCollider, 1, 1, 1);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(Physics);
    const { collider: oldCollider } = entity.get(Collider);
    expect(world.colliders.getAll()).toEqual([oldCollider]);

    entity.remove(Collider);
    game.groupsProxy.fixed();

    expect(world.colliders.getAll()).toEqual([]);
  });

  it("updates the collider's position when the Position component is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().addNew(CuboidCollider, 1, 1, 1);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Collider);
    const oldColliderPosition = collider?.translation();
    expect(oldColliderPosition).toEqual({ x: 0, y: 0, z: 0 });

    entity.add(Position, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    const colliderPosition = collider?.translation();
    expect(colliderPosition).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("updates the collider's position when the Position component is updated", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .addNew(CuboidCollider, 1, 1, 1)
      .add(Position, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    const position = entity.get(Position);
    Object.assign(position, { x: 4, y: 5, z: 6 });
    game.groupsProxy.fixed();

    const { collider } = entity.get(Collider);
    const colliderPosition = collider?.translation();

    expect(colliderPosition).toEqual({ x: 4, y: 5, z: 6 });
  });
});

describe("Physics rigid bodies", () => {
  it("adds a rigid body to the world when a RigidBody component is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn();
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(Physics);
    expect(world.bodies.getAll()).toHaveLength(0);

    entity.add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body).toBeDefined();
    expect(world.bodies.getAll()).toEqual([body]);
  });

  it("replaces the rigid body in the world when replacing the RigidBody component", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(Physics);
    const { body: oldBody } = entity.get(RigidBody);
    expect(oldBody).toBeDefined();
    expect(world.bodies.getAll()).toEqual([oldBody]);

    entity.add(FixedRigidBody);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body).toBeDefined();
    expect(world.bodies.getAll()).toEqual([body]);
  });

  it("removes the old rigid body from the world when replaced", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(Physics);
    const { body: oldBody } = entity.get(RigidBody);
    expect(world.bodies.getAll()).toContain(oldBody);

    entity.add(FixedRigidBody);
    game.groupsProxy.fixed();

    expect(world.bodies.getAll()).not.toContain(oldBody);
  });

  it("attaches the collider to the rigid body when RigidBody is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().addNew(CuboidCollider, 1, 1, 1);
    game.groupsProxy.fixed();

    const { collider: oldCollider } = entity.get(Collider);
    expect(oldCollider).toBeDefined();
    expect(oldCollider?.parent()).toBeNull();

    entity.add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    const { collider } = entity.get(Collider);
    expect(collider).toBeDefined();
    expect(collider).not.toBe(oldCollider);
    expect(collider?.parent()).toBe(body);
  });

  it("attaches the collider to the rigid body when RigidBody is replaced", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .addNew(CuboidCollider, 1, 1, 1)
      .add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { body: oldBody } = entity.get(RigidBody);
    const { collider: oldCollider } = entity.get(Collider);
    expect(oldCollider).toBeDefined();
    expect(oldCollider?.parent()).toBe(oldBody);

    entity.add(FixedRigidBody);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    const { collider } = entity.get(Collider);
    expect(collider).toBeDefined();
    expect(collider).not.toBe(oldCollider);
    expect(collider?.parent()).toBe(body);
  });

  it("removes rigid bodies from the world when a RigidBody is removed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { world } = game.world.resources.get(Physics);
    const { body } = entity.get(RigidBody);
    expect(world.bodies.getAll()).toEqual([body]);

    entity.remove(RigidBody);
    game.groupsProxy.fixed();

    expect(world.bodies.getAll()).toEqual([]);
  });

  it("detaches colliders when RigidBody is removed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(DynamicRigidBody)
      .addNew(CuboidCollider, 1, 1, 1);
    game.groupsProxy.fixed();

    const { body: oldBody } = entity.get(RigidBody);
    const { collider: oldCollider } = entity.get(Collider);
    expect(oldCollider?.parent()).toBe(oldBody);

    entity.remove(RigidBody);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Collider);
    expect(collider).toBeDefined();
    expect(collider?.parent()).toBeNull();
  });

  it("updates the rigid body's position when the Position component is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.translation()).toEqual({ x: 0, y: 0, z: 0 });

    entity.add(Position, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    expect(body?.translation()).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("updates the rigid body's position when the Position component is updated", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(Position).add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.translation()).toEqual({ x: 0, y: 0, z: 0 });

    const position = entity.get(Position);
    Object.assign(position, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    expect(body?.translation()).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("updates the rigid body's collider when the Collider component is updated", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(DynamicRigidBody)
      .addNew(CuboidCollider, 1, 1, 1);
    game.groupsProxy.fixed();

    const { collider: oldCollider } = entity.get(Collider);
    const { body } = entity.get(RigidBody);
    expect(body?.numColliders()).toBe(1);
    expect(body?.collider(0)).toBe(oldCollider);

    entity.addNew(CuboidCollider, 2, 2, 2);
    game.groupsProxy.fixed();

    const { collider } = entity.get(Collider);
    expect(body?.numColliders()).toBe(1);
    expect(body?.collider(0)).toBe(collider);
  });

  it("updates the rigid body's position when Position is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.translation()).toEqual({ x: 0, y: 0, z: 0 });

    entity.add(Position, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    expect(body?.translation()).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("updates the rigid body's position when Position is changed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(Position).add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.translation()).toEqual({ x: 0, y: 0, z: 0 });

    const position = entity.get(Position);
    Object.assign(position, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    expect(body?.translation()).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("updates the entity's Position when the rigid body is updated", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(Position).add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    const position = entity.get(Position);
    expect(position).toEqual({ x: 0, y: 0, z: 0 });

    body?.setTranslation({ x: 1, y: 2, z: 3 }, true);
    game.groupsProxy.fixed();

    expect(position).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("does not update Position from sleeping rigid bodies", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(DynamicRigidBody)
      .add(Position, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.translation()).toEqual({ x: 1, y: 2, z: 3 });

    body?.setTranslation({ x: 4, y: 5, z: 6 }, false);
    entity.add(Sleeping);
    game.groupsProxy.fixed();

    const position = entity.get(Position);
    expect(position).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("wakes the body up when position is changed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(DynamicRigidBody)
      .add(Position)
      .add(Sleeping);
    game.groupsProxy.fixed();

    expect(entity.has(Sleeping)).toBe(true);
    const position = entity.get(Position);
    position.x = 1;
    game.groupsProxy.fixed();

    expect(entity.has(Sleeping)).toBe(false);
  });
});

describe("RigidBody with Velocity", () => {
  it("updates the rigid body's velocity when Velocity is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(DynamicRigidBody)
      .add(Velocity, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.linvel()).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("updates the rigid body's velocity when Velocity is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.linvel()).toEqual({ x: 0, y: 0, z: 0 });

    entity.add(Velocity, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    expect(body?.linvel()).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("updates the rigid body's velocity when Velocity is changed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(DynamicRigidBody)
      .add(Velocity, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.linvel()).toEqual({ x: 1, y: 2, z: 3 });

    const velocity = entity.get(Velocity);
    Object.assign(velocity, { x: 4, y: 5, z: 6 });
    game.groupsProxy.fixed();

    expect(body?.linvel()).toEqual({ x: 4, y: 5, z: 6 });
  });

  it("updates the entities Velocity when the rigid body is updated", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody).add(Velocity);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.linvel()).toEqual({ x: 0, y: 0, z: 0 });

    body?.setLinvel({ x: 1, y: 2, z: 3 }, true);
    game.groupsProxy.fixed();

    const velocity = entity.get(Velocity);
    expect(velocity).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("does not update Velocity from sleeping rigid bodies", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(DynamicRigidBody)
      .add(Velocity, { x: 1, y: 2, z: 3 });
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.linvel()).toEqual({ x: 1, y: 2, z: 3 });

    body?.setLinvel({ x: 4, y: 5, z: 6 }, false);
    entity.add(Sleeping);
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
      .add(Position)
      .add(DynamicRigidBody)
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
      .add(Position)
      .add(Velocity, { x: 1, y: 2, z: 3 });

    game.groupsProxy.fixed();

    const position = entity.get(Position);
    expect(position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("wakes the body up when velocity is changed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(DynamicRigidBody)
      .add(Velocity)
      .add(Sleeping);
    game.groupsProxy.fixed();

    expect(entity.has(Sleeping)).toBe(true);
    const velocity = entity.get(Velocity);
    velocity.x = 10;
    game.groupsProxy.fixed();

    expect(entity.has(Sleeping)).toBe(false);
  });
});

describe("RigidBody with Rotation", () => {
  it("updates the rigid body's rotation when Rotation is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const rotation = new Rotation(1, 2, 3, "xyz");
    entity.add(Rotation, rotation);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    const bodyRotation = body?.rotation();
    expect(bodyRotation?.x).toBeCloseTo(rotation.x);
    expect(bodyRotation?.y).toBeCloseTo(rotation.y);
    expect(bodyRotation?.z).toBeCloseTo(rotation.z);
    expect(bodyRotation?.w).toBeCloseTo(rotation.w);
  });

  it("updates the rigid body's rotation when Rotation is changed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody).add(Rotation);
    game.groupsProxy.fixed();

    const rotation = new Rotation(1, 2, 3, "xyz");
    entity.add(Rotation, rotation);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    const bodyRotation = body?.rotation();
    expect(bodyRotation?.x).toBeCloseTo(rotation.x);
    expect(bodyRotation?.y).toBeCloseTo(rotation.y);
    expect(bodyRotation?.z).toBeCloseTo(rotation.z);
    expect(bodyRotation?.w).toBeCloseTo(rotation.w);
  });

  it("updates the entity's Rotation when the rigid body is updated", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody).add(Rotation);
    game.groupsProxy.fixed();

    const rotation = new Rotation(1, 2, 3, "xyz");
    const { body } = entity.get(RigidBody);
    body?.setRotation(rotation, true);
    game.groupsProxy.fixed();

    const entityRotation = entity.get(Rotation);
    expect(entityRotation?.x).toBeCloseTo(rotation.x);
    expect(entityRotation?.y).toBeCloseTo(rotation.y);
    expect(entityRotation?.z).toBeCloseTo(rotation.z);
    expect(entityRotation?.w).toBeCloseTo(rotation.w);
  });

  it("does not update Rotation from sleeping rigid bodies", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody).add(Rotation);
    game.groupsProxy.fixed();

    const rotation = new Rotation(1, 2, 3, "xyz");
    const { body } = entity.get(RigidBody);
    body?.setRotation(rotation, true);
    body?.sleep();
    game.groupsProxy.fixed();

    const entityRotation = entity.get(Rotation);
    expect(entityRotation?.x).toBeCloseTo(0);
    expect(entityRotation?.y).toBeCloseTo(0);
    expect(entityRotation?.z).toBeCloseTo(0);
    expect(entityRotation?.w).toBeCloseTo(1);
  });

  it("wakes the body up when rotation is changed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world
      .spawn()
      .add(DynamicRigidBody)
      .add(Rotation)
      .add(Sleeping);
    game.groupsProxy.fixed();

    expect(entity.has(Sleeping)).toBe(true);
    const rotation = entity.get(Rotation);
    rotation.x = 1;
    game.groupsProxy.fixed();

    expect(entity.has(Sleeping)).toBe(false);
  });
});

describe("RigidBody sleep state", () => {
  it("sets the rigid body to sleep when Sleeping is added", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.isSleeping()).toBe(false);

    entity.add(Sleeping);
    game.groupsProxy.fixed();

    expect(body?.isSleeping()).toBe(true);
  });

  it("wakes the rigid body up when Sleeping is removed", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody).add(Sleeping);
    game.groupsProxy.fixed();

    const { body } = entity.get(RigidBody);
    expect(body?.isSleeping()).toBe(true);

    entity.remove(Sleeping);
    game.groupsProxy.fixed();

    expect(body?.isSleeping()).toBe(false);
  });

  it("add the Sleeping component when the rigid body is put to sleep", async () => {
    const game = new GameApp<CommonSystemGroups>().addPlugin(pluginPhysics);
    await game.run();

    const entity = game.world.spawn().add(DynamicRigidBody);
    game.groupsProxy.fixed();

    expect(entity.has(Sleeping)).toBe(false);

    const { body } = entity.get(RigidBody);
    body?.sleep();
    game.groupsProxy.fixed();

    expect(entity.has(Sleeping)).toBe(true);
  });
});
