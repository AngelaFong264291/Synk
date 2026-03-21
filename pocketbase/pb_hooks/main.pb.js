/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
    // Automatically create a team_members entry when a new team is created
    const team = e.record;
    
    const teamMembersCollection = $app.findCollectionByNameOrId("team_members");
    
    const record = new Record(teamMembersCollection, {
        "team": team.getId(),
        "user": team.get("owner")
    });
    
    $app.save(record);
    
    e.next();
}, "teams");

onRecordAfterCreateSuccess((e) => {
    // Send email when invite is created
    const invite = e.record;
    const email = invite.get("email");
    const inviterId = invite.get("inviter");
    const teamId = invite.get("team");
    
    console.log(`Processing team_invites creation for email: ${email}, inviter: ${inviterId}, team: ${teamId}`);
    
    let inviter;
    let team;
    
    try {
        inviter = $app.findRecordById("users", inviterId);
        team = $app.findRecordById("teams", teamId);
    } catch(err) {
        console.error(`Failed to find inviter or team: ${err}`);
        e.next();
        return;
    }
    
    try {
        const message = new MailerMessage({
            from: {
                address: $app.settings().meta.senderAddress || "noreply@example.com",
                name: $app.settings().meta.senderName || "Synk App",
            },
            to:      [{address: email}],
            subject: `You have been invited to join the team ${team.get("name")} on Synk`,
            html:    `<p>Hello,</p>
                      <p><b>${inviter.get("email")}</b> has invited you to join their team <b>${team.get("name")}</b> on Synk.</p>
                      <p>You can join by using the following team code:</p>
                      <h2 style="background: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px;">${team.get("code")}</h2>
                      <p>If you don't have an account yet, please sign up first.</p>`,
        });
        
        $app.newMailClient().send(message);
        console.log(`Successfully sent invite email to ${email}`);
    } catch (err) {
        console.error(`Failed to send invite email: ${err}`);
    }

    e.next();
}, "team_invites");