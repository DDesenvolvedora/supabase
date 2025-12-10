import type { PostgresTable } from '@supabase/postgres-meta'
import { useEffect } from 'react'

import { useTableApiAccessQuery } from 'data/privileges/table-api-access-query'
import { useQuerySchemaState } from 'hooks/misc/useSchemaQueryState'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { Switch } from 'ui'

import type { TableField } from './TableEditor.types'

interface ApiAccessToggleProps {
  table?: PostgresTable
  tableFields: TableField
  isNewRecord: boolean
  isDuplicating: boolean
  onChange?: (value: boolean) => void
  onInitialLoad?: (value: boolean) => void
}

export const ApiAccessToggle = ({
  table,
  tableFields,
  isNewRecord,
  isDuplicating,
  onChange,
  onInitialLoad,
}: ApiAccessToggleProps) => {
  const { data: project } = useSelectedProjectQuery()
  const { selectedSchema } = useQuerySchemaState()

  const { name: tableName } = tableFields
  const schema = table?.schema ?? selectedSchema
  const relationId = table?.id ?? tableFields.id

  const { data: apiAccessData, isLoading: isApiAccessLoading } = useTableApiAccessQuery(
    {
      projectRef: project?.ref,
      connectionString: project?.connectionString,
      relationId,
      schema,
      tableName,
    },
    { enabled: !isNewRecord && !isDuplicating }
  )

  const derivedApiAccessEnabled =
    tableFields.isApiAccessEnabled ?? apiAccessData?.hasApiAccess ?? true

  useEffect(() => {
    if (
      typeof apiAccessData?.hasApiAccess === 'boolean' &&
      tableFields.isApiAccessEnabled === undefined
    ) {
      onInitialLoad?.(apiAccessData.hasApiAccess)
    }
  }, [apiAccessData?.hasApiAccess, onInitialLoad, tableFields.isApiAccessEnabled])

  // For new records or duplicating, the query is disabled so we don't need to wait for loading
  const isDisabled = !isNewRecord && !isDuplicating && isApiAccessLoading

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="space-y-1">
        <p className="text-sm text-foreground">Expose table via Data API</p>
        <p className="text-sm text-foreground-lighter">
          This table will be accessible via client libraries like supabase-js
        </p>
      </div>
      <Switch
        size="large"
        disabled={isDisabled}
        checked={derivedApiAccessEnabled}
        onCheckedChange={(value) => onChange?.(value)}
      />
    </div>
  )
}
