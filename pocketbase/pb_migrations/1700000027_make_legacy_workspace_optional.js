/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const documents = app.findCollectionByNameOrId("documents");
    const legacyWorkspaceField = documents.fields.getByName("legacy_workspace");
    if (legacyWorkspaceField) {
        legacyWorkspaceField.required = false;
        app.save(documents);
    }

    const tasks = app.findCollectionByNameOrId("tasks");
    const legacyWorkspaceFieldTasks = tasks.fields.getByName("legacy_workspace");
    if (legacyWorkspaceFieldTasks) {
        legacyWorkspaceFieldTasks.required = false;
        app.save(tasks);
    }

    const decisions = app.findCollectionByNameOrId("decisions");
    const legacyWorkspaceFieldDecisions = decisions.fields.getByName("legacy_workspace");
    if (legacyWorkspaceFieldDecisions) {
        legacyWorkspaceFieldDecisions.required = false;
        app.save(decisions);
    }
}, (app) => {
})
