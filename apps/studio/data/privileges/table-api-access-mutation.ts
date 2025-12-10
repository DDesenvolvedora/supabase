import pgMeta from '@supabase/pg-meta'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { executeSql } from 'data/sql/execute-sql-query'
import type { ResponseError, UseCustomMutationOptions } from 'types'
import { API_ACCESS_ROLES, invalidateTableApiAccessQuery } from './table-api-access-query'
import { invalidateTablePrivilegesQuery } from './table-privileges-query'

export type TableApiAccessVariables = {
  projectRef: string
  connectionString?: string | null
  relationId: number
}

export async function enableTableApiAccess({
  projectRef,
  connectionString,
  relationId,
}: TableApiAccessVariables) {
  const sql = pgMeta.tablePrivileges
    .grant(
      API_ACCESS_ROLES.map((role) => ({
        grantee: role,
        privilegeType: 'ALL' as const,
        relationId,
      }))
    )
    .sql.trim()

  const { result } = await executeSql({
    projectRef,
    connectionString,
    sql,
    queryKey: ['table-api-access', 'grant'],
  })

  return result
}

export async function disableTableApiAccess({
  projectRef,
  connectionString,
  relationId,
}: TableApiAccessVariables) {
  const sql = pgMeta.tablePrivileges
    .revoke(
      API_ACCESS_ROLES.map((role) => ({
        grantee: role,
        privilegeType: 'ALL' as const,
        relationId,
      }))
    )
    .sql.trim()

  const { result } = await executeSql({
    projectRef,
    connectionString,
    sql,
    queryKey: ['table-api-access', 'revoke'],
  })

  return result
}

type EnableTableApiAccessData = Awaited<ReturnType<typeof enableTableApiAccess>>
type DisableTableApiAccessData = Awaited<ReturnType<typeof disableTableApiAccess>>

export const useTableApiAccessEnableMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseCustomMutationOptions<EnableTableApiAccessData, ResponseError, TableApiAccessVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<EnableTableApiAccessData, ResponseError, TableApiAccessVariables>({
    mutationFn: (vars) => enableTableApiAccess(vars),
    async onSuccess(data, variables, context) {
      const { projectRef, relationId } = variables

      await Promise.all([
        invalidateTablePrivilegesQuery(queryClient, projectRef),
        invalidateTableApiAccessQuery(queryClient, projectRef, relationId),
      ])

      await onSuccess?.(data, variables, context)
    },
    async onError(data, variables, context) {
      if (onError === undefined) {
        toast.error(`Failed to enable API access: ${data.message}`)
      } else {
        onError(data, variables, context)
      }
    },
    ...options,
  })
}

export const useTableApiAccessDisableMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseCustomMutationOptions<DisableTableApiAccessData, ResponseError, TableApiAccessVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<DisableTableApiAccessData, ResponseError, TableApiAccessVariables>({
    mutationFn: (vars) => disableTableApiAccess(vars),
    async onSuccess(data, variables, context) {
      const { projectRef, relationId } = variables

      await Promise.all([
        invalidateTablePrivilegesQuery(queryClient, projectRef),
        invalidateTableApiAccessQuery(queryClient, projectRef, relationId),
      ])

      await onSuccess?.(data, variables, context)
    },
    async onError(data, variables, context) {
      if (onError === undefined) {
        toast.error(`Failed to disable API access: ${data.message}`)
      } else {
        onError(data, variables, context)
      }
    },
    ...options,
  })
}

