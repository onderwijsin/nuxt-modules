import { describe, expect, it } from "vitest";

import { applyStyles } from "../src/utils/applyStyles";

describe("applyStyles", () => {
  it("maps validated LMX presentation attributes to CSS properties", () => {
    expect(
      applyStyles({
        blockColor: "#ffffff",
        blockBorderRadius: "8",
        paddingTop: "12",
        textColor: "#111111",
        fontSize: "16",
        lineHeight: "150",
        align: "center"
      })
    ).toEqual({
      backgroundColor: "#ffffff",
      color: "#111111",
      borderRadius: "8px",
      paddingTop: "12px",
      fontSize: "16px",
      lineHeight: "150%",
      textAlign: "center"
    });
  });

  it("ignores unsafe values and can disable style application", () => {
    expect(
      applyStyles({
        blockColor: "red; background-image: url(javascript:alert(1))",
        paddingTop: "-1"
      })
    ).toEqual({});
    expect(applyStyles({ blockColor: "#fff" }, false)).toEqual({});
  });
});
