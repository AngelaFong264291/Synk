# PocketBase MVP Contract

This repo now uses PocketBase as the source of truth for the hackathon MVP backend. The goal of this document is to give the team one stable contract for collection names, field names, access expectations, and seed data.

## Scope

P0 only:

- `users`
- `workspaces`
- `workspace_members`
- `documents`
- `document_versions`
- `tasks`
- `decisions`

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

### `document_versions`

Fields:

- `document` (`relation -> documents`, required, max select 1)
- `versionName` (`text`, required)
- `content` (`editor`, required)
- `author` (`relation -> users`, required, max select 1)

Indexes:

- index on `document`
- index on `author`

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
- tasks:
  - `Outline demo` → `todo`
  - `Review snapshot diff` → `in_progress`
  - `Present dashboard` → `done`
- decision: `Use plain-text diff for MVP`

## Frontend Contract

The frontend should import the shared API helpers in [frontend/src/lib/api.ts](/Users/hoimingfong/Sync/frontend/src/lib/api.ts) and shared record types in [frontend/src/lib/types.ts](/Users/hoimingfong/Sync/frontend/src/lib/types.ts).

This avoids duplicating collection names and field names across pages.

## Setup Steps

1. Start PocketBase with `docker compose up` from [pocketbase/docker-compose.yml](/Users/hoimingfong/Sync/pocketbase/docker-compose.yml).
2. Open the admin UI at `http://127.0.0.1:8090/_/`.
3. Apply the repo migrations or create/update the collections above with the exact field names in this doc.
4. Add the recommended rules.
5. Seed the demo records.
6. Log in from the frontend and use the shared API layer for CRUD.

### Migration note

The repo now includes [1700000006_create_synk_mvp_collections.js](/Users/hoimingfong/Sync/pocketbase/pb_migrations/1700000006_create_synk_mvp_collections.js), which creates the Synk MVP collections used by the live Workspace, Documents, Tasks, Dashboard, and Decisions pages:

- `workspaces`
- `workspace_members`
- `documents`
- `document_versions`
- `tasks`
- `decisions`

If your local PocketBase still only has legacy `teams` / `team_members` collections, restart PocketBase so the migration runs, then seed at least one workspace and one membership before testing the Tasks page.

## Team Notes

- The current app still assumes manual user creation in the admin UI on the login page; that is okay for the MVP if sign-up UI lands later.
- `document_versions.content` stores the full plain-text snapshot for now.
- Snapshot restore can be implemented later by copying a version's content back into `documents.currentContent`.
- Task status is a first-class MVP field and should always use exactly: `todo`, `in_progress`, `done`.
