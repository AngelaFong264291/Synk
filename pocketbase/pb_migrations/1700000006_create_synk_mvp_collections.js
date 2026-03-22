/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    if (!users) {
      throw new Error("PocketBase auth collection 'users' is required");
    }

    const workspaces = new Collection({
      id: "synk_workspaces",
      name: "workspaces",
      type: "base",
      fields: [
        {
          id: "wrk_name",
          name: "name",
          type: "text",
          required: true,
          presentable: true,
        },
        {
          id: "wrk_desc",
          name: "description",
          type: "editor",
          required: false,
        },
        {
          id: "wrk_invite",
          name: "inviteCode",
          type: "text",
          required: true,
          presentable: true,
        },
        {
          id: "wrk_owner",
          name: "owner",
          type: "relation",
          required: true,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_workspaces_invite` ON `workspaces` (`inviteCode`)",
        "CREATE INDEX `idx_workspaces_owner` ON `workspaces` (`owner`)",
      ],
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });

    app.save(workspaces);

    const workspaceMembers = new Collection({
      id: "synk_wrk_members",
      name: "workspace_members",
      type: "base",
      fields: [
        {
          id: "wm_workspace",
          name: "workspace",
          type: "relation",
          required: true,
          collectionId: workspaces.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          id: "wm_user",
          name: "user",
          type: "relation",
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          id: "wm_role",
          name: "role",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["owner", "editor", "member"],
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_workspace_members_unique` ON `workspace_members` (`workspace`, `user`)",
        "CREATE INDEX `idx_workspace_members_user` ON `workspace_members` (`user`)",
      ],
      listRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      viewRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      createRule:
        "@request.auth.id != '' && (workspace.owner = @request.auth.id || user = @request.auth.id)",
      updateRule: "@request.auth.id != '' && workspace.owner = @request.auth.id",
      deleteRule: "@request.auth.id != '' && workspace.owner = @request.auth.id",
    });

    app.save(workspaceMembers);

    workspaces.listRule =
      "@request.auth.id != '' && workspace_members_via_workspace.user ?= @request.auth.id";
    workspaces.viewRule =
      "@request.auth.id != '' && workspace_members_via_workspace.user ?= @request.auth.id";
    workspaces.createRule = "@request.auth.id != '' && owner = @request.auth.id";
    workspaces.updateRule = "@request.auth.id != '' && owner = @request.auth.id";
    workspaces.deleteRule = "@request.auth.id != '' && owner = @request.auth.id";
    app.save(workspaces);

    const documents = new Collection({
      id: "synk_documents",
      name: "documents",
      type: "base",
      fields: [
        {
          id: "doc_workspace",
          name: "workspace",
          type: "relation",
          required: true,
          collectionId: workspaces.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          id: "doc_title",
          name: "title",
          type: "text",
          required: true,
          presentable: true,
        },
        {
          id: "doc_content",
          name: "currentContent",
          type: "editor",
          required: true,
        },
        {
          id: "doc_owner",
          name: "owner",
          type: "relation",
          required: true,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          id: "doc_visibility",
          name: "visibility",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["workspace", "private"],
        },
        {
          id: "doc_allowed",
          name: "allowedMembers",
          type: "relation",
          required: false,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 99,
        },
      ],
      indexes: [
        "CREATE INDEX `idx_documents_workspace` ON `documents` (`workspace`)",
        "CREATE INDEX `idx_documents_owner` ON `documents` (`owner`)",
      ],
      listRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id && (visibility = 'workspace' || owner = @request.auth.id || allowedMembers ?= @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id && (visibility = 'workspace' || owner = @request.auth.id || allowedMembers ?= @request.auth.id)",
      createRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id && owner = @request.auth.id",
      updateRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id && (owner = @request.auth.id || workspace.owner = @request.auth.id)",
      deleteRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id && (owner = @request.auth.id || workspace.owner = @request.auth.id)",
    });

    app.save(documents);

    const documentVersions = new Collection({
      id: "synk_doc_versions",
      name: "document_versions",
      type: "base",
      fields: [
        {
          id: "dv_document",
          name: "document",
          type: "relation",
          required: true,
          collectionId: documents.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          id: "dv_name",
          name: "versionName",
          type: "text",
          required: true,
          presentable: true,
        },
        {
          id: "dv_content",
          name: "content",
          type: "editor",
          required: true,
        },
        {
          id: "dv_author",
          name: "author",
          type: "relation",
          required: true,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
      ],
      indexes: [
        "CREATE INDEX `idx_document_versions_document` ON `document_versions` (`document`)",
        "CREATE INDEX `idx_document_versions_author` ON `document_versions` (`author`)",
      ],
      listRule:
        "@request.auth.id != '' && document.workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      viewRule:
        "@request.auth.id != '' && document.workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      createRule:
        "@request.auth.id != '' && document.workspace.workspace_members_via_workspace.user ?= @request.auth.id && author = @request.auth.id",
      updateRule:
        "@request.auth.id != '' && (author = @request.auth.id || document.workspace.owner = @request.auth.id)",
      deleteRule:
        "@request.auth.id != '' && (author = @request.auth.id || document.workspace.owner = @request.auth.id)",
    });

    app.save(documentVersions);

    const tasks = new Collection({
      id: "synk_tasks",
      name: "tasks",
      type: "base",
      fields: [
        {
          id: "task_workspace",
          name: "workspace",
          type: "relation",
          required: true,
          collectionId: workspaces.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          id: "task_title",
          name: "title",
          type: "text",
          required: true,
          presentable: true,
        },
        {
          id: "task_desc",
          name: "description",
          type: "editor",
          required: false,
        },
        {
          id: "task_assignee",
          name: "assignee",
          type: "relation",
          required: false,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          id: "task_due",
          name: "dueDate",
          type: "date",
          required: false,
        },
        {
          id: "task_status",
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["todo", "in_progress", "done"],
        },
        {
          id: "task_document",
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
      listRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      viewRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      createRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      updateRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      deleteRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
    });

    app.save(tasks);

    const decisions = new Collection({
      id: "synk_decisions",
      name: "decisions",
      type: "base",
      fields: [
        {
          id: "dec_workspace",
          name: "workspace",
          type: "relation",
          required: true,
          collectionId: workspaces.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          id: "dec_title",
          name: "title",
          type: "text",
          required: true,
          presentable: true,
        },
        {
          id: "dec_context",
          name: "context",
          type: "editor",
          required: true,
        },
        {
          id: "dec_decision",
          name: "decision",
          type: "editor",
          required: true,
        },
        {
          id: "dec_owner",
          name: "owner",
          type: "relation",
          required: true,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          id: "dec_task",
          name: "linkedTask",
          type: "relation",
          required: false,
          collectionId: tasks.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          id: "dec_doc",
          name: "linkedDocument",
          type: "relation",
          required: false,
          collectionId: documents.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          id: "dec_date",
          name: "decidedAt",
          type: "date",
          required: true,
        },
      ],
      indexes: [
        "CREATE INDEX `idx_decisions_workspace` ON `decisions` (`workspace`)",
        "CREATE INDEX `idx_decisions_owner` ON `decisions` (`owner`)",
        "CREATE INDEX `idx_decisions_decidedAt` ON `decisions` (`decidedAt`)",
      ],
      listRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      viewRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      createRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      updateRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
      deleteRule:
        "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
    });

    app.save(decisions);
  },
  (app) => {
    const names = [
      "decisions",
      "tasks",
      "document_versions",
      "documents",
      "workspace_members",
      "workspaces",
    ];

    for (const name of names) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {
        // Ignore missing collections during rollback.
      }
    }
  },
);
