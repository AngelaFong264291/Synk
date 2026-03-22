import {
  decisions as fallbackDecisions,
  documents as fallbackDocuments,
  getDocumentById,
  members as fallbackMembers,
  tasks as fallbackTasks,
  workspace as fallbackWorkspace,
  type Decision,
  type Document,
  type DocumentVersion,
  type Member,
  type Task,
  type Workspace,
} from "./demo-data";
import { getDocumentBundle, getWorkspaceDashboardBundle } from "./api";
import type {
  DecisionRecordWithExpand,
  DocumentRecordWithExpand,
  DocumentVersionRecordWithExpand,
  TaskRecordWithExpand,
  UserRecord,
  WorkspaceMemberWithExpand,
  WorkspaceRecord,
} from "./types";

export type DataSource = "live" | "demo";

export type DashboardViewModel = {
  source: DataSource;
  workspace: Workspace;
  members: Member[];
  documents: Document[];
  tasks: Task[];
  decisions: Decision[];
  error?: string;
};

export type DocumentDetailViewModel = {
  source: DataSource;
  document: Document;
};

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function displayName(user?: UserRecord | null) {
  if (!user) {
    return "Unknown workspace member";
  }

  return user.name?.trim() || user.email;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function inferDocumentStatus(versionCount: number) {
  return versionCount > 1 ? "Ready for review" : "In progress";
}

function inferTaskPriority(task: TaskRecordWithExpand): Task["priority"] {
  if (!task.dueDate) {
    return "Medium";
  }

  const due = new Date(task.dueDate);
  const now = new Date();

  if (!Number.isNaN(due.getTime()) && due <= now) {
    return "High";
  }

  return "Medium";
}

function mapWorkspace(
  workspace: WorkspaceRecord,
  memberCount: number,
): Workspace {
  return {
    id: workspace.id,
    name: workspace.name,
    inviteCode: workspace.inviteCode ?? workspace.code ?? "",
    focus: "Hackathon MVP",
    milestone: `${memberCount} collaborator${memberCount === 1 ? "" : "s"} active`,
  };
}

function mapMembers(members: WorkspaceMemberWithExpand[]): Member[] {
  return members.map((member) => {
    const name = displayName(member.expand?.user);

    return {
      id: member.id,
      name,
      role: titleCase(member.role ?? "member"),
      initials: initials(name),
    };
  });
}

function mapVersion(version: DocumentVersionRecordWithExpand): DocumentVersion {
  const authorName = displayName(version.expand?.author);

  return {
    id: version.id,
    label: version.versionName,
    author: authorName,
    createdAt: formatDateTime(version.created),
    summary: `Snapshot by ${authorName}`,
    content: version.content,
  };
}

function mapDocument(
  document: DocumentRecordWithExpand,
  versions: DocumentVersionRecordWithExpand[],
  linkedTasks: TaskRecordWithExpand[],
): Document {
  const contentPreview = document.currentContent.split("\n")[0]?.trim();
  const sortedVersions = [...versions].sort((left, right) =>
    left.created.localeCompare(right.created),
  );

  return {
    id: document.id,
    title: document.title,
    owner: displayName(document.expand?.owner),
    visibility: document.visibility === "private" ? "Private" : "Workspace",
    linkedTaskCount: linkedTasks.length,
    status: inferDocumentStatus(versions.length),
    updatedAt: formatDateTime(document.updated),
    excerpt: contentPreview || "Plain-text workspace document",
    versions: sortedVersions.map(mapVersion),
  };
}

function mapTask(task: TaskRecordWithExpand): Task {
  const statusMap = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
  } as const;

  return {
    id: task.id,
    title: task.title,
    assignee: displayName(task.expand?.assignee),
    dueDate: task.dueDate ? formatDate(task.dueDate) : "Unscheduled",
    status: statusMap[task.status],
    linkedDocument: task.expand?.document?.title ?? "General workspace task",
    priority: inferTaskPriority(task),
  };
}

function mapDecision(decision: DecisionRecordWithExpand): Decision {
  return {
    id: decision.id,
    title: decision.title,
    owner: displayName(decision.expand?.owner),
    date: formatDate(decision.decidedAt),
    context: decision.context,
    outcome: decision.decision,
    linkedTo:
      decision.expand?.linkedDocument?.title ??
      decision.expand?.linkedTask?.title ??
      "Workspace",
  };
}

export async function loadDashboardViewModel(
  workspaceId?: string,
): Promise<DashboardViewModel> {
  try {
    const bundle = await getWorkspaceDashboardBundle(workspaceId);
    const members = mapMembers(bundle.members);
    const documents = bundle.documents.map((document) => {
      const versionGroup =
        bundle.versionsByDocument.find(
          (entry) => entry.documentId === document.id,
        )?.versions ?? [];
      const linkedTasks = bundle.tasks.filter(
        (task) => task.document === document.id,
      );

      return mapDocument(document, versionGroup, linkedTasks);
    });

    return {
      source: "live",
      workspace: mapWorkspace(bundle.workspace, members.length),
      members,
      documents,
      tasks: bundle.tasks.map(mapTask),
      decisions: bundle.decisions.map(mapDecision),
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to load dashboard data";

    return {
      source: "demo",
      workspace: fallbackWorkspace,
      members: fallbackMembers,
      documents: fallbackDocuments,
      tasks: fallbackTasks,
      decisions: fallbackDecisions,
      error: message,
    };
  }
}

export async function loadDocumentDetailViewModel(
  documentId: string,
): Promise<DocumentDetailViewModel> {
  try {
    const bundle = await getDocumentBundle(documentId);
    const document = mapDocument(
      bundle.document,
      bundle.versions,
      bundle.linkedTasks,
    );

    return {
      source: "live",
      document,
    };
  } catch {
    return {
      source: "demo",
      document: getDocumentById(documentId),
    };
  }
}
