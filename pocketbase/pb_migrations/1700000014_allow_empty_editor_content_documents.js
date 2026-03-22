/// <reference path="../pb_data/types.d.ts" />

/**
 * VC revert/change can restore or save an empty document. Editor fields were
 * required, so PocketBase returned "content: cannot be blank" / currentContent
 * validation errors when snapshot or payload was "".
 */
migrate(
  (app) => {
    const documents = app.findCollectionByNameOrId("documents");
    if (documents) {
      const currentContent = documents.fields.getByName("currentContent");
      if (currentContent && currentContent.required) {
        currentContent.required = false;
        app.save(documents);
      }
    }

    const documentVersions = app.findCollectionByNameOrId("document_versions");
    if (documentVersions) {
      const content = documentVersions.fields.getByName("content");
      if (content && content.required) {
        content.required = false;
        app.save(documentVersions);
      }
    }

    app.reloadCachedCollections();
  },
  () => {},
);
