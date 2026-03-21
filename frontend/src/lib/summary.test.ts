import { describe, expect, it } from "vitest";
import { decisions, documents, members, tasks, workspace } from "./demo-data";
import { createDashboardSummary } from "./summary";

describe("createDashboardSummary", () => {
  it("builds a headline, activity feed, and contributor rollup", () => {
    const summary = createDashboardSummary({
      workspace,
      documents,
      tasks,
      decisions,
      members,
    });

    expect(summary.headline).toMatch(/open tasks/i);
    expect(summary.narrative).toHaveLength(3);
    expect(summary.recentActivity.length).toBeGreaterThan(0);
    expect(summary.contributorStats[0]?.contributions).toBeGreaterThan(0);
  });
});
