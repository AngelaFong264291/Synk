/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const teams = new Collection({
        id: "teams_collection",
        name: "teams",
        type: "base",
        fields: [
            {
                hidden: false,
                id: "teams_name",
                name: "name",
                type: "text",
                required: true,
                presentable: true
            },
            {
                hidden: false,
                id: "teams_code",
                name: "code",
                type: "text",
                required: true,
                presentable: true
            },
            {
                hidden: false,
                id: "teams_owner",
                name: "owner",
                type: "relation",
                required: true,
                collectionId: "_pb_users_auth_",
                maxSelect: 1
            }
        ],
        indexes: [
            "CREATE UNIQUE INDEX `idx_teams_code` ON `teams` (`code`)"
        ],
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null
    });

    app.save(teams);

    const teamMembers = new Collection({
        id: "team_members_coll",
        name: "team_members",
        type: "base",
        fields: [
            {
                hidden: false,
                id: "tm_team",
                name: "team",
                type: "relation",
                required: true,
                collectionId: teams.id,
                cascadeDelete: true,
                maxSelect: 1
            },
            {
                hidden: false,
                id: "tm_user",
                name: "user",
                type: "relation",
                required: true,
                collectionId: "_pb_users_auth_",
                cascadeDelete: true,
                maxSelect: 1
            }
        ],
        indexes: [
            "CREATE UNIQUE INDEX `idx_team_members` ON `team_members` (`team`, `user`)"
        ],
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null
    });

    app.save(teamMembers);

    const teamInvites = new Collection({
        id: "team_invites_coll",
        name: "team_invites",
        type: "base",
        fields: [
            {
                hidden: false,
                id: "ti_email",
                name: "email",
                type: "email",
                required: true,
                presentable: true
            },
            {
                hidden: false,
                id: "ti_team",
                name: "team",
                type: "relation",
                required: true,
                collectionId: teams.id,
                cascadeDelete: true,
                maxSelect: 1
            },
            {
                hidden: false,
                id: "ti_inviter",
                name: "inviter",
                type: "relation",
                required: true,
                collectionId: "_pb_users_auth_",
                cascadeDelete: true,
                maxSelect: 1
            }
        ],
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null
    });

    app.save(teamInvites);

    // Using back-relation syntax
    // Ensure ANY authenticated user can view teams (so they can verify invite codes)
    teams.listRule = "@request.auth.id != ''";
    teams.viewRule = "@request.auth.id != ''";
    teams.createRule = "@request.auth.id != ''";
    teams.updateRule = "owner = @request.auth.id";
    teams.deleteRule = "owner = @request.auth.id";
    app.save(teams);

    teamMembers.listRule = "@request.auth.id != '' && user = @request.auth.id";
    teamMembers.viewRule = "@request.auth.id != '' && user = @request.auth.id";
    teamMembers.createRule = "@request.auth.id != '' && user = @request.auth.id";
    teamMembers.updateRule = "@request.auth.id != '' && user = @request.auth.id";
    teamMembers.deleteRule = "@request.auth.id != '' && user = @request.auth.id";
    app.save(teamMembers);

    teamInvites.listRule = "@request.auth.id != '' && (email = @request.auth.email || inviter = @request.auth.id)";
    teamInvites.viewRule = "@request.auth.id != '' && (email = @request.auth.email || inviter = @request.auth.id)";
    teamInvites.createRule = "@request.auth.id != '' && inviter = @request.auth.id";
    teamInvites.deleteRule = "@request.auth.id != '' && (email = @request.auth.email || inviter = @request.auth.id)";
    app.save(teamInvites);

}, (app) => {
    try { app.delete(app.findCollectionByNameOrId("team_invites_coll")); } catch(e) {}
    try { app.delete(app.findCollectionByNameOrId("team_members_coll")); } catch(e) {}
    try { app.delete(app.findCollectionByNameOrId("teams_collection")); } catch(e) {}
});