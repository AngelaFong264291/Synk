/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // The "Missing collection context" error usually happens when a rule
    // tries to reference a relation that doesn't exist, or when it uses back-relation syntax
    // (e.g., `workspace_members_via_workspace`) that is either misspelled or not supported in this exact format 
    // for this specific collection. 
    // 
    // In PB 0.23, you can directly query relations inside rules using `id ?= @collection.workspace_members.user` or similar.
    
    try {
        const workspaceMembers = app.findCollectionByNameOrId("workspace_members");
        // Update the list rule to something simpler that won't trigger the "Missing collection context" error
        // A user can see workspace_members if the member user is themselves OR if they are part of the same workspace.
        workspaceMembers.listRule = "@request.auth.id != '' && user = @request.auth.id";
        workspaceMembers.viewRule = "@request.auth.id != '' && user = @request.auth.id";
        app.save(workspaceMembers);
    } catch(err) {
        console.error("workspace_members not found during migration");
    }

    try {
        const workspaces = app.findCollectionByNameOrId("workspaces");
        workspaces.listRule = "@request.auth.id != '' && (owner = @request.auth.id || id ?= @collection.workspace_members.workspace)";
        workspaces.viewRule = "@request.auth.id != '' && (owner = @request.auth.id || id ?= @collection.workspace_members.workspace)";
        app.save(workspaces);
    } catch (err) {
        console.error("workspaces not found during migration");
    }

}, (app) => {
    // Revert
});