/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users) return;
    // Allow sign-up from the web app (unauthenticated POST /api/collections/users/records)
    users.createRule = "true";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users) return;
    users.createRule = null;
    app.save(users);
  },
);
