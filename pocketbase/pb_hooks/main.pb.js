/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
    // Automatically create a workspace_members entry when a new workspace is created
    const workspace = e.record;
    
    let workspaceMembersCollection;
    try {
        workspaceMembersCollection = $app.findCollectionByNameOrId("workspace_members");
    } catch(err) {
        return e.next();
    }
    
    if (workspaceMembersCollection) {
        const record = new Record(workspaceMembersCollection, {
            "workspace": workspace.id,
            "user": workspace.get("owner"),
            "role": "owner"
        });
        
        try {
            $app.save(record);
        } catch(err) {
            console.error("Failed to add owner to workspace_members:", err);
        }
    }
    
    e.next();
}, "workspaces");

onRecordAfterCreateSuccess((e) => {
    // Send email when invite is created
    const invite = e.record;
    const email = invite.get("email");
    const inviterId = invite.get("inviter");
    const workspaceId = invite.get("workspace");
    
    console.log(`Processing workspace_invites creation for email: ${email}, inviter: ${inviterId}, workspace: ${workspaceId}`);
    
    let inviter;
    let workspace;
    
    try {
        inviter = $app.findRecordById("users", inviterId);
        workspace = $app.findRecordById("workspaces", workspaceId);
    } catch(err) {
        console.error(`Failed to find inviter or workspace: ${err}`);
        return e.next();
    }
    
    try {
        const message = new MailerMessage({
            from: {
                address: $app.settings().meta.senderAddress || "noreply@example.com",
                name: $app.settings().meta.senderName || "Synk App",
            },
            to:      [{address: email}],
            subject: `You have been invited to join the workspace ${workspace.get("name")} on Synk`,
            html:    `<p>Hello,</p>
                      <p><b>${inviter.get("email")}</b> has invited you to join their workspace <b>${workspace.get("name")}</b> on Synk.</p>
                      <p>You can join by using the following workspace invite code:</p>
                      <h2 style="background: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px;">${workspace.get("inviteCode")}</h2>
                      <p>If you don't have an account yet, please sign up first.</p>`,
        });
        
        $app.newMailClient().send(message);
        console.log(`Successfully sent invite email to ${email}`);
    } catch (err) {
        console.error(`Failed to send invite email: ${err}`);
    }

    e.next();
}, "workspace_invites");