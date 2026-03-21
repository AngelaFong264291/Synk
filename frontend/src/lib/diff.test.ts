import { describe, expect, it } from "vitest";
import { buildLineDiff, getDiffStats } from "./diff";

describe("buildLineDiff", () => {
  it("marks added lines between snapshots", () => {
    const lines = buildLineDiff(
      "Goal: show one place\nFlow: create document",
      "Goal: show one place\nFlow: create document\nSuccess: explain ownership",
    );

    expect(lines.map((line) => line.kind)).toEqual([
      "unchanged",
      "unchanged",
      "added",
    ]);
    expect(lines[2]?.value).toMatch(/Success: explain ownership/i);
  });
});

describe("getDiffStats", () => {
  it("counts line changes for summaries", () => {
    const stats = getDiffStats(
      buildLineDiff("alpha\nbeta", "alpha\ngamma\nbeta"),
    );

    expect(stats).toEqual({
      added: 1,
      removed: 0,
      unchanged: 2,
    });
  });
});
