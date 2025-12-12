import { useQuery, useQueryClient } from '@tanstack/react-query'
import { executeSql } from 'data/sql/execute-sql-query'
import { sqlKeys } from 'data/sql/keys'
import { getLargestSizeLimitBucketsSql } from 'data/sql/queries/get-largest-size-limit-buckets'
import { getLiveTupleEstimate } from 'data/sql/queries/get-live-tuple-stats'

const THRESHOLD = 1000

type ConnectionVars = {
  projectRef?: string
  connectionString?: string
}

const getBucketNumberEstimateKey = (projectRef: string | undefined) =>
  sqlKeys.query(projectRef, ['live-tuple-estimate', 'storage.buckets'])

const getBucketNumberEstimate = async ({
  projectRef,
  connectionString,
}: ConnectionVars): Promise<number | undefined> => {
  if (!projectRef) throw new Error('Project reference is required')
  if (!connectionString) throw new Error('Connection string is required')

  const queryKey = getBucketNumberEstimateKey(projectRef)

  try {
    const sql = getLiveTupleEstimate('buckets', 'storage')
    const { result } = await executeSql<{ live_tuple_estimate: number }[]>({
      projectRef,
      connectionString,
      queryKey,
      sql,
    })
    return result[0]?.live_tuple_estimate
  } catch {
    return undefined
  }
}

type BucketWithSizeLimit = {
  id: string
  name: string
  file_size_limit: number
}

const getBucketsWithLargestSizeLimitKey = (projectRef: string | undefined) =>
  sqlKeys.query(projectRef, ['buckets-with-largest-size-limit'])

const getBucketsWithLargestSizeLimit = async ({
  projectRef,
  connectionString,
}: ConnectionVars): Promise<BucketWithSizeLimit[]> => {
  if (!projectRef) throw new Error('Project reference is required')
  if (!connectionString) throw new Error('Connection string is required')

  const key = getBucketsWithLargestSizeLimitKey(projectRef)

  const sql = getLargestSizeLimitBucketsSql
  try {
    const { result } = await executeSql<{ id: string; name: string; file_size_limit: number }[]>({
      projectRef,
      connectionString,
      queryKey: key,
      sql,
    })
    return result
  } catch (error) {
    const typedError = error as Error // based on executeSql definition
    throw typedError
  }
}

type UseLargestBucketSizeLimitsQueryProps = ConnectionVars
type UseLargestBucketSizeLimitsQueryReturn = {
  /**
   * When the query for largest bucket size limits should be run.
   *
   * - `auto`: Run the query automatically.
   * - `confirm`: Ask the user for confirmation before running the query.
   */
  runCondition: 'auto' | 'confirm'
  /**
   * Run query to get the buckets with the largest file size limits. Buckets
   * are sorted in order of decreasing file size limit.
   *
   * @throws Error
   */
  runQuery: () => Promise<BucketWithSizeLimit[]>
}

export const useLargestBucketSizeLimitsQuery = ({
  projectRef,
  connectionString,
}: UseLargestBucketSizeLimitsQueryProps): UseLargestBucketSizeLimitsQueryReturn => {
  const queryClient = useQueryClient()

  const estimateKey = getBucketNumberEstimateKey(projectRef)

  const { data: estimatedRows } = useQuery<number | undefined>({
    // Query is the same even if connectionString changes, and doesn't correctly
    // track projectRef
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: estimateKey,
    queryFn: async () => getBucketNumberEstimate({ projectRef, connectionString }),
    enabled: !!projectRef && !!connectionString,
  })

  const bucketLimitsKey = getBucketsWithLargestSizeLimitKey(projectRef)

  const fetchLargestBucketLimits = () =>
    queryClient.fetchQuery({
      // Query is the same even if connectionString changes, and doesn't correctly
      // track projectRef
      // eslint-disable-next-line @tanstack/query/exhaustive-deps
      queryKey: bucketLimitsKey,
      queryFn: () => getBucketsWithLargestSizeLimit({ projectRef, connectionString }),
    })

  return {
    runCondition: estimatedRows && estimatedRows <= THRESHOLD ? 'auto' : 'confirm',
    runQuery: fetchLargestBucketLimits,
  }
}
