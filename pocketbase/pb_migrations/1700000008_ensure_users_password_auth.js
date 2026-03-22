/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users || users.type !== "auth") {
      return;
    }
    const prev = users.passwordAuth || {};
    users.passwordAuth = Object.assign({}, prev, {
      enabled: true,
      identityFields:
        prev.identityFields && prev.identityFields.length > 0
          ? prev.identityFields
          : ["email"],
    });
    app.save(users);
  },
  () => {},
);
