/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // Looks like the `workspace_members` collection might be missing or corrupted 
    // when the PocketBase server restarted/started applying the new migrations.
    // Let's create it if it doesn't exist to prevent "Missing collection context" crashes.
    
    let exists = true;
    try {
        app.findCollectionByNameOrId("workspace_members");
    } catch(err) {
        exists = false;
    }
    
    if (!exists) {
        console.log("workspace_members not found. Recreating it to fix the missing context error.");
        
        let workspacesExists = true;
        let workspaces;
        try {
            workspaces = app.findCollectionByNameOrId("workspaces");
        } catch(e) {
            workspacesExists = false;
        }

        if (workspacesExists) {
            const wm = new Collection({
                id: "workspace_mem_coll",
                name: "workspace_members",
                type: "base",
                fields: [
                    {
                        name: "workspace",
                        type: "relation",
                        required: true,
                        collectionId: workspaces.id,
                        cascadeDelete: true,
                        maxSelect: 1
                    },
                    {
                        name: "user",
                        type: "relation",
                        required: true,
                        collectionId: "_pb_users_auth_",
                        cascadeDelete: true,
                        maxSelect: 1
                    },
                    {
                        name: "role",
                        type: "select",
                        required: true,
                        maxSelect: 1,
                        values: ["owner", "editor", "member"]
                    }
                ],
                indexes: [
                    "CREATE UNIQUE INDEX `idx_workspace_members` ON `workspace_members` (`workspace`, `user`)"
                ],
                listRule: "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
                viewRule: "@request.auth.id != '' && workspace.workspace_members_via_workspace.user ?= @request.auth.id",
                createRule: "@request.auth.id != '' && (workspace.owner = @request.auth.id || user = @request.auth.id)",
                updateRule: "@request.auth.id != '' && workspace.owner = @request.auth.id",
                deleteRule: "@request.auth.id != '' && workspace.owner = @request.auth.id"
            });
            app.save(wm);
        }
    }
}, (app) => {
    // Revert
});