/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  try {
    const workspaces = app.findCollectionByNameOrId("workspaces");
    if (workspaces) {
      workspaces.listRule = "@request.auth.id != ''";
      workspaces.viewRule = "@request.auth.id != ''";
      workspaces.createRule = "@request.auth.id != '' && owner = @request.auth.id";
      workspaces.updateRule = "@request.auth.id != '' && owner = @request.auth.id";
      workspaces.deleteRule = "@request.auth.id != '' && owner = @request.auth.id";
      app.save(workspaces);
    }
  } catch (err) {
    console.error("1700000029 workspaces rules (up)", err);
  }

  try {
    const wm = app.findCollectionByNameOrId("workspace_members");
    if (wm) {
      wm.listRule = "@request.auth.id != '' && user = @request.auth.id";
      wm.viewRule = "@request.auth.id != '' && user = @request.auth.id";
      wm.createRule =
        "@request.auth.id != '' && (user = @request.auth.id || workspace.owner = @request.auth.id)";
      wm.updateRule =
        "@request.auth.id != '' && workspace.owner = @request.auth.id";
      wm.deleteRule =
        "@request.auth.id != '' && workspace.owner = @request.auth.id";
      app.save(wm);
    }
  } catch (err) {
    console.error("1700000029 workspace_members rules (up)", err);
  }
}, (app) => {});
