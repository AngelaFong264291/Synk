/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Update document_versions to store files instead of text content
    const documentVersions = app.findCollectionByNameOrId("document_versions");
    if (!documentVersions) {
      throw new Error("document_versions collection not found");
    }

    // Remove the old content field
    const contentField = documentVersions.fields.getByName("content");
    if (contentField) {
      documentVersions.fields.removeByName("content");
    }

    // Add file field to document_versions
    documentVersions.fields.add(new Field({
      name: "file",
      type: "file",
      required: true,
      maxSelect: 1,
      maxSize: 5242880, // 5MB
    }));

    // Update indexes
    documentVersions.indexes = [
      "CREATE INDEX `idx_document_versions_document` ON `document_versions` (`document`)",
      "CREATE INDEX `idx_document_versions_author` ON `document_versions` (`author`)",
    ];

    app.save(documentVersions);

    // Update documents collection to handle file versioning
    const documents = app.findCollectionByNameOrId("documents");
    if (!documents) {
      throw new Error("documents collection not found");
    }

    // Make the file field optional since versions will store the files
    const fileField = documents.fields.getByName("file");
    if (fileField) {
      fileField.required = false;
    }

    app.save(documents);
  },
  (app) => {
    // Rollback: restore content field and make file required again
    const documentVersions = app.findCollectionByNameOrId("document_versions");
    if (documentVersions) {
      const fileField = documentVersions.fields.getByName("file");
      if (fileField) {
        documentVersions.fields.removeByName("file");
      }

      documentVersions.fields.add(new Field({
        name: "content",
        type: "editor",
        required: true,
      }));

      app.save(documentVersions);
    }

    const documents = app.findCollectionByNameOrId("documents");
    if (documents) {
      const fileField = documents.fields.getByName("file");
      if (fileField) {
        fileField.required = true;
      }
      app.save(documents);
    }
  },
);
