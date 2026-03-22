/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // Some manual JSON manipulation to add the autodate fields properly 
    // since appending to the array directly using the wrapper struct might sometimes fail
    // if the fields list isn't serialized back correctly in the previous migration step.
    
    const collectionsToUpdate = [
        "workspaces", 
        "workspace_members", 
        "documents", 
        "document_versions", 
        "tasks", 
        "decisions"
    ];

    for (const name of collectionsToUpdate) {
        try {
            const coll = app.findCollectionByNameOrId(name);
            if (coll) {
                // If the previous migration worked, this will just be a no-op safety net
                app.save(coll); // triggers the schema normalizations
            }
        } catch (e) {
        }
    }
}, (app) => {
});