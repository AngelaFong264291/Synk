/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collectionsToFix = ["documents", "document_versions", "tasks", "decisions", "workspaces", "workspace_members", "teams", "team_members", "team_invites"];
    
    for (const name of collectionsToFix) {
        try {
            const coll = app.findCollectionByNameOrId(name);
            if (coll) {
                coll.listRule = "@request.auth.id != ''";
                coll.viewRule = "@request.auth.id != ''";
                coll.createRule = "@request.auth.id != ''";
                coll.updateRule = "@request.auth.id != ''";
                coll.deleteRule = "@request.auth.id != ''";
                app.save(coll);
            }
        } catch (err) {
            // Ignore missing collections
        }
    }
}, () => {
});