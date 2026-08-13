import { describe, expect, it } from "vitest";
import { defaultWorkspaceName } from "./routers";

describe("workspace bootstrap contract", () => {
  it("derives a stable workspace name during the first authenticated app bootstrap", () => {
    expect(defaultWorkspaceName("Ada")).toBe("Ada Engineering Workspace");
    expect(defaultWorkspaceName(null)).toBe("My Engineering Workspace");
    expect(defaultWorkspaceName(undefined)).toBe("My Engineering Workspace");
  });
});
