/// <reference path="../pb_data/types.d.ts" />

migrate(
  () => {
    // Superseded by 1700000032: PocketBase rejects changing relation `collectionId`
    // via the collection API after tables exist; 0032 patches `_collections.fields` with SQL.
  },
  () => {},
);
