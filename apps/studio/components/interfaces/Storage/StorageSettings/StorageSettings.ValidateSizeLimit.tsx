import type { ReactNode } from 'react'
import { cn, Tooltip, TooltipContent, TooltipTrigger } from 'ui'

type ValidateSizeLimitProps = {
  className?: string
}

export const ValidateSizeLimit = ({ className }: ValidateSizeLimitProps): ReactNode => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn('mt-2 ml-auto', '!w-fit', 'underline text-foreground-light', className)}
        >
          Validate size limit
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Check that all existing buckets fit within this limit</p>
      </TooltipContent>
    </Tooltip>
  )
}
