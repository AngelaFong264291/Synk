export type Member = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

export type Workspace = {
  id: string;
  name: string;
  inviteCode: string;
  focus: string;
  milestone: string;
};

export type DocumentVersion = {
  id: string;
  label: string;
  author: string;
  createdAt: string;
  summary: string;
  content: string;
};

export type Document = {
  id: string;
  title: string;
  owner: string;
  visibility: "Workspace" | "Private";
  linkedTaskCount: number;
  status: string;
  updatedAt: string;
  excerpt: string;
  versions: DocumentVersion[];
};

export type TaskStatus = "To Do" | "In Progress" | "Done";

export type Task = {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: TaskStatus;
  linkedDocument: string;
  priority: "High" | "Medium" | "Low";
};

export type Decision = {
  id: string;
  title: string;
  owner: string;
  date: string;
  context: string;
  outcome: string;
  linkedTo: string;
};

export const workspace: Workspace = {
  id: "studio-launch",
  name: "Studio Launch",
  inviteCode: "SYNK-24A",
  focus: "Hackathon MVP",
  milestone: "Demo rehearsal tonight at 7:00 PM",
};

export const members: Member[] = [
  { id: "m1", name: "Ramona", role: "PM / UI", initials: "RK" },
  { id: "m2", name: "Angelina", role: "Backend", initials: "AZ" },
  { id: "m3", name: "Angela", role: "Frontend", initials: "AN" },
  { id: "m4", name: "Benjamin", role: "AI / Data", initials: "BL" },
];

export const documents: Document[] = [
  {
    id: "doc-prd",
    title: "MVP Narrative",
    owner: "Ramona",
    visibility: "Workspace",
    linkedTaskCount: 3,
    status: "Ready for review",
    updatedAt: "10 minutes ago",
    excerpt:
      "Narrative for the demo journey from workspace onboarding to decision log and summary.",
    versions: [
      {
        id: "v1",
        label: "Kickoff scope",
        author: "Ramona",
        createdAt: "Mar 21, 9:10 AM",
        summary: "Initial outline for the hackathon flow.",
        content:
          "Goal: show one place where teams track changes, tasks, and decisions.\nFlow: sign in, open workspace, create document, save version, create task, log decision.",
      },
      {
        id: "v2",
        label: "Demo script",
        author: "Angela",
        createdAt: "Mar 21, 1:45 PM",
        summary: "Expanded the story with ownership and summary moments.",
        content:
          "Goal: show one place where teams track changes, tasks, and decisions.\nFlow: sign in, join workspace, create document, save named version, compare diff, create task, log decision, show dashboard summary.\nSuccess: every teammate can explain who changed what and why.",
      },
    ],
  },
  {
    id: "doc-pitch",
    title: "Pitch Deck Copy",
    owner: "Benjamin",
    visibility: "Workspace",
    linkedTaskCount: 2,
    status: "In progress",
    updatedAt: "42 minutes ago",
    excerpt:
      "Talk track for the pain point, solution framing, and live demo handoff.",
    versions: [
      {
        id: "v1",
        label: "Talking points",
        author: "Benjamin",
        createdAt: "Mar 21, 11:20 AM",
        summary: "Rough bullets for problem and market.",
        content:
          "Problem: teams lose context.\nSolution: Synk creates one shared audit trail.\nProof: show tasks, versions, and decisions in one place.",
      },
    ],
  },
];

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Wire real auth to workspace dashboard",
    assignee: "Angela",
    dueDate: "Today",
    status: "In Progress",
    linkedDocument: "MVP Narrative",
    priority: "High",
  },
  {
    id: "t2",
    title: "Create PocketBase collections and rules",
    assignee: "Angelina",
    dueDate: "Today",
    status: "To Do",
    linkedDocument: "Pitch Deck Copy",
    priority: "High",
  },
  {
    id: "t3",
    title: "Generate natural language changelog",
    assignee: "Benjamin",
    dueDate: "Tonight",
    status: "To Do",
    linkedDocument: "MVP Narrative",
    priority: "Medium",
  },
  {
    id: "t4",
    title: "Finalize demo script",
    assignee: "Ramona",
    dueDate: "Tonight",
    status: "Done",
    linkedDocument: "MVP Narrative",
    priority: "Low",
  },
];

export const decisions: Decision[] = [
  {
    id: "d1",
    title: "Use PocketBase for auth + data",
    owner: "Angelina",
    date: "Mar 21",
    context: "Needed a fast backend with auth and admin UI for the hackathon.",
    outcome: "PocketBase powers auth, records, and demo-friendly admin access.",
    linkedTo: "Workspace setup",
  },
  {
    id: "d2",
    title: "Keep diff MVP plain text",
    owner: "Benjamin",
    date: "Mar 21",
    context:
      "Rich text diff would slow down the build and complicate the demo.",
    outcome: "Ship named snapshots and a clean text comparison view first.",
    linkedTo: "MVP Narrative",
  },
];

export function getDocumentById(documentId: string) {
  return (
    documents.find((document) => document.id === documentId) ?? documents[0]
  );
}
