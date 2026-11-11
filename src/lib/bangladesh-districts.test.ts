import { expect, test } from "bun:test";

import { bangladeshDistricts } from "./bangladesh-districts";

test("provides all 64 unique Bangladesh districts with Bangla labels", () => {
  const values = bangladeshDistricts.map((district) => district.value);

  expect(values).toHaveLength(64);
  expect(new Set(values).size).toBe(64);
  expect(bangladeshDistricts.every((district) => district.bn.length > 0)).toBe(true);
});
