/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    try {
        const teamMembers = app.findCollectionByNameOrId("team_members");
        if (teamMembers) {
            teamMembers.indexes = [];
            app.save(teamMembers);
        }
    } catch(e) {}

    try {
        const workspaceMembers = app.findCollectionByNameOrId("workspace_members");
        if (workspaceMembers) {
            workspaceMembers.indexes = [];
            app.save(workspaceMembers);
        }
    } catch(e) {}
    
    try {
        const teamInvites = app.findCollectionByNameOrId("team_invites");
        if (teamInvites) {
            teamInvites.indexes = [];
            app.save(teamInvites);
        }
    } catch(e) {}

}, (app) => {
});