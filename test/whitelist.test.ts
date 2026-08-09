import { describe, expect, test } from "vitest";
import { isAllowedNumber } from "../src/whitelist";

describe("isAllowedNumber", () => {
  test("returns true when number is in the allowed list", () => {
    const result = isAllowedNumber("5511999999999", "5511999999999,5511888888888");

    expect(result).toBe(true);
  });

  test("returns false when number is not in the allowed list", () => {
    const result = isAllowedNumber("5511777777777", "5511999999999,5511888888888");

    expect(result).toBe(false);
  });

  test("ignores whitespace around numbers in the allowed list", () => {
    const result = isAllowedNumber("5511999999999", " 5511999999999 , 5511888888888 ");

    expect(result).toBe(true);
  });
});
