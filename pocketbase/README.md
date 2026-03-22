# PocketBase MVP Contract

This repo now uses PocketBase as the source of truth for the hackathon MVP backend. The goal of this document is to give the team one stable contract for collection names, field names, access expectations, and seed data.

## Scope

P0 only:

- `users`
- `workspaces`
- `workspace_members`
- `workspace_commits`
- `documents`
- `document_versions`
- `tasks`
- `decisions`

**Migrations vs. manual setup:** Older migration files under `pb_migrations/` created the legacy `teams` demo collections. The app contract below uses `workspaces` and related Synk collections. Migrations `1700000006` and `1700000007` create the Synk schema (including `workspace_commits` and optional `tasks` / `decisions`) when missing. If you already created collections manually, PocketBase merges by name.

Non-goals for this contract:

- Google Drive / Notion sync
- rich text documents
- merge conflict handling beyond last-write-wins
- deep analytics

## Collections

### `users`

Use PocketBase's built-in auth collection.

Recommended extra fields:

- `name` (`text`, optional)

### `workspaces`

Fields:

- `name` (`text`, required)
- `description` (`editor`, optional)
- `inviteCode` (`text`, required, unique, 6-10 chars, uppercase)
- `owner` (`relation -> users`, required, max select 1)

Indexes:

- unique index on `inviteCode`
- index on `owner`

### `workspace_members`

Fields:

- `workspace` (`relation -> workspaces`, required, max select 1)
- `user` (`relation -> users`, required, max select 1)
- `role` (`select`, required, values: `owner`, `editor`, `member`)

Indexes:

- unique composite index on `workspace,user`
- index on `user`

### `documents`

Fields:

- `workspace` (`relation -> workspaces`, required, max select 1)
- `title` (`text`, required)
- `currentContent` (`editor`, required)
- `owner` (`relation -> users`, required, max select 1)
- `visibility` (`select`, required, values: `workspace`, `private`)
- `allowedMembers` (`relation -> users`, optional, multiple)

Indexes:

- index on `workspace`
- index on `owner`

MVP note:

- Ship `visibility = workspace` first if private docs slow the team down.
- If private docs are enabled, use `allowedMembers` for the allow-list.

### `workspace_commits`

Batch snapshots for one or more documents in a workspace (Git-like “commit”).

Fields:

- `workspace` (`relation -> workspaces`, required, max select 1)
- `message` (`text`, required) — commit message / snapshot label
- `author` (`relation -> users`, required, max select 1)

Indexes:

- index on `workspace`

REST helpers (custom routes, authenticated members only):

- `POST /api/synk/vc/change` — create commit + linked `document_versions`
- `GET /api/synk/vc/diff` — `workspaceId`, `fromCommit`, `toCommit`
- `GET /api/synk/vc/info` — `commitId`
- `POST /api/synk/vc/revert` — body: `workspaceId`, optional `commitId`

### `document_versions`

Fields:

- `document` (`relation -> documents`, required, max select 1)
- `versionName` (`text`, required)
- `content` (`editor`, required)
- `author` (`relation -> users`, required, max select 1)
- `commit` (`relation -> workspace_commits`, optional, max select 1) — set when the snapshot was created as part of a workspace commit

Indexes:

- index on `document`
- index on `author`
- index on `commit`

### `tasks`

Fields:

- `workspace` (`relation -> workspaces`, required, max select 1)
- `title` (`text`, required)
- `description` (`editor`, optional)
- `assignee` (`relation -> users`, optional, max select 1)
- `dueDate` (`date`, optional)
- `status` (`select`, required, values: `todo`, `in_progress`, `done`)
- `document` (`relation -> documents`, optional, max select 1)

Indexes:

- index on `workspace`
- index on `assignee`
- index on `status`

### `decisions`

Fields:

- `workspace` (`relation -> workspaces`, required, max select 1)
- `title` (`text`, required)
- `context` (`editor`, required)
- `decision` (`editor`, required)
- `owner` (`relation -> users`, required, max select 1)
- `linkedTask` (`relation -> tasks`, optional, max select 1)
- `linkedDocument` (`relation -> documents`, optional, max select 1)
- `decidedAt` (`date`, required)

Indexes:

- index on `workspace`
- index on `owner`
- index on `decidedAt`

## Access Rules

PocketBase rules should be strict enough that only authenticated workspace members can read and write workspace data.

Recommended rule snippets for the MVP:

### `workspaces`

- list/view: `@request.auth.id != "" && workspace_members_via_workspace.user ?= @request.auth.id`
- create: `@request.auth.id != "" && owner = @request.auth.id`
- update/delete: `@request.auth.id != "" && owner = @request.auth.id`

### `workspace_members`

- list/view: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`
- create: `@request.auth.id != "" && (workspace.owner = @request.auth.id || user = @request.auth.id)`
- update/delete: `@request.auth.id != "" && workspace.owner = @request.auth.id`

### `documents`

- list/view: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id && (visibility = "workspace" || owner = @request.auth.id || allowedMembers ?= @request.auth.id)`
- create: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id && owner = @request.auth.id`
- update/delete: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id && (owner = @request.auth.id || workspace.owner = @request.auth.id)`

### `workspace_commits`

- list/view: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`
- create: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id && author = @request.auth.id`
- update/delete: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`

### `document_versions`

- list/view: `@request.auth.id != "" && document.workspace.workspace_members_via_workspace.user ?= @request.auth.id`
- create: `@request.auth.id != "" && document.workspace.workspace_members_via_workspace.user ?= @request.auth.id && author = @request.auth.id`
- update/delete: `@request.auth.id != "" && (author = @request.auth.id || document.workspace.owner = @request.auth.id)`

### `tasks`

- list/view: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`
- create/update/delete: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`

### `decisions`

- list/view: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`
- create/update/delete: `@request.auth.id != "" && workspace.workspace_members_via_workspace.user ?= @request.auth.id`

## Seed Data

Create at least:

1. Two auth users.
2. One workspace owned by user A.
3. Two `workspace_members` rows so both users can see the same workspace.
4. One document with two versions.
5. Three tasks across all three statuses.
6. One decision linked to either the document or a task.

Suggested demo seed:

- workspace: `Synk Demo`
- invite code: `SYNK42`
- document: `Launch brief`
- versions: `Draft 1`, `Stakeholder edits`
- tasks: `Outline demo`, `Review snapshot diff`, `Present dashboard`
- decision: `Use plain-text diff for MVP`

## Frontend Contract

The frontend should import the shared API helpers in [frontend/src/lib/api.ts](/Users/hoimingfong/Sync/frontend/src/lib/api.ts) and shared record types in [frontend/src/lib/types.ts](/Users/hoimingfong/Sync/frontend/src/lib/types.ts).

This avoids duplicating collection names and field names across pages.

## Setup Steps

1. Start PocketBase with `docker compose up` from [pocketbase/docker-compose.yml](/Users/hoimingfong/Sync/pocketbase/docker-compose.yml).
2. Open the admin UI at `http://127.0.0.1:8090/_/`.
3. Create or update the collections above with the exact field names in this doc.
4. Add the recommended rules.
5. Seed the demo records.
6. Log in from the frontend and use the shared API layer for CRUD.

## Team Notes

- The current app still assumes manual user creation in the admin UI on the login page; that is okay for the MVP if sign-up UI lands later.
- `document_versions.content` stores the full plain-text snapshot for now.
- Snapshot restore can be implemented later by copying a version's content back into `documents.currentContent`.
