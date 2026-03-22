/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collectionsToLoosen = ["workspaces", "documents", "document_versions", "tasks", "decisions"];
    for (const name of collectionsToLoosen) {
        try {
            const coll = app.findCollectionByNameOrId(name);
            if (coll) {
                coll.createRule = "@request.auth.id != ''";
                app.save(coll);
            }
        } catch(e) {
            // Ignore missing collections
        }
    }
}, (app) => {
});