/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // Drop the redundant teams collections since we are switching entirely to workspaces.
    const toDrop = ["team_invites", "team_members", "teams"];
    
    for (const id of toDrop) {
        try {
            const coll = app.findCollectionByNameOrId(id);
            if (coll) {
                app.delete(coll);
            }
        } catch(e) {}
    }
}, (app) => {
});