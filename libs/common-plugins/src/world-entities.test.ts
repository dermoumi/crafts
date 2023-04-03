import { Rotation } from "./world-entities";

describe("Rotation component", () => {
  const rotationTestSet = [
    [
      [1, 2, 3, "xyz"],
      [
        0.754_933_801_264_452_5, -0.206_149_226_026_877_7,
        0.501_509_096_403_722_1, -0.368_871_357_713_289_8,
      ],
    ],
    [
      [2, 3, 4, "xzy"],
      [
        -0.514_835_228_774_146_4, -0.278_406_241_416_877,
        -0.314_545_425_475_028_3, 0.747_325_783_889_418_3,
      ],
    ],
    [
      [3, 4, 5, "yxz"],
      [
        0.371_052_646_161_465_5, 0.196_897_927_169_671_4,
        0.709_035_719_386_205_1, 0.566_409_294_315_822_3,
      ],
    ],
    [
      [4, 5, 6, "yzx"],
      [
        0.686_041_322_687_227_3, 0.143_757_100_918_507_85,
        0.585_791_682_231_369_9, -0.406_852_927_394_663_4,
      ],
    ],
    [
      [5, 6, 7, "zxy"],
      [
        0.515_175_966_458_633_2, 0.313_706_427_443_502_7,
        -0.357_305_111_966_055_97, -0.713_102_417_557_935_1,
      ],
    ],
    [
      [6, 7, 8, "zyx"],
      [
        0.349_197_712_379_680_34, -0.126_979_076_383_528_84,
        -0.733_977_326_562_923_4, -0.568_519_617_885_898_2,
      ],
    ],
  ] as const;

  it("can be created from a quaternion", () => {
    const rotation = new Rotation(0, 0, 0, 1);
    expect(rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it.each(rotationTestSet)(
    "can be created from a euler angle %s",
    ([eulerX, eulerY, eulerZ, order], [x, y, z, w]) => {
      const rotation = new Rotation(eulerX, eulerY, eulerZ, order);
      expect(rotation).toEqual({ x, y, z, w });
    }
  );

  it("throws when created from euler angles with an invalid order", () => {
    expect(() => {
      const rotation = new Rotation(0, 0, 0, "invalid" as any);
      expect(rotation).toBeDefined();
    }).toThrowError("Unknown rotation order: invalid");
  });

  it.each(rotationTestSet)(
    "can be set from a euler angle %s",
    ([eulerX, eulerY, eulerZ, order], [x, y, z, w]) => {
      const rotation = new Rotation();
      rotation.setFromEuler(eulerX, eulerY, eulerZ, order);
      expect(rotation).toEqual({ x, y, z, w });
    }
  );

  it("fails when set from euler angles with an invalid order", () => {
    const rotation = new Rotation();

    expect(() => {
      rotation.setFromEuler(0, 0, 0, "invalid" as any);
    }).toThrowError("Unknown rotation order: invalid");
  });
});
