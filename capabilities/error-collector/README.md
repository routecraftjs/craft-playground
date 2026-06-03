# error-collector

A capability whose source is the event bus itself (`event([...])`). It listens
for failure events from every other capability and appends each one to a JSONL
file (`errors.jsonl` by default), a simple dead-letter log.

It subscribes only to failure events and filters out its own, so writing an
entry never feeds back into the source as a new event.
