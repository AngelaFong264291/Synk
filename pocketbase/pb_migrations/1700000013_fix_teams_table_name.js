/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // In our original schema for teams, we called the collection "teams" but we gave it the ID "teams_collection".
    // When PocketBase creates a table, it uses the ID or Name. But relations often link by Collection ID!
    // To ensure there are absolutely no problems with relations querying a collection ID, let's make sure
    // everything is clean.
    
    // Also, there might be a corrupted old collection named "teams" lingering in the DB 
    // that doesn't match the new structure if the migrations failed midway. Let's just create a completely fresh
    // table to start over cleanly.

    try {
        const oldTeams = app.findCollectionByNameOrId("teams");
        if (oldTeams) {
            // Just drop the old indexes to be safe.
            oldTeams.indexes = [];
            app.save(oldTeams);
        }
    } catch(e) {}

}, (app) => {
});