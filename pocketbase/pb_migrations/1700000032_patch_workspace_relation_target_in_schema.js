/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const workspaces = app.findCollectionByNameOrId("workspaces");
  if (!workspaces) {
    console.error("1700000032: workspaces collection missing");
    return;
  }

  const targetId = workspaces.id;
  const sql =
    "UPDATE _collections SET fields = replace(fields, " +
    "'\"collectionId\":\"teams_collection\"', " +
    "'\"collectionId\":\"" +
    targetId +
    "\"') " +
    "WHERE id IN ('synk_documents','synk_tasks','synk_decisions')";

  try {
    app.nonconcurrentDB().newQuery(sql).execute();
  } catch (err) {
    console.error("1700000032 SQL patch", err);
  }
}, () => {});
