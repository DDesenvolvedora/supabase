/**
 * SQL to get the storage buckets wtih the largest file size limits.
 *
 * This query is unoptimized and should not be automatically called because
 * there is no index on `file_size_limit` in the `storage.buckets` table.
 */
export const getLargestSizeLimitBucketsSql = /* SQL */ `
SELECT id, name, file_size_limit
FROM storage.buckets
ORDER BY file_size_limit DESC
LIMIT 10;
`.trim()
