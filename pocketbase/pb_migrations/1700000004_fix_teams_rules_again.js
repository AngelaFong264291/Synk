/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // Make sure we allow users to add themselves to a team.
    const teamMembers = app.findCollectionByNameOrId("team_members");
    teamMembers.createRule = "@request.auth.id != '' && user = @request.auth.id";
    app.save(teamMembers);
}, (app) => {
    // Revert
});