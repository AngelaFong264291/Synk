import { normalizeAuthEmail, pb } from "./pocketbase";
import { collections } from "./types";
import type {
  DashboardSnapshot,
  DecisionRecord,
  DecisionRecordWithExpand,
  DocumentRecord,
  DocumentRecordWithExpand,
  DocumentVersionRecord,
  DocumentVersionRecordWithExpand,
  TaskRecord,
  TaskRecordWithExpand,
  TaskStatus,
  UserRecord,
  WorkspaceCommitRecordWithExpand,
  WorkspaceMemberWithExpand,
  WorkspaceRecord,
  WorkspaceRole,
} from "./types";

/** Include `fields` so `expand` does not trim base system fields (`created`, `updated`). */
const DOCUMENT_WITH_OWNER_EXPAND = {
  expand: "owner",
  fields: "*",
};

const DOCUMENT_VERSION_WITH_AUTHOR_EXPAND = {
  expand: "author",
  fields: "*",
};

/** PocketBase caps list `perPage` at 500; the JS SDK `getFullList` default `batch` is 1000. */
const FULL_LIST_BATCH = 500;

type SignUpInput = {
  email: string;
  password: string;
  passwordConfirm: string;
  name?: string;
};

type CreateWorkspaceInput = {
  name: string;
  description?: string;
  inviteCode: string;
};

type CreateDocumentInput = {
  workspaceId: string;
  title: string;
  currentContent?: string;
  visibility?: "workspace" | "private";
  allowedMembers?: string[];
};

type UpdateDocumentInput = {
  title?: string;
  currentContent?: string;
  visibility?: "workspace" | "private";
  allowedMembers?: string[];
};

type CreateVersionInput = {
  documentId: string;
  versionName: string;
  content: string;
};

type CreateTaskInput = {
  workspaceId: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  status?: TaskStatus;
  document?: string;
};

type UpdateTaskInput = Partial<Omit<CreateTaskInput, "workspaceId">>;

type CreateDecisionInput = {
  workspaceId: string;
  title: string;
  context: string;
  decision: string;
  linkedTask?: string;
  linkedDocument?: string;
  decidedAt?: string;
};

export type VcChangeDocumentInput = {
  documentId: string;
  content: string;
  versionName?: string;
};

export type VcChangeInput = {
  workspaceId: string;
  message: string;
  documents: VcChangeDocumentInput[];
};

export type VcChangeResponse = {
  commit: { id: string };
  versions: Array<{
    id: string;
    document: string;
    versionName: string;
    content: string;
    author: string;
    commit: string;
    created: string;
  }>;
};

export type VcDiffDocument = {
  documentId: string;
  title: string;
  before: string;
  after: string;
};

export type VcDiffResponse = {
  workspaceId: string;
  fromCommit: string;
  toCommit: string;
  documents: VcDiffDocument[];
};

export type VcInfoChange = {
  documentId: string;
  title: string;
  versionId: string;
};

export type VcInfoResponse = {
  id: string;
  workspaceId: string;
  message: string;
  author: string;
  created: string;
  hash: string;
  changes: VcInfoChange[];
};

export type VcRevertResponse = {
  commit: { id: string };
  versions: Array<{
    id: string;
    document: string;
    versionName: string;
    commit: string;
  }>;
};

async function vcRequest<T>(path: string, init: RequestInit): Promise<T> {
  const base = pb.baseURL.replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  };
  const token = pb.authStore.token;
  if (token) {
    (headers as Record<string, string>).Authorization = token;
  }
  const res = await fetch(url, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? res.statusText);
  }
  return data as T;
}

export async function vcChange(
  input: VcChangeInput,
): Promise<VcChangeResponse> {
  requireCurrentUser();
  return vcRequest<VcChangeResponse>("/api/synk/vc/change", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function vcDiff(
  workspaceId: string,
  fromCommit: string,
  toCommit: string,
): Promise<VcDiffResponse> {
  requireCurrentUser();
  const params = new URLSearchParams({
    workspaceId,
    fromCommit,
    toCommit,
  });
  return vcRequest<VcDiffResponse>(`/api/synk/vc/diff?${params.toString()}`, {
    method: "GET",
  });
}

export async function vcInfo(commitId: string): Promise<VcInfoResponse> {
  requireCurrentUser();
  const params = new URLSearchParams({ commitId });
  return vcRequest<VcInfoResponse>(`/api/synk/vc/info?${params.toString()}`, {
    method: "GET",
  });
}

export async function vcRevert(
  workspaceId: string,
  commitId?: string,
): Promise<VcRevertResponse> {
  requireCurrentUser();
  return vcRequest<VcRevertResponse>("/api/synk/vc/revert", {
    method: "POST",
    body: JSON.stringify({ workspaceId, commitId }),
  });
}

function requireCurrentUser(): UserRecord {
  const record = pb.authStore.record;

  if (!pb.authStore.isValid || !record) {
    throw new Error("Authentication required");
  }

  return record as UserRecord;
}

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}

function dedupeWorkspaces(workspaces: WorkspaceRecord[]) {
  return [
    ...new Map(
      workspaces.map((workspace) => [workspace.id, workspace]),
    ).values(),
  ];
}

function isMissingCollectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("missing collection context") ||
    message.includes("missing or invalid collection context") ||
    message.includes("404") ||
    message.includes("not found")
  );
}

async function getWorkspaceByInviteCode(inviteCode: string) {
  const normalizedCode = normalizeInviteCode(inviteCode);

  try {
    return await pb
      .collection(collections.teams)
      .getFirstListItem<WorkspaceRecord>(
        pb.filter("code = {:inviteCode}", {
          inviteCode: normalizedCode,
        }),
      );
  } catch (error: unknown) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }

    return pb
      .collection(collections.workspaces)
      .getFirstListItem<WorkspaceRecord>(
        pb.filter("inviteCode = {:inviteCode}", {
          inviteCode: normalizedCode,
        }),
      );
  }
}

async function recoverWorkspaceAfterCreateFailure(
  input: CreateWorkspaceInput,
  ownerId: string,
) {
  try {
    const existing = await getWorkspaceByInviteCode(input.inviteCode);

    if (existing.owner === ownerId && existing.name === input.name) {
      return existing;
    }
  } catch {
    // If recovery lookup fails, preserve the original create error.
  }

  return null;
}

async function getOwnedTeam(workspaceId: string, userId: string) {
  try {
    const team = await pb
      .collection(collections.teams)
      .getOne<WorkspaceRecord>(workspaceId);
    return team.owner === userId ? team : null;
  } catch (error: unknown) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }

    return null;
  }
}

async function getOwnedWorkspace(workspaceId: string, userId: string) {
  try {
    const workspace = await pb
      .collection(collections.workspaces)
      .getOne<WorkspaceRecord>(workspaceId);
    return workspace.owner === userId ? workspace : null;
  } catch (error: unknown) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }

    return null;
  }
}

async function getUserById(userId: string) {
  return pb.collection(collections.users).getOne<UserRecord>(userId);
}

function createOwnerMembership(
  workspace: WorkspaceRecord,
  user: UserRecord,
): WorkspaceMemberWithExpand {
  return {
    id: `owner-${workspace.id}-${user.id}`,
    collectionId: "",
    collectionName: collections.workspaceMembers,
    created: workspace.created,
    updated: workspace.updated,
    workspace: workspace.id,
    team: workspace.id,
    user: user.id,
    role: "owner",
    expand: {
      workspace,
      team: workspace,
      user,
    },
  };
}

function getMembershipWorkspace(membership: WorkspaceMemberWithExpand) {
  return membership.expand?.workspace ?? membership.expand?.team ?? null;
}

async function getWorkspaceMembership(workspaceId: string, userId?: string) {
  const currentUser = userId ? null : requireCurrentUser();
  const currentUserId = userId ?? currentUser!.id;
  const ownedTeam = await getOwnedTeam(workspaceId, currentUserId);
  const ownedWorkspace = await getOwnedWorkspace(workspaceId, currentUserId);

  if (ownedTeam && ownedTeam.owner === currentUserId) {
    return createOwnerMembership(
      ownedTeam,
      currentUser ?? (await getUserById(currentUserId)),
    );
  }

  if (ownedWorkspace && ownedWorkspace.owner === currentUserId) {
    return createOwnerMembership(
      ownedWorkspace,
      currentUser ?? (await getUserById(currentUserId)),
    );
  }

  try {
    return await pb
      .collection(collections.teamMembers)
      .getFirstListItem<WorkspaceMemberWithExpand>(
        pb.filter("team = {:workspace} && user = {:user}", {
          workspace: workspaceId,
          user: currentUserId,
        }),
        {
          expand: "team,user",
        },
      );
  } catch (error: unknown) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }

    return pb
      .collection(collections.workspaceMembers)
      .getFirstListItem<WorkspaceMemberWithExpand>(
        pb.filter("workspace = {:workspace} && user = {:user}", {
          workspace: workspaceId,
          user: currentUserId,
        }),
        {
          expand: "workspace,user",
        },
      );
  }
}

export async function signUp(input: SignUpInput) {
  return pb.collection(collections.users).create<UserRecord>({
    email: normalizeAuthEmail(input.email),
    password: input.password,
    passwordConfirm: input.passwordConfirm,
    name: input.name,
  });
}

export async function signIn(email: string, password: string) {
  return pb
    .collection(collections.users)
    .authWithPassword<UserRecord>(normalizeAuthEmail(email), password);
}

export function signOut() {
  pb.authStore.clear();
}

export function getCurrentUser() {
  return pb.authStore.record as UserRecord | null;
}

export async function getDefaultWorkspace() {
  const workspaces = await listMyWorkspaces();
  return workspaces[0] ?? null;
}

export async function listMyWorkspaces() {
  const user = requireCurrentUser();
  let ownedTeams: WorkspaceRecord[] = [];
  let ownedWorkspaces: WorkspaceRecord[] = [];

  try {
    ownedTeams = await pb
      .collection(collections.teams)
      .getFullList<WorkspaceRecord>({
        batch: FULL_LIST_BATCH,
        filter: pb.filter("owner = {:user}", { user: user.id }),
        sort: "name",
      });
  } catch (error: unknown) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }
  }

  try {
    ownedWorkspaces = await pb
      .collection(collections.workspaces)
      .getFullList<WorkspaceRecord>({
        batch: FULL_LIST_BATCH,
        filter: pb.filter("owner = {:user}", { user: user.id }),
        sort: "name",
      });
  } catch (error: unknown) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }
  }

  let memberships: WorkspaceMemberWithExpand[];

  try {
    memberships = await pb
      .collection(collections.teamMembers)
      .getFullList<WorkspaceMemberWithExpand>({
        batch: FULL_LIST_BATCH,
        filter: pb.filter("user = {:user}", { user: user.id }),
        sort: "id",
        expand: "team,user",
      });
  } catch (error: unknown) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }

    memberships = await pb
      .collection(collections.workspaceMembers)
      .getFullList<WorkspaceMemberWithExpand>({
        batch: FULL_LIST_BATCH,
        filter: pb.filter("user = {:user}", { user: user.id }),
        sort: "id",
        expand: "workspace,user",
      });
  }

  const memberWorkspaces = memberships
    .map((membership) => getMembershipWorkspace(membership))
    .filter((workspace): workspace is WorkspaceRecord => Boolean(workspace));

  return dedupeWorkspaces([
    ...ownedTeams,
    ...ownedWorkspaces,
    ...memberWorkspaces,
  ]);
}

export async function createWorkspace(input: CreateWorkspaceInput) {
  const user = requireCurrentUser();
  const normalizedCode = normalizeInviteCode(input.inviteCode);

  try {
    const workspace = await pb
      .collection(collections.teams)
      .create<WorkspaceRecord>({
        name: input.name,
        owner: user.id,
        code: normalizedCode,
      });

    try {
      await ensureWorkspaceMembership(workspace.id, "owner", user.id);
    } catch {
      // Legacy teams owners can still access their workspace via ownership fallback.
    }
    return workspace;
  } catch (error: unknown) {
    const recovered = await recoverWorkspaceAfterCreateFailure(
      {
        ...input,
        inviteCode: normalizedCode,
      },
      user.id,
    );

    if (recovered) {
      return recovered;
    }

    if (!isMissingCollectionError(error)) {
      throw error;
    }
  }

  let workspace: WorkspaceRecord;

  try {
    workspace = await pb
      .collection(collections.workspaces)
      .create<WorkspaceRecord>({
        name: input.name,
        description: input.description,
        owner: user.id,
        inviteCode: normalizedCode,
      });
  } catch (error: unknown) {
    const recovered = await recoverWorkspaceAfterCreateFailure(
      {
        ...input,
        inviteCode: normalizedCode,
      },
      user.id,
    );

    if (recovered) {
      return recovered;
    }

    throw error;
  }

  try {
    await ensureWorkspaceMembership(workspace.id, "owner", user.id);
  } catch {
    // Owners can still access new workspaces via ownership fallback.
  }
  return workspace;
}

export async function joinWorkspaceByInviteCode(inviteCode: string) {
  const user = requireCurrentUser();
  const workspace = await getWorkspaceByInviteCode(inviteCode);
  await ensureWorkspaceMembership(workspace.id, "member", user.id);
  return workspace;
}

export async function ensureWorkspaceMembership(
  workspaceId: string,
  role: WorkspaceRole = "member",
  userId?: string,
) {
  const resolvedUserId = userId ?? requireCurrentUser().id;

  try {
    return await getWorkspaceMembership(workspaceId, resolvedUserId);
  } catch {
    try {
      return await pb
        .collection(collections.teamMembers)
        .create<WorkspaceMemberWithExpand>({
          team: workspaceId,
          user: resolvedUserId,
        });
    } catch (error: unknown) {
      if (!isMissingCollectionError(error)) {
        throw error;
      }

      return pb
        .collection(collections.workspaceMembers)
        .create<WorkspaceMemberWithExpand>({
          workspace: workspaceId,
          user: resolvedUserId,
          role,
        });
    }
  }
}

export async function listWorkspaceMembers(workspaceId: string) {
  const currentUser = requireCurrentUser();
  const accessMembership = await getWorkspaceMembership(
    workspaceId,
    currentUser.id,
  );

  try {
    const members = await pb
      .collection(collections.teamMembers)
      .getFullList<WorkspaceMemberWithExpand>({
        batch: FULL_LIST_BATCH,
        filter: pb.filter("team = {:workspace}", {
          workspace: workspaceId,
        }),
        sort: "id",
        expand: "user,team",
      });

    const ownerMembership =
      accessMembership.role === "owner" &&
      !members.some((member) => member.user === currentUser.id)
        ? [
            createOwnerMembership(
              getMembershipWorkspace(accessMembership) ??
                (await getWorkspace(workspaceId)),
              currentUser,
            ),
          ]
        : [];

    return [...ownerMembership, ...members];
  } catch (error: unknown) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }

    const members = await pb
      .collection(collections.workspaceMembers)
      .getFullList<WorkspaceMemberWithExpand>({
        batch: FULL_LIST_BATCH,
        filter: pb.filter("workspace = {:workspace}", {
          workspace: workspaceId,
        }),
        sort: "id",
        expand: "user,workspace",
      });

    const ownerMembership =
      accessMembership.role === "owner" &&
      !members.some((member) => member.user === currentUser.id)
        ? [
            createOwnerMembership(
              getMembershipWorkspace(accessMembership) ??
                (await getWorkspace(workspaceId)),
              currentUser,
            ),
          ]
        : [];

    return [...ownerMembership, ...members];
  }
}

export async function getWorkspace(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  try {
    return await pb
      .collection(collections.teams)
      .getOne<WorkspaceRecord>(workspaceId);
  } catch (error: unknown) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }

    return pb
      .collection(collections.workspaces)
      .getOne<WorkspaceRecord>(workspaceId);
  }
}

export async function listWorkspaceDocuments(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  const docs = await pb
    .collection(collections.documents)
    .getFullList<DocumentRecord>({
      batch: FULL_LIST_BATCH,
      filter: pb.filter("workspace = {:workspace}", { workspace: workspaceId }),
      sort: "title",
      fields: "*",
    });

  docs.sort((a, b) => {
    const bu = b.updated || b.created || "";
    const au = a.updated || a.created || "";
    return bu.localeCompare(au);
  });

  return docs;
}

export async function listWorkspaceDocumentsWithExpand(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  const docs = await pb
    .collection(collections.documents)
    .getFullList<DocumentRecordWithExpand>({
      batch: FULL_LIST_BATCH,
      filter: pb.filter("workspace = {:workspace}", { workspace: workspaceId }),
      sort: "title",
      ...DOCUMENT_WITH_OWNER_EXPAND,
    });

  docs.sort((a, b) => {
    const bu = b.updated || b.created || "";
    const au = a.updated || a.created || "";
    return bu.localeCompare(au);
  });

  return docs;
}

export async function getDocumentWithExpand(documentId: string) {
  const document = await pb
    .collection(collections.documents)
    .getOne<DocumentRecordWithExpand>(documentId, DOCUMENT_WITH_OWNER_EXPAND);

  await getWorkspaceMembership(document.workspace);

  return document;
}

export async function createDocument(input: CreateDocumentInput) {
  const user = requireCurrentUser();
  await getWorkspaceMembership(input.workspaceId);

  const created = await pb
    .collection(collections.documents)
    .create<DocumentRecord>({
      workspace: input.workspaceId,
      title: input.title,
      currentContent: input.currentContent ?? "",
      owner: user.id,
      visibility: input.visibility ?? "workspace",
      allowedMembers: input.allowedMembers ?? [],
    });

  return pb
    .collection(collections.documents)
    .getOne<DocumentRecordWithExpand>(created.id, DOCUMENT_WITH_OWNER_EXPAND);
}

export async function updateDocument(
  documentId: string,
  input: UpdateDocumentInput,
) {
  const current = await pb
    .collection(collections.documents)
    .getOne<DocumentRecord>(documentId);

  await getWorkspaceMembership(current.workspace);

  await pb
    .collection(collections.documents)
    .update<DocumentRecord>(documentId, input);

  return pb
    .collection(collections.documents)
    .getOne<DocumentRecordWithExpand>(documentId, DOCUMENT_WITH_OWNER_EXPAND);
}

export async function listDocumentVersions(documentId: string) {
  const document = await pb
    .collection(collections.documents)
    .getOne<DocumentRecord>(documentId);

  await getWorkspaceMembership(document.workspace);

  const versions = await pb
    .collection(collections.documentVersions)
    .getFullList<DocumentVersionRecord>({
      batch: FULL_LIST_BATCH,
      filter: pb.filter("document = {:document}", { document: documentId }),
    });

  versions.sort((a, b) => b.created.localeCompare(a.created));

  return versions;
}

export async function listDocumentVersionsWithExpand(documentId: string) {
  const document = await pb
    .collection(collections.documents)
    .getOne<DocumentRecord>(documentId);

  await getWorkspaceMembership(document.workspace);

  const versions = await pb
    .collection(collections.documentVersions)
    .getFullList<DocumentVersionRecordWithExpand>({
      batch: FULL_LIST_BATCH,
      filter: pb.filter("document = {:document}", { document: documentId }),
      ...DOCUMENT_VERSION_WITH_AUTHOR_EXPAND,
    });

  versions.sort((a, b) => b.created.localeCompare(a.created));

  return versions;
}

export async function createDocumentVersion(input: CreateVersionInput) {
  requireCurrentUser();
  const document = await pb
    .collection(collections.documents)
    .getOne<DocumentRecord>(input.documentId);

  await getWorkspaceMembership(document.workspace);

  const { versions } = await vcChange({
    workspaceId: document.workspace,
    message: input.versionName,
    documents: [
      {
        documentId: document.id,
        content: input.content,
        versionName: input.versionName,
      },
    ],
  });

  const created = versions[0];
  if (!created) {
    throw new Error("Version control API returned no versions");
  }

  return pb
    .collection(collections.documentVersions)
    .getOne<DocumentVersionRecordWithExpand>(
      created.id,
      DOCUMENT_VERSION_WITH_AUTHOR_EXPAND,
    );
}

export async function listWorkspaceCommits(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  const commits = await pb
    .collection(collections.workspaceCommits)
    .getFullList<WorkspaceCommitRecordWithExpand>({
      batch: FULL_LIST_BATCH,
      filter: pb.filter("workspace = {:workspace}", { workspace: workspaceId }),
      expand: "author",
    });

  commits.sort((a, b) => b.created.localeCompare(a.created));

  return commits;
}

export async function listWorkspaceTasks(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  return pb.collection(collections.tasks).getFullList<TaskRecord>({
    batch: FULL_LIST_BATCH,
    filter: pb.filter("workspace = {:workspace}", { workspace: workspaceId }),
    sort: "status,dueDate",
  });
}

export async function listWorkspaceTasksWithExpand(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  return pb.collection(collections.tasks).getFullList<TaskRecordWithExpand>({
    batch: FULL_LIST_BATCH,
    filter: pb.filter("workspace = {:workspace}", { workspace: workspaceId }),
    sort: "status,dueDate",
    expand: "assignee,document",
  });
}

export async function createTask(input: CreateTaskInput) {
  await getWorkspaceMembership(input.workspaceId);

  return pb.collection(collections.tasks).create<TaskRecord>({
    workspace: input.workspaceId,
    title: input.title,
    description: input.description,
    assignee: input.assignee,
    dueDate: input.dueDate,
    status: input.status ?? "todo",
    document: input.document,
  });
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const current = await pb
    .collection(collections.tasks)
    .getOne<TaskRecord>(taskId);
  await getWorkspaceMembership(current.workspace);

  return pb.collection(collections.tasks).update<TaskRecord>(taskId, input);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  return updateTask(taskId, { status });
}

export async function listWorkspaceDecisions(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  return pb.collection(collections.decisions).getFullList<DecisionRecord>({
    batch: FULL_LIST_BATCH,
    filter: pb.filter("workspace = {:workspace}", { workspace: workspaceId }),
    sort: "-decidedAt",
  });
}

export async function listWorkspaceDecisionsWithExpand(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  return pb
    .collection(collections.decisions)
    .getFullList<DecisionRecordWithExpand>({
      batch: FULL_LIST_BATCH,
      filter: pb.filter("workspace = {:workspace}", { workspace: workspaceId }),
      sort: "-decidedAt",
      expand: "owner,linkedTask,linkedDocument",
    });
}

export async function createDecision(input: CreateDecisionInput) {
  const user = requireCurrentUser();
  await getWorkspaceMembership(input.workspaceId);

  return pb.collection(collections.decisions).create<DecisionRecord>({
    workspace: input.workspaceId,
    title: input.title,
    context: input.context,
    decision: input.decision,
    owner: user.id,
    linkedTask: input.linkedTask,
    linkedDocument: input.linkedDocument,
    decidedAt: input.decidedAt ?? new Date().toISOString(),
  });
}

export async function getDashboardSnapshot(
  workspaceId: string,
): Promise<DashboardSnapshot> {
  await getWorkspaceMembership(workspaceId);

  const documents = await listWorkspaceDocumentsWithExpand(workspaceId);
  const documentIds = documents.map((document) => document.id);
  const recentVersions = documentIds.length
    ? (
        await Promise.all(
          documentIds.map((documentId) => listDocumentVersions(documentId)),
        )
      )
        .flat()
        .sort((left, right) => right.created.localeCompare(left.created))
    : [];

  const [workspace, members, tasks, recentDecisions] = await Promise.all([
    getWorkspace(workspaceId),
    listWorkspaceMembers(workspaceId),
    listWorkspaceTasks(workspaceId),
    listWorkspaceDecisions(workspaceId),
  ]);

  return {
    workspace,
    members,
    documents,
    tasks,
    recentVersions: recentVersions.slice(0, 10),
    recentDecisions: recentDecisions.slice(0, 10),
  };
}

export async function getDocumentBundle(documentId: string) {
  const document = await pb
    .collection(collections.documents)
    .getOne<DocumentRecordWithExpand>(documentId, DOCUMENT_WITH_OWNER_EXPAND);

  await getWorkspaceMembership(document.workspace);

  const [versions, linkedTasks] = await Promise.all([
    listDocumentVersionsWithExpand(documentId),
    pb.collection(collections.tasks).getFullList<TaskRecordWithExpand>({
      batch: FULL_LIST_BATCH,
      filter: pb.filter("document = {:document}", { document: documentId }),
      sort: "dueDate",
      expand: "assignee,document",
    }),
  ]);

  return {
    document,
    versions,
    linkedTasks,
  };
}

export async function getWorkspaceDashboardBundle(workspaceId?: string) {
  const targetWorkspace = workspaceId
    ? await getWorkspace(workspaceId)
    : await getDefaultWorkspace();

  if (!targetWorkspace) {
    throw new Error("No workspace found for current user");
  }

  const [members, documents, tasks, decisions] = await Promise.all([
    listWorkspaceMembers(targetWorkspace.id),
    listWorkspaceDocumentsWithExpand(targetWorkspace.id),
    listWorkspaceTasksWithExpand(targetWorkspace.id),
    listWorkspaceDecisionsWithExpand(targetWorkspace.id),
  ]);

  const versionsByDocument = await Promise.all(
    documents.map(async (document) => ({
      documentId: document.id,
      versions: await listDocumentVersionsWithExpand(document.id),
    })),
  );

  return {
    workspace: targetWorkspace,
    members,
    documents,
    tasks,
    decisions,
    versionsByDocument,
  };
}
