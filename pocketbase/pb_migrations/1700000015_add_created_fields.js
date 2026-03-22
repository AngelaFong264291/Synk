/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
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
                let hasCreated = false;
                let hasUpdated = false;
                
                for (const f of coll.fields) {
                    if (f.name === "created") hasCreated = true;
                    if (f.name === "updated") hasUpdated = true;
                }
                
                if (!hasCreated) {
                    coll.fields.push(new AutodateField({
                        name: "created",
                        onCreate: true,
                        onUpdate: false,
                        system: true
                    }));
                }
                
                if (!hasUpdated) {
                    coll.fields.push(new AutodateField({
                        name: "updated",
                        onCreate: true,
                        onUpdate: true,
                        system: true
                    }));
                }
                
                app.save(coll);
            }
        } catch (e) {
            console.log(`Failed to update ${name}`, e);
        }
    }
}, (app) => {
});