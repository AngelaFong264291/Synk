/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // We already have workspaces and workspace_members.
    // We need workspace_invites to replace team_invites.

    try {
        if (!app.findCollectionByNameOrId("workspace_invites")) {
            const workspaceInvites = new Collection({
                id: "workspace_invites_coll",
                name: "workspace_invites",
                type: "base",
                fields: [
                    {
                        name: "email",
                        type: "email",
                        required: true,
                        presentable: true
                    },
                    {
                        name: "workspace",
                        type: "relation",
                        required: true,
                        collectionId: "workspaces_coll",
                        cascadeDelete: true,
                        maxSelect: 1
                    },
                    {
                        name: "inviter",
                        type: "relation",
                        required: true,
                        collectionId: "_pb_users_auth_",
                        cascadeDelete: true,
                        maxSelect: 1
                    },
                    {
                        name: "created",
                        type: "autodate",
                        onCreate: true,
                        onUpdate: false,
                        system: true
                    },
                    {
                        name: "updated",
                        type: "autodate",
                        onCreate: true,
                        onUpdate: true,
                        system: true
                    }
                ],
                listRule: "",
                viewRule: "",
                createRule: "",
                updateRule: "",
                deleteRule: ""
            });

            app.save(workspaceInvites);
        }
    } catch(e) {}

}, (app) => {
    try { app.delete(app.findCollectionByNameOrId("workspace_invites_coll")); } catch(e) {}
});