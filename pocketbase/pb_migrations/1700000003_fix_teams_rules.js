/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const teams = app.findCollectionByNameOrId("teams");
    teams.listRule = "@request.auth.id != ''";
    teams.viewRule = "@request.auth.id != ''";
    app.save(teams);

    const teamMembers = app.findCollectionByNameOrId("team_members");
    teamMembers.createRule = "@request.auth.id != '' && user = @request.auth.id";
    app.save(teamMembers);
}, (app) => {
});