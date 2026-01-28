import type { TableCommand } from '@aptx/table-commands-generator'
import { Card } from './ui/card'
import { Badge } from './ui/badge'

export default function CommandLog(props: { history: TableCommand[][] }): JSX.Element {
  const commandCount = props.history.reduce((acc, batch) => acc + batch.length, 0)

  if (props.history.length === 0) {
    return (
      <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">Command History</h3>
              <p className="text-xs text-slate-500 mt-0.5">Track table operations</p>
            </div>
            <Badge variant="secondary">0</Badge>
          </div>
          <div className="text-center py-8 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No operations yet</p>
            <p className="text-xs mt-1">Create a table and start editing</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-base text-slate-900">Command History</h3>
            <p className="text-xs text-slate-500 mt-0.5">Track table operations</p>
          </div>
          <Badge variant="default">{commandCount}</Badge>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 max-h-64 overflow-y-auto custom-scrollbar">
          <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">
            {JSON.stringify(props.history, null, 2)}
          </pre>
        </div>
      </div>
    </Card>
  )
}
