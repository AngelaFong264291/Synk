import { ClientResponseError } from "pocketbase";
import { pb } from "./pocketbase";
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
  WorkspaceMemberWithExpand,
  WorkspaceRecord,
  WorkspaceRole,
} from "./types";

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
  file?: File;
  currentContent?: string;
  visibility?: "workspace" | "private";
  allowedMembers?: string[];
};

type UpdateDocumentInput = {
  title?: string;
  file?: File;
  currentContent?: string;
  visibility?: "workspace" | "private";
  allowedMembers?: string[];
};

export type CreateDocumentVersionInput = {
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

function formatPocketBaseFieldData(data: unknown): {
  summary: string | null;
  raw: string | null;
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { summary: null, raw: null };
  }

  const record = data as Record<string, unknown>;
  const parts: string[] = [];

  for (const [key, val] of Object.entries(record)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const msg = (val as { message?: string }).message;
      if (typeof msg === "string" && msg) {
        parts.push(`${key}: ${msg}`);
        continue;
      }
    }
    if (typeof val === "string" && val) {
      parts.push(`${key}: ${val}`);
    }
  }

  const summary = parts.length ? parts.join("; ") : null;
  const raw = Object.keys(record).length > 0 ? JSON.stringify(record) : null;
  return { summary, raw };
}

function formatPocketBaseRequestError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const response = error.response as Record<string, unknown> | undefined;
    const nestedData = response?.data;
    const { summary, raw } = formatPocketBaseFieldData(nestedData);
    const base = error.message || "Request failed";

    if (summary) {
      return `${base} (${summary})`;
    }

    const payload =
      response && typeof response === "object"
        ? JSON.stringify(response)
        : undefined;
    if (payload && payload !== "{}" && payload !== '{"data":{}}') {
      return `${base}: ${payload}`;
    }

    if (raw) {
      return `${base}: ${raw}`;
    }

    return base;
  }

  return error instanceof Error ? error.message : String(error);
}

/** Ensures the auth record still exists server-side (e.g. after pb_data reset). */
async function requireValidAuthSession() {
  if (!pb.authStore.token) {
    throw new Error("Authentication required");
  }

  try {
    await pb.collection(collections.users).authRefresh();
  } catch {
    pb.authStore.clear();
    throw new Error(
      "Your session is no longer valid (the server may have been reset). Please sign in again.",
    );
  }
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
    message.includes("not found") ||
    message.includes("wasn't found") ||
    message.includes("requested resource")
  );
}

function isNotFoundError(error: unknown) {
  return error instanceof ClientResponseError && error.status === 404;
}

async function getWorkspaceByInviteCode(inviteCode: string) {
  if (!pb.authStore.isValid || !pb.authStore.record) {
    throw new Error("Authentication required to look up an invite code.");
  }

  const normalizedCode = normalizeInviteCode(inviteCode);

  return pb
    .collection(collections.workspaces)
    .getFirstListItem<WorkspaceRecord>(
      pb.filter("inviteCode = {:inviteCode}", {
        inviteCode: normalizedCode,
      }),
    );
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

async function getOwnedWorkspace(workspaceId: string, userId: string) {
  try {
    const workspace = await pb
      .collection(collections.workspaces)
      .getOne<WorkspaceRecord>(workspaceId);
    return workspace.owner === userId ? workspace : null;
  } catch (error: unknown) {
    if (isNotFoundError(error) || isMissingCollectionError(error)) {
      return null;
    }

    throw error;
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
    user: user.id,
    role: "owner",
    expand: {
      workspace,
      user,
    },
  };
}

function getMembershipWorkspace(membership: WorkspaceMemberWithExpand) {
  return membership.expand?.workspace ?? null;
}

function getMembershipWorkspaceId(
  membership: WorkspaceMemberWithExpand,
): string | null {
  const raw = membership.workspace;
  if (typeof raw === "string") {
    return raw;
  }
  if (raw && typeof raw === "object" && "id" in raw) {
    return (raw as { id: string }).id;
  }
  return null;
}

async function getWorkspaceMembership(workspaceId: string, userId?: string) {
  const currentUser = userId ? null : requireCurrentUser();
  const currentUserId = userId ?? currentUser!.id;
  const ownedWorkspace = await getOwnedWorkspace(workspaceId, currentUserId);

  if (ownedWorkspace && ownedWorkspace.owner === currentUserId) {
    return createOwnerMembership(
      ownedWorkspace,
      currentUser ?? (await getUserById(currentUserId)),
    );
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

export async function signUp(input: SignUpInput) {
  return pb.collection(collections.users).create<UserRecord>({
    email: input.email,
    password: input.password,
    passwordConfirm: input.passwordConfirm,
    name: input.name,
  });
}

export async function signIn(email: string, password: string) {
  return pb
    .collection(collections.users)
    .authWithPassword<UserRecord>(email, password);
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
  let ownedWorkspaces: WorkspaceRecord[] = [];

  try {
    ownedWorkspaces = await pb
      .collection(collections.workspaces)
      .getFullList<WorkspaceRecord>({
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
      .collection(collections.workspaceMembers)
      .getFullList<WorkspaceMemberWithExpand>({
        filter: pb.filter("user = {:user}", { user: user.id }),
        sort: "id",
        expand: "workspace,user",
      });
  } catch (error: unknown) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }
    memberships = [];
  }

  const memberWorkspaces: WorkspaceRecord[] = [];

  for (const membership of memberships) {
    let workspace = getMembershipWorkspace(membership);

    if (!workspace) {
      const workspaceId = getMembershipWorkspaceId(membership);
      if (workspaceId) {
        try {
          workspace = await pb
            .collection(collections.workspaces)
            .getOne<WorkspaceRecord>(workspaceId);
        } catch {
          // expand/view rules can hide nested workspace; direct fetch may still work
        }
      }
    }

    if (workspace) {
      memberWorkspaces.push(workspace);
    }
  }

  return dedupeWorkspaces([...ownedWorkspaces, ...memberWorkspaces]);
}

export async function createWorkspace(input: CreateWorkspaceInput) {
  const user = requireCurrentUser();
  const normalizedCode = normalizeInviteCode(input.inviteCode);

  const name = input.name.trim();
  if (!name) {
    throw new Error("Workspace name is required.");
  }

  if (!normalizedCode) {
    throw new Error("Invite code is required.");
  }

  await requireValidAuthSession();

  const body: {
    name: string;
    owner: string;
    inviteCode: string;
    description?: string;
  } = {
    name,
    owner: user.id,
    inviteCode: normalizedCode,
  };

  const description = input.description?.trim();
  if (description) {
    body.description = description;
  }

  let workspace: WorkspaceRecord;

  try {
    workspace = await pb
      .collection(collections.workspaces)
      .create<WorkspaceRecord>(body);
  } catch (error: unknown) {
    const recovered = await recoverWorkspaceAfterCreateFailure(
      {
        ...input,
        name,
        inviteCode: normalizedCode,
      },
      user.id,
    );

    if (recovered) {
      return recovered;
    }

    throw new Error(formatPocketBaseRequestError(error));
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

  await requireValidAuthSession();

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
    return pb
      .collection(collections.workspaceMembers)
      .create<WorkspaceMemberWithExpand>({
        workspace: workspaceId,
        user: resolvedUserId,
        role,
      });
  }
}

export async function listWorkspaceMembers(workspaceId: string) {
  const currentUser = requireCurrentUser();
  const accessMembership = await getWorkspaceMembership(
    workspaceId,
    currentUser.id,
  );

  const members = await pb
    .collection(collections.workspaceMembers)
    .getFullList<WorkspaceMemberWithExpand>({
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

export async function getWorkspace(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  return pb
    .collection(collections.workspaces)
    .getOne<WorkspaceRecord>(workspaceId);
}

export async function listWorkspaceDocuments(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  return pb.collection(collections.documents).getFullList<DocumentRecord>({
    filter: pb.filter("workspace = {:workspace}", { workspace: workspaceId }),
    sort: "title",
  });
}

export async function listWorkspaceDocumentsWithExpand(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  return pb
    .collection(collections.documents)
    .getFullList<DocumentRecordWithExpand>({
      filter: pb.filter("workspace = {:workspace}", { workspace: workspaceId }),
      sort: "title",
      expand: "owner",
    });
}

const DEFAULT_DOCUMENT_CURRENT_CONTENT = "<p><br /></p>";

export async function createDocument(input: CreateDocumentInput) {
  const user = requireCurrentUser();
  // Ensure the workspace exists and the user has access.
  await getWorkspaceMembership(input.workspaceId);

  const formData = new FormData();
  formData.append("workspace", input.workspaceId);
  formData.append("title", input.title);
  formData.append(
    "currentContent",
    input.currentContent?.trim() || DEFAULT_DOCUMENT_CURRENT_CONTENT,
  );
  formData.append("owner", user.id);
  formData.append("visibility", input.visibility ?? "workspace");

  if (input.file) {
    formData.append("file", input.file);
  }

  if (input.allowedMembers) {
    input.allowedMembers.forEach((memberId) => {
      formData.append("allowedMembers", memberId);
    });
  }

  return pb.collection(collections.documents).create<DocumentRecord>(formData);
}

export async function updateDocument(
  documentId: string,
  input: UpdateDocumentInput,
) {
  const current = await pb
    .collection(collections.documents)
    .getOne<DocumentRecord>(documentId);

  await getWorkspaceMembership(current.workspace);

  const formData = new FormData();
  if (input.title !== undefined) formData.append("title", input.title);
  if (input.file !== undefined) formData.append("file", input.file);
  if (input.currentContent !== undefined) {
    formData.append("currentContent", input.currentContent);
  }
  if (input.visibility !== undefined)
    formData.append("visibility", input.visibility);
  if (input.allowedMembers !== undefined) {
    input.allowedMembers.forEach((memberId) => {
      formData.append("allowedMembers", memberId);
    });
  }

  return pb
    .collection(collections.documents)
    .update<DocumentRecord>(documentId, formData);
}

export async function listDocumentVersions(documentId: string) {
  const document = await pb
    .collection(collections.documents)
    .getOne<DocumentRecord>(documentId);

  await getWorkspaceMembership(document.workspace);

  return pb
    .collection(collections.documentVersions)
    .getFullList<DocumentVersionRecord>({
      filter: pb.filter("document = {:document}", { document: documentId }),
      sort: "-created",
    });
}

export async function listDocumentVersionsWithExpand(documentId: string) {
  const document = await pb
    .collection(collections.documents)
    .getOne<DocumentRecord>(documentId);

  await getWorkspaceMembership(document.workspace);

  return pb
    .collection(collections.documentVersions)
    .getFullList<DocumentVersionRecordWithExpand>({
      filter: pb.filter("document = {:document}", { document: documentId }),
      sort: "-created",
      expand: "author",
    });
}

export async function createDocumentVersion(input: CreateDocumentVersionInput) {
  const user = requireCurrentUser();
  const document = await pb
    .collection(collections.documents)
    .getOne<DocumentRecord>(input.documentId);

  await getWorkspaceMembership(document.workspace);

  const createdVersion = await pb
    .collection(collections.documentVersions)
    .create<DocumentVersionRecord>({
      document: document.id,
      versionName: input.versionName,
      content: input.content,
      author: user.id,
    });

  try {
    await updateDocument(document.id, { title: document.title });
    // Note: currentContent field was removed from CreateDocumentInput/UpdateDocumentInput
    return createdVersion;
  } catch (error: unknown) {
    try {
      await pb
        .collection(collections.documentVersions)
        .delete(createdVersion.id);
      await updateDocument(document.id, { title: document.title });
    } catch {
      // Best-effort rollback only; preserve the original error below.
    }

    throw error;
  }
}

export async function listWorkspaceTasks(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  return pb.collection(collections.tasks).getFullList<TaskRecord>({
    filter: pb.filter("workspace = {:workspace}", { workspace: workspaceId }),
    sort: "status,dueDate",
  });
}

export async function listWorkspaceTasksWithExpand(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  return pb.collection(collections.tasks).getFullList<TaskRecordWithExpand>({
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
    filter: pb.filter("workspace = {:workspace}", { workspace: workspaceId }),
    sort: "-decidedAt",
  });
}

export async function listWorkspaceDecisionsWithExpand(workspaceId: string) {
  await getWorkspaceMembership(workspaceId);

  return pb
    .collection(collections.decisions)
    .getFullList<DecisionRecordWithExpand>({
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
    .getOne<DocumentRecordWithExpand>(documentId, {
      expand: "owner",
    });

  await getWorkspaceMembership(document.workspace);

  const [versions, linkedTasks] = await Promise.all([
    listDocumentVersionsWithExpand(documentId),
    pb.collection(collections.tasks).getFullList<TaskRecordWithExpand>({
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
