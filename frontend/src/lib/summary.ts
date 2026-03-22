import type { Decision, Document, Member, Task, Workspace } from "./demo-data";

type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  actor: string;
  timestamp: string;
  type: "version" | "decision" | "task";
};

type ContributorStat = {
  name: string;
  contributions: number;
  focus: string;
};

type DashboardSummaryInput = {
  workspace: Workspace;
  documents: Document[];
  tasks: Task[];
  decisions: Decision[];
  members: Member[];
};

export type DashboardSummary = {
  headline: string;
  narrative: string[];
  recentActivity: ActivityItem[];
  contributorStats: ContributorStat[];
  overdueTasks: Task[];
};

function statusLabel(status: Task["status"]) {
  if (status === "Done") {
    return "completed";
  }

  if (status === "In Progress") {
    return "moved into progress";
  }

  return "was queued";
}

function createActivityFeed(input: DashboardSummaryInput): ActivityItem[] {
  const versionActivity = input.documents.flatMap((document) =>
    document.versions.map((version) => ({
      id: `${document.id}-${version.id}`,
      label: version.label,
      detail: `${document.title} snapshot saved`,
      actor: version.author,
      timestamp: version.createdAt,
      type: "version" as const,
    })),
  );

  const decisionActivity = input.decisions.map((decision) => ({
    id: decision.id,
    label: decision.title,
    detail: decision.outcome,
    actor: decision.owner,
    timestamp: decision.date,
    type: "decision" as const,
  }));

  const taskActivity = input.tasks.map((task) => ({
    id: task.id,
    label: task.title,
    detail: `${task.assignee} ${statusLabel(task.status)}`,
    actor: task.assignee,
    timestamp: task.dueDate,
    type: "task" as const,
  }));

  return [...versionActivity, ...decisionActivity, ...taskActivity].slice(0, 8);
}

function createContributorStats(input: DashboardSummaryInput): ContributorStat[] {
  const scoreByName = new Map<string, number>();
  const focusByName = new Map<string, string>();

  for (const member of input.members) {
    scoreByName.set(member.name, 0);
    focusByName.set(member.name, member.role);
  }

  for (const document of input.documents) {
    for (const version of document.versions) {
      scoreByName.set(version.author, (scoreByName.get(version.author) ?? 0) + 1);
      focusByName.set(version.author, `Versions on ${document.title}`);
    }
  }

  for (const task of input.tasks) {
    scoreByName.set(task.assignee, (scoreByName.get(task.assignee) ?? 0) + 1);
    focusByName.set(task.assignee, `Tasks tied to ${task.linkedDocument}`);
  }

  for (const decision of input.decisions) {
    scoreByName.set(decision.owner, (scoreByName.get(decision.owner) ?? 0) + 1);
    focusByName.set(decision.owner, `Decision owner for ${decision.linkedTo}`);
  }

  return [...scoreByName.entries()]
    .map(([name, contributions]) => ({
      name,
      contributions,
      focus: focusByName.get(name) ?? "General collaboration",
    }))
    .sort((left, right) => right.contributions - left.contributions)
    .slice(0, 4);
}

function getOverdueTasks(tasks: Task[]) {
  return tasks.filter((task) => task.status !== "Done" && task.dueDate === "Today");
}

export function createDashboardSummary(
  input: DashboardSummaryInput,
): DashboardSummary {
  const openTasks = input.tasks.filter((task) => task.status !== "Done");
  const snapshots = input.documents.flatMap((document) => document.versions);
  const overdueTasks = getOverdueTasks(input.tasks);

  return {
    headline: `${input.workspace.name} has ${openTasks.length} open tasks, ${snapshots.length} named snapshots, and ${input.decisions.length} decisions recorded for the demo.`,
    narrative: [
      `${input.workspace.focus} is staying on track because the team can point to concrete version history, not just chat updates.`,
      overdueTasks.length
        ? `${overdueTasks.length} task${overdueTasks.length === 1 ? "" : "s"} need same-day attention before rehearsal.`
        : "No same-day tasks are blocked right now, so the team can focus on demo polish.",
      "The strongest story for judges is the handoff from document changes to task ownership to final decision log.",
    ],
    recentActivity: createActivityFeed(input),
    contributorStats: createContributorStats(input),
    overdueTasks,
  };
}
