declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES: R2Bucket;
    BLOG_OWNER_EMAIL?: string;
  }
}
