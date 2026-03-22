/// <reference path="../pb_data/types.d.ts" />

$app.store().set("synk_vc", {
  vcJsonError: function (e, status, message) {
    return e.json(status, { message: message });
  },

  saveWithRequest: function (e, txApp, model) {
    var ctx = e.request ? e.request.context() : null;
    if (!ctx) {
      throw new Error("Missing HTTP request context");
    }
    txApp.saveWithContext(ctx, model);
  },

  getMembership: function (app, workspaceId, userId) {
    try {
      var team = app.findRecordById("teams", workspaceId);
      if (team && team.get("owner") === userId) {
        return team;
      }
    } catch (err) {
      // Not a team id, or record missing — try membership tables.
    }
    try {
      return app.findFirstRecordByFilter(
        "team_members",
        "team = {:w} && user = {:u}",
        { w: workspaceId, u: userId },
      );
    } catch (err) {
      // no row
    }
    try {
      return app.findFirstRecordByFilter(
        "workspace_members",
        "workspace = {:w} && user = {:u}",
        { w: workspaceId, u: userId },
      );
    } catch (err) {
      return null;
    }
  },

  canAccessDocument: function (auth, doc) {
    var owner = doc.get("owner");
    if (owner === auth.id) {
      return true;
    }
    var vis = doc.get("visibility");
    if (vis === "workspace") {
      return true;
    }
    var members = doc.get("allowedMembers");
    if (!members) {
      return false;
    }
    for (var i = 0; i < members.length; i++) {
      if (members[i] === auth.id) {
        return true;
      }
    }
    return false;
  },

  getSnapshotContent: function (app, documentId, commitRecord) {
    var commitId = commitRecord.id;
    var rowsExact = app.findRecordsByFilter(
      "document_versions",
      "document = {:d} && commit = {:c}",
      "",
      1,
      0,
      { d: documentId, c: commitId },
    );
    if (rowsExact && rowsExact.length > 0) {
      return String(rowsExact[0].get("content") ?? "");
    }
    var t = commitRecord.get("created");
    var rowsBefore = app.findRecordsByFilter(
      "document_versions",
      "document = {:d} && created <= {:t}",
      "-created",
      1,
      0,
      { d: documentId, t: t },
    );
    if (rowsBefore && rowsBefore.length > 0) {
      return String(rowsBefore[0].get("content") ?? "");
    }
    return "";
  },
});

routerAdd(
  "POST",
  "/api/synk/vc/change",
  (e) => {
    var vc = $app.store().get("synk_vc");
    if (!vc) {
      return e.json(500, { message: "VC helpers not initialized" });
    }
    const auth = e.auth;
    if (!auth) {
      return vc.vcJsonError(e, 401, "Unauthorized");
    }
    const raw = toString(e.request.body);
    if (!raw || raw.length === 0) {
      return vc.vcJsonError(e, 400, "Empty body");
    }
    if (raw.length > 600000) {
      return vc.vcJsonError(e, 413, "Payload too large");
    }
    let body;
    try {
      body = JSON.parse(raw);
    } catch (err) {
      return vc.vcJsonError(e, 400, "Invalid JSON");
    }
    const workspaceId = body.workspaceId;
    const message = body.message;
    const docs = body.documents;
    if (!workspaceId || !message) {
      return vc.vcJsonError(e, 400, "workspaceId and message are required");
    }
    if (!Array.isArray(docs) || docs.length === 0) {
      return vc.vcJsonError(e, 400, "documents must be a non-empty array");
    }
    if (docs.length > 50) {
      return vc.vcJsonError(e, 400, "Too many documents in one batch");
    }
    const membership = vc.getMembership($app, workspaceId, auth.id);
    if (!membership) {
      return vc.vcJsonError(e, 403, "Forbidden");
    }

    const outCommit = { id: "" };
    const outVersions = [];

    try {
      $app.runInTransaction((txApp) => {
        const wcColl = txApp.findCollectionByNameOrId("workspace_commits");
        const dvColl = txApp.findCollectionByNameOrId("document_versions");
        const commitRecord = new Record(wcColl);
        commitRecord.set("workspace", workspaceId);
        commitRecord.set("message", String(message));
        commitRecord.set("author", auth.id);
        vc.saveWithRequest(e, txApp, commitRecord);
        outCommit.id = commitRecord.id;

        for (let i = 0; i < docs.length; i++) {
          const entry = docs[i];
          const documentId = entry.documentId;
          const content = entry.content;
          if (!documentId || content === undefined || content === null) {
            throw new Error("Each document needs documentId and content");
          }
          const versionName =
            entry.versionName !== undefined && entry.versionName !== null
              ? String(entry.versionName)
              : String(message);
          const doc = txApp.findRecordById("documents", documentId);
          if (doc.get("workspace") !== workspaceId) {
            throw new Error("Document does not belong to workspace");
          }
          if (!vc.canAccessDocument(auth, doc)) {
            throw new Error("Forbidden for document " + documentId);
          }
          const dv = new Record(dvColl);
          dv.set("document", documentId);
          dv.set("versionName", versionName);
          dv.set("content", String(content));
          dv.set("author", auth.id);
          dv.set("commit", commitRecord.id);
          vc.saveWithRequest(e, txApp, dv);
          doc.set("currentContent", String(content));
          vc.saveWithRequest(e, txApp, doc);
          outVersions.push({
            id: dv.id,
            document: documentId,
            versionName: versionName,
            content: String(content),
            author: auth.id,
            commit: commitRecord.id,
            created: dv.get("created"),
          });
        }
      });
    } catch (err) {
      return vc.vcJsonError(e, 400, String(err && err.message ? err.message : err));
    }

    return e.json(200, {
      commit: { id: outCommit.id },
      versions: outVersions,
    });
  },
  $apis.requireAuth(),
);

routerAdd(
  "GET",
  "/api/synk/vc/diff",
  (e) => {
    var vc = $app.store().get("synk_vc");
    if (!vc) {
      return e.json(500, { message: "VC helpers not initialized" });
    }
    const auth = e.auth;
    if (!auth) {
      return vc.vcJsonError(e, 401, "Unauthorized");
    }
    const workspaceId = e.request.url.query().get("workspaceId");
    const fromId = e.request.url.query().get("fromCommit");
    const toId = e.request.url.query().get("toCommit");
    if (!workspaceId || !fromId || !toId) {
      return vc.vcJsonError(e, 400, "workspaceId, fromCommit, and toCommit are required");
    }
    if (!vc.getMembership($app, workspaceId, auth.id)) {
      return vc.vcJsonError(e, 403, "Forbidden");
    }
    let fromCommit;
    let toCommit;
    try {
      fromCommit = $app.findRecordById("workspace_commits", fromId);
      toCommit = $app.findRecordById("workspace_commits", toId);
    } catch (err) {
      return vc.vcJsonError(e, 404, "Commit not found");
    }
    if (fromCommit.get("workspace") !== workspaceId || toCommit.get("workspace") !== workspaceId) {
      return vc.vcJsonError(e, 400, "Commits do not belong to workspace");
    }
    let first = fromCommit;
    let second = toCommit;
    if (first.get("created") > second.get("created")) {
      first = toCommit;
      second = fromCommit;
    }

    const workspaceDocs = $app.findRecordsByFilter(
      "documents",
      "workspace = {:w}",
      "title",
      200,
      0,
      { w: workspaceId },
    );

    const results = [];
    for (let i = 0; i < workspaceDocs.length; i++) {
      const doc = workspaceDocs[i];
      if (!vc.canAccessDocument(auth, doc)) {
        continue;
      }
      const before = vc.getSnapshotContent($app, doc.id, first);
      const after = vc.getSnapshotContent($app, doc.id, second);
      if (before !== after) {
        results.push({
          documentId: doc.id,
          title: String(doc.get("title") ?? ""),
          before: before,
          after: after,
        });
      }
    }

    return e.json(200, {
      workspaceId: workspaceId,
      fromCommit: first.id,
      toCommit: second.id,
      documents: results,
    });
  },
  $apis.requireAuth(),
);

routerAdd(
  "GET",
  "/api/synk/vc/info",
  (e) => {
    var vc = $app.store().get("synk_vc");
    if (!vc) {
      return e.json(500, { message: "VC helpers not initialized" });
    }
    const auth = e.auth;
    if (!auth) {
      return vc.vcJsonError(e, 401, "Unauthorized");
    }
    const commitId = e.request.url.query().get("commitId");
    if (!commitId) {
      return vc.vcJsonError(e, 400, "commitId is required");
    }
    let commit;
    try {
      commit = $app.findRecordById("workspace_commits", commitId);
    } catch (err) {
      return vc.vcJsonError(e, 404, "Commit not found");
    }
    const workspaceId = commit.get("workspace");
    if (!vc.getMembership($app, workspaceId, auth.id)) {
      return vc.vcJsonError(e, 403, "Forbidden");
    }
    const versions = $app.findRecordsByFilter(
      "document_versions",
      "commit = {:c}",
      "",
      200,
      0,
      { c: commitId },
    );
    const changes = [];
    for (let i = 0; i < versions.length; i++) {
      const v = versions[i];
      const docId = v.get("document");
      let title = "";
      try {
        const doc = $app.findRecordById("documents", docId);
        title = String(doc.get("title") ?? "");
      } catch (err) {
        title = "";
      }
      changes.push({
        documentId: docId,
        title: title,
        versionId: v.id,
      });
    }

    return e.json(200, {
      id: commit.id,
      workspaceId: workspaceId,
      message: String(commit.get("message") ?? ""),
      author: String(commit.get("author") ?? ""),
      created: commit.get("created"),
      hash: commit.id,
      changes: changes,
    });
  },
  $apis.requireAuth(),
);

routerAdd(
  "POST",
  "/api/synk/vc/revert",
  (e) => {
    var vc = $app.store().get("synk_vc");
    if (!vc) {
      return e.json(500, { message: "VC helpers not initialized" });
    }
    const auth = e.auth;
    if (!auth) {
      return vc.vcJsonError(e, 401, "Unauthorized");
    }
    const raw = toString(e.request.body);
    if (!raw || raw.length === 0) {
      return vc.vcJsonError(e, 400, "Empty body");
    }
    if (raw.length > 600000) {
      return vc.vcJsonError(e, 413, "Payload too large");
    }
    let body;
    try {
      body = JSON.parse(raw);
    } catch (err) {
      return vc.vcJsonError(e, 400, "Invalid JSON");
    }
    const workspaceId = body.workspaceId;
    const commitIdOpt = body.commitId;
    if (!workspaceId) {
      return vc.vcJsonError(e, 400, "workspaceId is required");
    }
    if (!vc.getMembership($app, workspaceId, auth.id)) {
      return vc.vcJsonError(e, 403, "Forbidden");
    }

    let targetCommit;
    if (commitIdOpt) {
      try {
        targetCommit = $app.findRecordById("workspace_commits", commitIdOpt);
      } catch (err) {
        return vc.vcJsonError(e, 404, "Commit not found");
      }
      if (targetCommit.get("workspace") !== workspaceId) {
        return vc.vcJsonError(e, 400, "Commit does not belong to workspace");
      }
    } else {
      const commits = $app.findRecordsByFilter(
        "workspace_commits",
        "workspace = {:w}",
        "-created",
        20,
        0,
        { w: workspaceId },
      );
      if (!commits || commits.length < 2) {
        return vc.vcJsonError(e, 400, "Not enough history to revert (need at least two commits)");
      }
      targetCommit = commits[1];
    }

    const outCommit = { id: "" };
    const outVersions = [];

    try {
      $app.runInTransaction((txApp) => {
        const wcColl = txApp.findCollectionByNameOrId("workspace_commits");
        const dvColl = txApp.findCollectionByNameOrId("document_versions");

        const revertMsg = "Revert to: " + String(targetCommit.get("message") ?? "");
        const revertCommit = new Record(wcColl);
        revertCommit.set("workspace", workspaceId);
        revertCommit.set("message", revertMsg);
        revertCommit.set("author", auth.id);
        vc.saveWithRequest(e, txApp, revertCommit);
        outCommit.id = revertCommit.id;

        const workspaceDocs = txApp.findRecordsByFilter(
          "documents",
          "workspace = {:w}",
          "title",
          200,
          0,
          { w: workspaceId },
        );

        for (let i = 0; i < workspaceDocs.length; i++) {
          const doc = workspaceDocs[i];
          if (!vc.canAccessDocument(auth, doc)) {
            continue;
          }
          if (doc.get("created") > targetCommit.get("created")) {
            continue;
          }
          const snapshot = vc.getSnapshotContent(txApp, doc.id, targetCommit);
          const current = String(doc.get("currentContent") ?? "");
          if (snapshot === current) {
            continue;
          }
          const dv = new Record(dvColl);
          dv.set("document", doc.id);
          dv.set("versionName", revertMsg);
          dv.set("content", snapshot);
          dv.set("author", auth.id);
          dv.set("commit", revertCommit.id);
          vc.saveWithRequest(e, txApp, dv);
          doc.set("currentContent", snapshot);
          vc.saveWithRequest(e, txApp, doc);
          outVersions.push({
            id: dv.id,
            document: doc.id,
            versionName: revertMsg,
            commit: revertCommit.id,
          });
        }
      });
    } catch (err) {
      return vc.vcJsonError(e, 400, String(err && err.message ? err.message : err));
    }

    return e.json(200, {
      commit: { id: outCommit.id },
      versions: outVersions,
    });
  },
  $apis.requireAuth(),
);
