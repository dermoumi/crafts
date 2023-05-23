/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

type CustomMatchers = {
  numberBetween: (min: number, max: number) => any;
};

declare module "vitest" {
  interface Assertion extends CustomMatchers {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// Add a matcher for numbers between a min and max values
expect.extend({
  numberBetween(actual: number, min: number, max: number) {
    expect(min).toBeLessThanOrEqual(actual);
    expect(max).toBeGreaterThanOrEqual(actual);
    return { message: () => "This shouldn't happen.", pass: true };
  },
});

export {};
