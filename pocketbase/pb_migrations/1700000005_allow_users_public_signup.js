/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users) return;
    users.createRule = "";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users) return;
    users.createRule = null;
    app.save(users);
  },
);
