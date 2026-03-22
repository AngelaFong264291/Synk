/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // When you deleted the `pb_data` directory, the SQLite database was recreated. 
    // Wait, the "workspaces" collection does not exist in the initial migrations!
    // The "workspaces" collection was probably manually created in the Admin UI previously,
    // and because we deleted the database, `workspaces` doesn't exist anymore!
    // Let's create the `workspaces` and all the other collections mentioned in the README.
    
    // We only create it if it doesn't exist
    let hasWorkspaces = false;
    try {
        if (app.findCollectionByNameOrId("workspaces")) {
            hasWorkspaces = true;
        }
    } catch(e) {}

    if (!hasWorkspaces) {
        const workspaces = new Collection({
            id: "workspaces_coll",
            name: "workspaces",
            type: "base",
            fields: [
                {
                    name: "name",
                    type: "text",
                    required: true
                },
                {
                    name: "description",
                    type: "editor"
                },
                {
                    name: "inviteCode",
                    type: "text"
                },
                {
                    name: "owner",
                    type: "relation",
                    required: true,
                    collectionId: "_pb_users_auth_",
                    maxSelect: 1
                }
            ],
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: ""
        });
        app.save(workspaces);
    }
    
    let hasWorkspaceMembers = false;
    try {
        if (app.findCollectionByNameOrId("workspace_members")) {
            hasWorkspaceMembers = true;
        }
    } catch(e) {}
    
    if (!hasWorkspaceMembers) {
        const workspaceMembers = new Collection({
            id: "workspace_members_coll",
            name: "workspace_members",
            type: "base",
            fields: [
                {
                    name: "workspace",
                    type: "relation",
                    required: true,
                    collectionId: "workspaces_coll",
                    maxSelect: 1
                },
                {
                    name: "user",
                    type: "relation",
                    required: true,
                    collectionId: "_pb_users_auth_",
                    maxSelect: 1
                },
                {
                    name: "role",
                    type: "select",
                    values: ["owner", "editor", "member"]
                }
            ],
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: ""
        });
        app.save(workspaceMembers);
    }
    
    // Create documents, document_versions, tasks, decisions
    const collections = [
        {
            id: "documents_coll",
            name: "documents",
            fields: [
                { name: "workspace", type: "relation", collectionId: "workspaces_coll", maxSelect: 1 },
                { name: "title", type: "text" },
                { name: "currentContent", type: "editor" },
                { name: "owner", type: "relation", collectionId: "_pb_users_auth_", maxSelect: 1 },
                { name: "visibility", type: "select", values: ["workspace", "private"] },
                { name: "allowedMembers", type: "relation", collectionId: "_pb_users_auth_", maxSelect: 0 }
            ]
        },
        {
            id: "document_versions_coll",
            name: "document_versions",
            fields: [
                { name: "document", type: "relation", collectionId: "documents_coll", maxSelect: 1 },
                { name: "versionName", type: "text" },
                { name: "content", type: "editor" },
                { name: "author", type: "relation", collectionId: "_pb_users_auth_", maxSelect: 1 }
            ]
        },
        {
            id: "tasks_coll",
            name: "tasks",
            fields: [
                { name: "workspace", type: "relation", collectionId: "workspaces_coll", maxSelect: 1 },
                { name: "title", type: "text" },
                { name: "description", type: "editor" },
                { name: "assignee", type: "relation", collectionId: "_pb_users_auth_", maxSelect: 1 },
                { name: "dueDate", type: "date" },
                { name: "status", type: "select", values: ["todo", "in_progress", "done"] },
                { name: "document", type: "relation", collectionId: "documents_coll", maxSelect: 1 }
            ]
        },
        {
            id: "decisions_coll",
            name: "decisions",
            fields: [
                { name: "workspace", type: "relation", collectionId: "workspaces_coll", maxSelect: 1 },
                { name: "title", type: "text" },
                { name: "context", type: "editor" },
                { name: "decision", type: "editor" },
                { name: "owner", type: "relation", collectionId: "_pb_users_auth_", maxSelect: 1 },
                { name: "linkedTask", type: "relation", collectionId: "tasks_coll", maxSelect: 1 },
                { name: "linkedDocument", type: "relation", collectionId: "documents_coll", maxSelect: 1 },
                { name: "decidedAt", type: "date" }
            ]
        }
    ];

    for (const c of collections) {
        try {
            if (!app.findCollectionByNameOrId(c.name)) {
                const coll = new Collection({
                    id: c.id,
                    name: c.name,
                    type: "base",
                    fields: c.fields,
                    listRule: "",
                    viewRule: "",
                    createRule: "",
                    updateRule: "",
                    deleteRule: ""
                });
                app.save(coll);
            }
        } catch(e) {
            const coll = new Collection({
                id: c.id,
                name: c.name,
                type: "base",
                fields: c.fields,
                listRule: "",
                viewRule: "",
                createRule: "",
                updateRule: "",
                deleteRule: ""
            });
            app.save(coll);
        }
    }
}, (app) => {
});