import { getCollection, type CollectionEntry } from "astro:content";
import { z } from "astro/zod";
import registry from "@/content/topics.json";
import { postFilter } from "./postFilter";

const topicSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1),
    description: z.string().trim().optional(),
    posts: z.array(z.string().min(1)),
  })
  .strict();

export type Topic = Omit<z.infer<typeof topicSchema>, "posts"> & {
  posts: CollectionEntry<"posts">[];
};

// Validate before filtering, so a misspelled ID cannot silently disappear.
// Ordering is maintained here only, never duplicated in article frontmatter.
export async function getTopics(): Promise<Topic[]> {
  const records = z.array(topicSchema).parse(registry);
  const posts = new Map(
    (await getCollection("posts")).map(post => [post.id, post])
  );
  const slugs = new Set<string>();
  return records
    .map(record => {
      if (slugs.has(record.slug))
        throw new Error(`Duplicate topic slug: ${record.slug}`);
      slugs.add(record.slug);
      const seen = new Set<string>();
      const entries = record.posts.map(id => {
        if (seen.has(id))
          throw new Error(`Topic ${record.slug}: duplicate post ${id}`);
        seen.add(id);
        const post = posts.get(id);
        if (!post) throw new Error(`Topic ${record.slug}: unknown post ${id}`);
        return post;
      });
      return { ...record, posts: entries.filter(postFilter) };
    })
    .filter(topic => topic.posts.length > 0);
}
