export const collections = {
  users: "users",
  teams: "teams",
  teamMembers: "team_members",
  teamInvites: "team_invites",
  workspaces: "workspaces",
  workspaceMembers: "workspace_members",
  workspaceCommits: "workspace_commits",
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
  inviteCode?: string;
  code?: string;
  owner: string;
  description?: string;
};

export type WorkspaceMemberRecord = BaseRecord & {
  workspace?: string;
  team?: string;
  user: string;
  role?: WorkspaceRole;
};

export type WorkspaceMemberWithExpand = WorkspaceMemberRecord & {
  expand?: {
    workspace?: WorkspaceRecord;
    team?: WorkspaceRecord;
    user?: UserRecord;
  };
};

export type DocumentRecordWithExpand = DocumentRecord & {
  expand?: {
    owner?: UserRecord;
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
  commit?: string;
};

export type WorkspaceCommitRecord = BaseRecord & {
  workspace: string;
  message: string;
  author: string;
};

export type WorkspaceCommitRecordWithExpand = WorkspaceCommitRecord & {
  expand?: {
    author?: UserRecord;
  };
};

export type DocumentVersionRecordWithExpand = DocumentVersionRecord & {
  expand?: {
    author?: UserRecord;
  };
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

export type TaskRecordWithExpand = TaskRecord & {
  expand?: {
    assignee?: UserRecord;
    document?: DocumentRecord;
  };
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

export type DecisionRecordWithExpand = DecisionRecord & {
  expand?: {
    owner?: UserRecord;
    linkedTask?: TaskRecord;
    linkedDocument?: DocumentRecord;
  };
};

export type DashboardSnapshot = {
  workspace: WorkspaceRecord;
  members: WorkspaceMemberWithExpand[];
  documents: DocumentRecordWithExpand[];
  tasks: TaskRecord[];
  recentVersions: DocumentVersionRecord[];
  recentDecisions: DecisionRecord[];
};
