/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  try {
    const workspaces = app.findCollectionByNameOrId("workspaces");
    if (workspaces) {
      workspaces.listRule = "@request.auth.id != ''";
      workspaces.viewRule = "@request.auth.id != ''";
      app.save(workspaces);
    }
  } catch (err) {
    console.error("1700000028_workspaces_allow_authenticated_read (up)", err);
  }
}, (app) => {
  // no-op down migration
});
