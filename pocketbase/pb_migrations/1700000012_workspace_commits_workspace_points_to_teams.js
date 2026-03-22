/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const teams = app.findCollectionByNameOrId("teams");
    let wc = app.findCollectionByNameOrId("workspace_commits");

    if (!teams || !wc) {
      return;
    }

    const workspaceField = wc.fields.getByName("workspace");
    if (workspaceField && workspaceField.collectionId === teams.id) {
      return;
    }

    if (workspaceField && workspaceField.collectionId !== teams.id) {
      try {
        wc.removeIndex("idx_workspace_commits_workspace");
      } catch (_) {
        // Index missing or already removed.
      }

      const authOnly = "@request.auth.id != ''";
      wc.listRule = authOnly;
      wc.viewRule = authOnly;
      wc.createRule = `${authOnly} && author = @request.auth.id`;
      wc.updateRule = authOnly;
      wc.deleteRule = authOnly;

      wc.fields.removeByName("workspace");
      app.save(wc);

      wc = app.findCollectionByNameOrId("workspace_commits");
      if (!wc) {
        return;
      }
    }

    if (!wc.fields.getByName("workspace")) {
      wc.fields.add(
        new RelationField({
          id: "wc_workspace_team",
          name: "workspace",
          required: true,
          collectionId: teams.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      );

      try {
        wc.addIndex("idx_workspace_commits_workspace", false, "workspace", "");
      } catch (_) {
        // Index may already exist.
      }

      const teamAccessRule =
        "@request.auth.id != '' && (workspace.owner = @request.auth.id || workspace.team_members_via_team.user ?= @request.auth.id)";

      wc.listRule = teamAccessRule;
      wc.viewRule = teamAccessRule;
      wc.createRule = teamAccessRule + " && author = @request.auth.id";
      wc.updateRule = teamAccessRule;
      wc.deleteRule = teamAccessRule;

      app.save(wc);
    }

    app.reloadCachedCollections();
  },
  () => {
    // No safe rollback.
  },
);
