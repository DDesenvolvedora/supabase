import { QueryClient } from '@tanstack/react-query'

import type { ExecuteSqlError } from 'data/sql/execute-sql-query'
import { privilegeKeys } from './keys'
import { TablePrivilegesData, useTablePrivilegesQuery } from './table-privileges-query'

export const API_ACCESS_ROLES = ['anon', 'authenticated'] as const

export type TableApiAccessVariables = {
  projectRef?: string
  connectionString?: string | null
  relationId?: number
  schema?: string
  tableName?: string
}

type TableApiAccessResponse = {
  relation_id: number
  schema: string
  name: string
  privileges: {
    grantor: string
    grantee: string
    privilege_type: string
    is_grantable: boolean
  }[]
} | null

export type TableApiAccessData = {
  hasApiAccess: boolean
  rolesWithAccess: Set<(typeof API_ACCESS_ROLES)[number]>
}
export type TableApiAccessError = ExecuteSqlError

const hasValidTarget = ({ relationId, schema, tableName }: TableApiAccessVariables) =>
  !!relationId || (!!schema && !!tableName)

const mapPrivilegesToApiAccess = (
  data: TablePrivilegesData | undefined,
  relationId?: number,
  schema?: string,
  tableName?: string
): TableApiAccessData => {
  const target = (data ?? []).find((entry) =>
    relationId
      ? entry.relation_id === relationId
      : entry.schema === schema && entry.name === tableName
  )

  const privileges = target?.privileges ?? []
  const rolesWithAccess = new Set(
    privileges
      .filter((privilege) =>
        API_ACCESS_ROLES.includes(privilege.grantee as (typeof API_ACCESS_ROLES)[number])
      )
      .map((privilege) => privilege.grantee as (typeof API_ACCESS_ROLES)[number])
  )

  return {
    hasApiAccess: rolesWithAccess.size > 0,
    rolesWithAccess,
  }
}

export const useTableApiAccessQuery = (
  variables: TableApiAccessVariables,
  { enabled = true }: { enabled?: boolean } = {}
) =>
  useTablePrivilegesQuery<TableApiAccessData>(
    { projectRef: variables.projectRef, connectionString: variables.connectionString },
    {
      select: (data) =>
        mapPrivilegesToApiAccess(data, variables.relationId, variables.schema, variables.tableName),
      enabled:
        enabled &&
        !!variables.projectRef &&
        !!variables.connectionString &&
        hasValidTarget(variables),
    }
  )

export function invalidateTableApiAccessQuery(
  client: QueryClient,
  projectRef: string | undefined,
  relationId: number | undefined,
  tableName?: string
) {
  return client.invalidateQueries({
    queryKey: privilegeKeys.tableApiAccess(projectRef, relationId, tableName),
  })
}
