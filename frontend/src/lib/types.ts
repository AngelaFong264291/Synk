export const collections = {
  users: "users",
  workspaces: "workspaces",
  workspaceMembers: "workspace_members",
  documents: "documents",
  documentVersions: "document_versions",
  tasks: "tasks",
  decisions: "decisions",
} as const;

export type CollectionName = (typeof collections)[keyof typeof collections];

export type ISODateString = string;

export type WorkspaceRole = "owner" | "editor" | "member";
export type DocumentVisibility = "workspace" | "private";
export type TaskStatus = "todo" | "in_progress" | "done";

export type BaseRecord = {
  id: string;
  collectionId: string;
  collectionName: CollectionName | string;
  created: ISODateString;
  updated: ISODateString;
};

export type UserRecord = BaseRecord & {
  email: string;
  name?: string;
};

export type WorkspaceRecord = BaseRecord & {
  name: string;
  inviteCode: string;
  owner: string;
  description?: string;
};

export type WorkspaceMemberRecord = BaseRecord & {
  workspace: string;
  user: string;
  role: WorkspaceRole;
};

export type WorkspaceMemberWithExpand = WorkspaceMemberRecord & {
  expand?: {
    workspace?: WorkspaceRecord;
    user?: UserRecord;
  };
};

export type DocumentRecord = BaseRecord & {
  workspace: string;
  title: string;
  currentContent: string;
  owner: string;
  visibility: DocumentVisibility;
  allowedMembers?: string[];
};

export type DocumentVersionRecord = BaseRecord & {
  document: string;
  versionName: string;
  content: string;
  author: string;
};

export type TaskRecord = BaseRecord & {
  workspace: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: ISODateString;
  status: TaskStatus;
  document?: string;
};

export type DecisionRecord = BaseRecord & {
  workspace: string;
  title: string;
  context: string;
  decision: string;
  owner: string;
  linkedTask?: string;
  linkedDocument?: string;
  decidedAt: ISODateString;
};

export type DashboardSnapshot = {
  workspace: WorkspaceRecord;
  members: WorkspaceMemberWithExpand[];
  tasks: TaskRecord[];
  recentVersions: DocumentVersionRecord[];
  recentDecisions: DecisionRecord[];
};
