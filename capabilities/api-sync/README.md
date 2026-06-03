# api-sync

Resilient batch sync: POST a batch of records to an API one at a time. One
record is deliberately invalid. A route-level `.error()` boundary catches the
failure, dead-letters that record, and lets the rest of the batch finish, so a
single bad record never sinks the run.

The failure is also emitted as an event, which the `error-collector` capability
records to a JSONL file.
