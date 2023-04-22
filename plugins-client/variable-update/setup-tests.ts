declare global {
  namespace Vi {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface ExpectStatic {
      numberBetween: (min: number, max: number) => any;
    }
  }
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
