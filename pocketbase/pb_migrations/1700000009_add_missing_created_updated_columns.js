/// <reference path="../pb_data/types.d.ts" />

const TABLES = [
  "workspaces",
  "workspace_members",
  "documents",
  "document_versions",
  "workspace_commits",
  "tasks",
  "decisions",
];

function addColumnIfMissing(app, table, column) {
  const cols = app.tableColumns(table);
  if (!cols || cols.includes(column)) {
    return;
  }
  app
    .db()
    .newQuery(
      "ALTER TABLE `" +
        table +
        "` ADD COLUMN `" +
        column +
        "` TEXT NOT NULL DEFAULT ''",
    )
    .execute();
}

function backfillIfEmpty(app, table) {
  app
    .db()
    .newQuery(
      "UPDATE `" +
        table +
        "` SET `created` = strftime('%Y-%m-%d %H:%M:%f', 'now'), `updated` = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE `created` = '' OR `updated` = ''",
    )
    .execute();
}

migrate((app) => {
  for (const table of TABLES) {
    if (!app.hasTable(table)) {
      continue;
    }
    addColumnIfMissing(app, table, "created");
    addColumnIfMissing(app, table, "updated");
    backfillIfEmpty(app, table);
  }
  app.reloadCachedCollections();
}, () => {});
