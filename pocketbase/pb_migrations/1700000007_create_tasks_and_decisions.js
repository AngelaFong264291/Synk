/// <reference path="../pb_data/types.d.ts" />

function findColl(app, name) {
  try {
    return app.findCollectionByNameOrId(name);
  } catch (e) {
    return null;
  }
}

migrate(
  (app) => {
    const users = findColl(app, "users");
    const workspaces = findColl(app, "workspaces");
    const documents = findColl(app, "documents");
    if (!users || !workspaces || !documents) {
      throw new Error("users, workspaces, and documents collections are required");
    }

    let tasks = findColl(app, "tasks");
    if (!tasks) {
      tasks = new Collection({
        id: "synk_tasks_coll",
        name: "tasks",
        type: "base",
        fields: [
          {
            hidden: false,
            id: "t_ws",
            name: "workspace",
            type: "relation",
            required: true,
            collectionId: workspaces.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "t_title",
            name: "title",
            type: "text",
            required: true,
            presentable: true,
          },
          {
            hidden: false,
            id: "t_desc",
            name: "description",
            type: "editor",
            required: false,
          },
          {
            hidden: false,
            id: "t_assignee",
            name: "assignee",
            type: "relation",
            required: false,
            collectionId: users.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "t_due",
            name: "dueDate",
            type: "date",
            required: false,
          },
          {
            hidden: false,
            id: "t_status",
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["todo", "in_progress", "done"],
          },
          {
            hidden: false,
            id: "t_doc",
            name: "document",
            type: "relation",
            required: false,
            collectionId: documents.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
        ],
        indexes: [
          "CREATE INDEX `idx_tasks_workspace` ON `tasks` (`workspace`)",
          "CREATE INDEX `idx_tasks_assignee` ON `tasks` (`assignee`)",
          "CREATE INDEX `idx_tasks_status` ON `tasks` (`status`)",
        ],
        listRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        viewRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        createRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        updateRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        deleteRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
      });
      app.save(tasks);
    }

    let decisions = findColl(app, "decisions");
    if (!decisions) {
      tasks = findColl(app, "tasks");
      decisions = new Collection({
        id: "synk_decisions_coll",
        name: "decisions",
        type: "base",
        fields: [
          {
            hidden: false,
            id: "d_ws",
            name: "workspace",
            type: "relation",
            required: true,
            collectionId: workspaces.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "d_title",
            name: "title",
            type: "text",
            required: true,
            presentable: true,
          },
          {
            hidden: false,
            id: "d_ctx",
            name: "context",
            type: "editor",
            required: true,
          },
          {
            hidden: false,
            id: "d_dec",
            name: "decision",
            type: "editor",
            required: true,
          },
          {
            hidden: false,
            id: "d_owner",
            name: "owner",
            type: "relation",
            required: true,
            collectionId: users.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "d_task",
            name: "linkedTask",
            type: "relation",
            required: false,
            collectionId: tasks.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "d_ldoc",
            name: "linkedDocument",
            type: "relation",
            required: false,
            collectionId: documents.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "d_at",
            name: "decidedAt",
            type: "date",
            required: true,
          },
        ],
        indexes: [
          "CREATE INDEX `idx_decisions_workspace` ON `decisions` (`workspace`)",
          "CREATE INDEX `idx_decisions_owner` ON `decisions` (`owner`)",
          "CREATE INDEX `idx_decisions_decided` ON `decisions` (`decidedAt`)",
        ],
        listRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        viewRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        createRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        updateRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        deleteRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
      });
      app.save(decisions);
    }
  },
  (app) => {
    const d = findColl(app, "decisions");
    if (d) {
      try {
        app.delete(d);
      } catch (e) {
        console.warn("1700000007 down: decisions", e);
      }
    }
    const t = findColl(app, "tasks");
    if (t) {
      try {
        app.delete(t);
      } catch (e) {
        console.warn("1700000007 down: tasks", e);
      }
    }
  },
);
