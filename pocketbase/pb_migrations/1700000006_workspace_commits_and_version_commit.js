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
    if (!users) {
      throw new Error("users collection missing");
    }

    let workspaces = findColl(app, "workspaces");
    if (!workspaces) {
      workspaces = new Collection({
        id: "synk_workspaces_coll",
        name: "workspaces",
        type: "base",
        fields: [
          {
            hidden: false,
            id: "ws_name",
            name: "name",
            type: "text",
            required: true,
            presentable: true,
          },
          {
            hidden: false,
            id: "ws_desc",
            name: "description",
            type: "editor",
            required: false,
          },
          {
            hidden: false,
            id: "ws_invite",
            name: "inviteCode",
            type: "text",
            required: true,
            presentable: true,
          },
          {
            hidden: false,
            id: "ws_owner",
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
        createRule: `@request.auth.id != "" && owner = @request.auth.id`,
        updateRule: `@request.auth.id != "" && owner = @request.auth.id`,
        deleteRule: `@request.auth.id != "" && owner = @request.auth.id`,
      });
      app.save(workspaces);
    }

    let workspaceMembers = findColl(app, "workspace_members");
    if (!workspaceMembers) {
      workspaceMembers = new Collection({
        id: "synk_workspace_members_coll",
        name: "workspace_members",
        type: "base",
        fields: [
          {
            hidden: false,
            id: "wm_ws",
            name: "workspace",
            type: "relation",
            required: true,
            collectionId: workspaces.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "wm_user",
            name: "user",
            type: "relation",
            required: true,
            collectionId: users.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "wm_role",
            name: "role",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["owner", "editor", "member"],
          },
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_workspace_members_pair` ON `workspace_members` (`workspace`, `user`)",
          "CREATE INDEX `idx_workspace_members_user` ON `workspace_members` (`user`)",
        ],
        listRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        viewRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        createRule: `@request.auth.id != "" && (workspace.owner = @request.auth.id || user = @request.auth.id)`,
        updateRule: `@request.auth.id != "" && workspace.owner = @request.auth.id`,
        deleteRule: `@request.auth.id != "" && workspace.owner = @request.auth.id`,
      });
      app.save(workspaceMembers);
    }

    workspaces = findColl(app, "workspaces");
    if (workspaces) {
      workspaces.listRule = `@request.auth.id != "" && workspace_members_via_workspace.user ?= @request.auth.id`;
      workspaces.viewRule = `@request.auth.id != "" && workspace_members_via_workspace.user ?= @request.auth.id`;
      app.save(workspaces);
    }

    let documents = findColl(app, "documents");
    if (!documents) {
      documents = new Collection({
        id: "synk_documents_coll",
        name: "documents",
        type: "base",
        fields: [
          {
            hidden: false,
            id: "doc_ws",
            name: "workspace",
            type: "relation",
            required: true,
            collectionId: workspaces.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "doc_title",
            name: "title",
            type: "text",
            required: true,
            presentable: true,
          },
          {
            hidden: false,
            id: "doc_content",
            name: "currentContent",
            type: "editor",
            required: true,
          },
          {
            hidden: false,
            id: "doc_owner",
            name: "owner",
            type: "relation",
            required: true,
            collectionId: users.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "doc_vis",
            name: "visibility",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["workspace", "private"],
          },
          {
            hidden: false,
            id: "doc_allowed",
            name: "allowedMembers",
            type: "relation",
            required: false,
            collectionId: users.id,
            cascadeDelete: false,
            maxSelect: 200,
          },
        ],
        indexes: [
          "CREATE INDEX `idx_documents_workspace` ON `documents` (`workspace`)",
          "CREATE INDEX `idx_documents_owner` ON `documents` (`owner`)",
        ],
        listRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id && (visibility = "workspace" || owner = @request.auth.id || allowedMembers ?= @request.auth.id)`,
        viewRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id && (visibility = "workspace" || owner = @request.auth.id || allowedMembers ?= @request.auth.id)`,
        createRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id && owner = @request.auth.id`,
        updateRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id && (owner = @request.auth.id || workspace.owner = @request.auth.id)`,
        deleteRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id && (owner = @request.auth.id || workspace.owner = @request.auth.id)`,
      });
      app.save(documents);
    }

    let documentVersions = findColl(app, "document_versions");
    if (!documentVersions) {
      documentVersions = new Collection({
        id: "synk_document_versions_coll",
        name: "document_versions",
        type: "base",
        fields: [
          {
            hidden: false,
            id: "dv_doc",
            name: "document",
            type: "relation",
            required: true,
            collectionId: documents.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "dv_name",
            name: "versionName",
            type: "text",
            required: true,
            presentable: true,
          },
          {
            hidden: false,
            id: "dv_content",
            name: "content",
            type: "editor",
            required: true,
          },
          {
            hidden: false,
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
        listRule: `@request.auth.id != "" && document.workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        viewRule: `@request.auth.id != "" && document.workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        createRule: `@request.auth.id != "" && document.workspace.workspace_members_via_workspace.user ?= @request.auth.id && author = @request.auth.id`,
        updateRule: `@request.auth.id != "" && (author = @request.auth.id || document.workspace.owner = @request.auth.id)`,
        deleteRule: `@request.auth.id != "" && (author = @request.auth.id || document.workspace.owner = @request.auth.id)`,
      });
      app.save(documentVersions);
    }

    let workspaceCommits = findColl(app, "workspace_commits");
    if (!workspaceCommits) {
      workspaceCommits = new Collection({
        id: "workspace_commits_coll",
        name: "workspace_commits",
        type: "base",
        fields: [
          {
            hidden: false,
            id: "wc_workspace",
            name: "workspace",
            type: "relation",
            required: true,
            collectionId: workspaces.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            hidden: false,
            id: "wc_message",
            name: "message",
            type: "text",
            required: true,
            presentable: true,
            min: 1,
            max: 500,
          },
          {
            hidden: false,
            id: "wc_author",
            name: "author",
            type: "relation",
            required: true,
            collectionId: users.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
        ],
        indexes: [
          "CREATE INDEX `idx_workspace_commits_workspace` ON `workspace_commits` (`workspace`)",
        ],
        listRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        viewRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        createRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id && author = @request.auth.id`,
        updateRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
        deleteRule: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`,
      });
      app.save(workspaceCommits);
    }

    documentVersions = findColl(app, "document_versions");
    workspaceCommits = findColl(app, "workspace_commits");
    if (!documentVersions || !workspaceCommits) {
      throw new Error("document_versions or workspace_commits missing after migration");
    }

    if (!documentVersions.fields.getByName("commit")) {
      documentVersions.fields.add(
        new RelationField({
          name: "commit",
          required: false,
          maxSelect: 1,
          collectionId: workspaceCommits.id,
          cascadeDelete: false,
        }),
      );
      documentVersions.addIndex("idx_document_versions_commit", false, "commit", "");
      app.save(documentVersions);
    }
  },
  (app) => {
    const docVersions = findColl(app, "document_versions");
    if (docVersions) {
      docVersions.fields.removeByName("commit");
      try {
        app.save(docVersions);
      } catch (err) {
        console.warn("1700000006 down: document_versions", err);
      }
    }

    try {
      const wc = findColl(app, "workspace_commits");
      if (wc) {
        app.delete(wc);
      }
    } catch (e) {
      console.warn("1700000006 down: workspace_commits", e);
    }
  },
);
