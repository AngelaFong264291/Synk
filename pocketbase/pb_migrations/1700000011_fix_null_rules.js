/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collectionsToFix = ["workspaces", "workspace_members", "teams", "team_members", "team_invites", "documents", "document_versions", "tasks", "decisions"];
    
    for (const name of collectionsToFix) {
        try {
            const coll = app.findCollectionByNameOrId(name);
            if (coll) {
                coll.listRule = "";
                coll.viewRule = "";
                coll.createRule = "";
                coll.updateRule = "";
                coll.deleteRule = "";
                app.save(coll);
            }
        } catch (err) {
            // Ignore missing collections
        }
    }
}, (app) => {
});