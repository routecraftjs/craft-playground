# mcp-tools

Four tools exposed over the authenticated HTTP MCP server (configured in
`craft.config.ts`): `greet`, `notes_create`, `notes_list`, and `notes_search`.

A capability becomes an MCP tool the moment its source is `mcp()`. The notes
tools demonstrate semantic search: `notes_create` embeds each note with an
in-process model (`enrich(embedding(...))`) and `notes_search` ranks notes by
cosine similarity to the query.

`notes-store.ts` is a private in-memory store for these tools, including the
cosine ranking. It is local to this folder and not imported from elsewhere.
