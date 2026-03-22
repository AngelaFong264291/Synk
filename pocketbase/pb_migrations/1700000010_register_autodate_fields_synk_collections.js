/// <reference path="../pb_data/types.d.ts" />

const COLLECTIONS = [
  "workspaces",
  "workspace_members",
  "documents",
  "document_versions",
  "workspace_commits",
  "tasks",
  "decisions",
];

function randomFieldId() {
  return "autodate" + String(Math.floor(Math.random() * 1e10)).padStart(10, "0");
}

function autodateJson(name, onUpdate) {
  return {
    hidden: false,
    id: randomFieldId(),
    name: name,
    onCreate: true,
    onUpdate: onUpdate,
    presentable: false,
    system: false,
    type: "autodate",
  };
}

/** Parsed `fields` array as stored in `_collections.fields` (preserves `type`, etc.). */
function loadFieldsArray(app, collId) {
  const row = new DynamicModel({
    fields: "",
  });
  app
    .db()
    .newQuery("SELECT fields FROM _collections WHERE id = {:id}")
    .bind({ id: collId })
    .one(row);
  return JSON.parse(row.fields);
}

migrate((app) => {
  for (const collName of COLLECTIONS) {
    let coll;
    try {
      coll = app.findCollectionByNameOrId(collName);
    } catch (e) {
      continue;
    }
    if (!coll || coll.type !== "base") {
      continue;
    }

    const raw = loadFieldsArray(app, coll.id);
    const hasCreated = raw.some((f) => f && f.name === "created");
    const hasUpdated = raw.some((f) => f && f.name === "updated");
    if (hasCreated && hasUpdated) {
      continue;
    }

    const next = [...raw];
    if (!hasCreated) {
      next.push(autodateJson("created", false));
    }
    if (!hasUpdated) {
      next.push(autodateJson("updated", true));
    }

    const encoded = JSON.stringify(next);
    app
      .db()
      .newQuery(
        "UPDATE _collections SET fields = {:fields}, updated = strftime('%Y-%m-%d %H:%M:%fZ', 'now') WHERE id = {:id}",
      )
      .bind({ fields: encoded, id: coll.id })
      .execute();
  }

  app.reloadCachedCollections();
}, () => {});
