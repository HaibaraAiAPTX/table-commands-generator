import { Button } from './ui/button'
import { Card } from './ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'

export default function TableControls(props: {
  disabled: boolean
  onInsertRow: () => void
  onInsertCol: () => void
  onDeleteRow: () => void
  onDeleteCol: () => void
  onMerge: () => void
  onUnmerge: () => void
}): JSX.Element {
  const controlGroups = [
    {
      label: 'Insert',
      buttons: [
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ),
          label: 'Row',
          onClick: props.onInsertRow,
          shortcut: '⌘+R',
        },
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          label: 'Column',
          onClick: props.onInsertCol,
          shortcut: '⌘+C',
        },
      ],
    },
    {
      label: 'Delete',
      buttons: [
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ),
          label: 'Row',
          onClick: props.onDeleteRow,
          shortcut: '⌘+⇧+R',
        },
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          ),
          label: 'Column',
          onClick: props.onDeleteCol,
          shortcut: '⌘+⇧+C',
        },
      ],
    },
    {
      label: 'Cells',
      buttons: [
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          ),
          label: 'Merge',
          onClick: props.onMerge,
          shortcut: '⌘+M',
        },
        {
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          ),
          label: 'Unmerge',
          onClick: props.onUnmerge,
          shortcut: '⌘+U',
        },
      ],
    },
  ]

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <div className="p-6 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-base text-slate-900 mb-0.5">Table Controls</h3>
          <p className="text-xs text-slate-500">Modify table structure</p>
        </div>

        <div className="space-y-3">
          {controlGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{group.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.buttons.map((btn) => (
                  <TooltipProvider key={btn.label}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={props.disabled}
                          onClick={btn.onClick}
                          className="w-full justify-start gap-2"
                        >
                          {btn.icon}
                          <span>{btn.label}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{btn.shortcut}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
