import { log, craft, simple, fetch, FetchResult } from "@routecraft/routecraft";

export default craft()
  .id("hello-world")
  .from(simple({ userId: 1 }))
  .enrich<FetchResult>(
    fetch({
      method: "GET",
      url: (ex) =>
        `https://jsonplaceholder.typicode.com/users/${ex.body.userId}`,
    }),
  )
  .transform<{ name: string }>((enriched) => JSON.parse(enriched.body))
  .transform((user) => `Hello, ${user.name}!`)
  .to(log());