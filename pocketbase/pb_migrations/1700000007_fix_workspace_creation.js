/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    try {
        const workspaces = app.findCollectionByNameOrId("workspaces");
        if (workspaces) {
            workspaces.createRule = "@request.auth.id != ''";
            app.save(workspaces);
        }
    } catch (err) {}

    try {
        const workspaceMembers = app.findCollectionByNameOrId("workspace_members");
        if (workspaceMembers) {
            workspaceMembers.createRule = "@request.auth.id != ''";
            app.save(workspaceMembers);
        }
    } catch (err) {}

}, (app) => {
});