/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const documentVersions = app.findCollectionByNameOrId("document_versions");
    const workspaceCommits = app.findCollectionByNameOrId("workspace_commits");

    if (!documentVersions || !workspaceCommits) {
      return;
    }

    if (documentVersions.fields.getByName("commit")) {
      return;
    }

    documentVersions.fields.add(
      new RelationField({
        id: "dv_commit",
        name: "commit",
        required: false,
        collectionId: workspaceCommits.id,
        cascadeDelete: false,
        maxSelect: 1,
      }),
    );

    try {
      documentVersions.addIndex(
        "idx_document_versions_commit",
        false,
        "commit",
        "",
      );
    } catch (_) {
      // Index may already exist.
    }

    app.save(documentVersions);
    app.reloadCachedCollections();
  },
  () => {
    // No safe rollback: existing rows may reference commits.
  },
);
