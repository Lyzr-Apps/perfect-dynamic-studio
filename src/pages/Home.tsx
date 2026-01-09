import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Terminal as TerminalIcon,
  Settings,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  TrendingUp,
  Loader2,
  Copy,
  CheckCircle,
  LayoutDashboard,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  Calendar,
  Server,
  Zap,
  RefreshCw
} from 'lucide-react'
import { callAIAgent } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'
import { cn } from '@/lib/utils'

// Agent ID from orchestrator
const AGENT_ID = "69610427c57d451439d4bc75"

// TypeScript interfaces based on ACTUAL test response
interface ErrorItem {
  error_type: string
  count: number
  sample_message: string
  first_occurrence: string
  last_occurrence: string
}

interface WarningItem {
  warning_type: string
  count: number
  threshold: number
  average: number
}

interface PatternItem {
  pattern: string
  description: string
}

interface AnomalyItem {
  anomaly: string
  description: string
}

interface PeakTime {
  time: string
  error_count: number
  reason: string
}

interface FormattedLog {
  timestamp: string
  log_stream: string
  level: string
  message: string
  request_id: string
}

interface CloudWatchResult {
  query_interpretation: string
  logs_analyzed: number
  findings: {
    errors: ErrorItem[]
    warnings: WarningItem[]
    patterns: PatternItem[]
    anomalies: AnomalyItem[]
  }
  insights: {
    summary: string
    peak_times: PeakTime[]
    trends: string[]
    recommendations: string[]
  }
  formatted_results: FormattedLog[]
}

interface CloudWatchResponse extends NormalizedAgentResponse {
  result: CloudWatchResult
}

interface QueryHistoryItem {
  query: string
  timestamp: string
  response: CloudWatchResponse | null
}

// Inline components
function Header({
  activeView,
  onViewChange,
  onSettingsClick,
  onExport
}: {
  activeView: 'terminal' | 'dashboard'
  onViewChange: (view: 'terminal' | 'dashboard') => void
  onSettingsClick: () => void
  onExport: () => void
}) {
  return (
    <div className="h-14 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <TerminalIcon className="h-5 w-5 text-[#00FF41]" />
          <span className="font-mono text-sm font-semibold text-[#00FF41]">CloudWatch Log Analyzer</span>
          <Badge variant="outline" className="bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/30 font-mono text-xs">
            Connected
          </Badge>
        </div>

        <div className="flex items-center gap-1 bg-[#252525] rounded-lg p-1">
          <Button
            variant={activeView === 'terminal' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('terminal')}
            className={cn(
              "font-mono text-xs gap-2",
              activeView === 'terminal'
                ? "bg-[#00FF41]/20 text-[#00FF41] hover:bg-[#00FF41]/30"
                : "text-gray-400 hover:text-gray-300 hover:bg-[#2A2A2A]"
            )}
          >
            <TerminalIcon className="h-3.5 w-3.5" />
            Terminal
          </Button>
          <Button
            variant={activeView === 'dashboard' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('dashboard')}
            className={cn(
              "font-mono text-xs gap-2",
              activeView === 'dashboard'
                ? "bg-[#00FF41]/20 text-[#00FF41] hover:bg-[#00FF41]/30"
                : "text-gray-400 hover:text-gray-300 hover:bg-[#2A2A2A]"
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          className="text-gray-400 hover:text-[#00FF41] hover:bg-[#00FF41]/10"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className="text-gray-400 hover:text-[#00FF41] hover:bg-[#00FF41]/10"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function Sidebar({ isOpen, onFilterChange }: { isOpen: boolean; onFilterChange: (filter: string) => void }) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('1h')

  const handleFilterClick = (filter: string) => {
    setSelectedFilter(filter)
    onFilterChange(filter)
  }

  return (
    <Collapsible open={isOpen} className="border-r border-[#2A2A2A]">
      <CollapsibleContent>
        <div className="w-64 h-full bg-[#1A1A1A] p-4 space-y-6">
          <div>
            <label className="text-xs font-mono text-gray-400 uppercase mb-2 block">Log Group</label>
            <Select defaultValue="production-api">
              <SelectTrigger className="bg-[#252525] border-[#2A2A2A] text-gray-300 font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#252525] border-[#2A2A2A]">
                <SelectItem value="production-api" className="font-mono">production-api</SelectItem>
                <SelectItem value="staging-api" className="font-mono">staging-api</SelectItem>
                <SelectItem value="dev-api" className="font-mono">dev-api</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-mono text-gray-400 uppercase mb-2 block">Quick Filters</label>
            <div className="flex flex-col gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterClick('all')}
                className={cn(
                  'justify-start font-mono text-xs',
                  selectedFilter === 'all'
                    ? 'bg-[#00FF41]/20 text-[#00FF41] hover:bg-[#00FF41]/30'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-[#252525]'
                )}
              >
                All Logs
              </Button>
              <Button
                variant={selectedFilter === 'errors' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterClick('errors')}
                className={cn(
                  'justify-start font-mono text-xs',
                  selectedFilter === 'errors'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-[#252525]'
                )}
              >
                <AlertCircle className="h-3 w-3 mr-2" />
                Errors
              </Button>
              <Button
                variant={selectedFilter === 'warnings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterClick('warnings')}
                className={cn(
                  'justify-start font-mono text-xs',
                  selectedFilter === 'warnings'
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-[#252525]'
                )}
              >
                <AlertTriangle className="h-3 w-3 mr-2" />
                Warnings
              </Button>
              <Button
                variant={selectedFilter === 'info' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterClick('info')}
                className={cn(
                  'justify-start font-mono text-xs',
                  selectedFilter === 'info'
                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-[#252525]'
                )}
              >
                <Info className="h-3 w-3 mr-2" />
                Info
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-gray-400 uppercase mb-2 block">Time Range</label>
            <div className="grid grid-cols-2 gap-2">
              {['1h', '6h', '24h', '7d'].map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    'font-mono text-xs',
                    timeRange === range
                      ? 'bg-[#00FF41]/20 text-[#00FF41] border-[#00FF41]/30 hover:bg-[#00FF41]/30'
                      : 'border-[#2A2A2A] text-gray-400 hover:text-gray-300 hover:bg-[#252525]'
                  )}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function InsightBanner({ response }: { response: CloudWatchResponse }) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="bg-gradient-to-r from-[#00FF41]/10 to-[#00FF41]/5 border border-[#00FF41]/30 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#00FF41]/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#00FF41]/20 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-[#00FF41]" />
          </div>
          <div className="text-left">
            <div className="font-mono text-sm font-semibold text-[#00FF41]">AI Analysis Complete</div>
            <div className="font-mono text-xs text-gray-400">
              {response.result?.logs_analyzed?.toLocaleString() || '0'} logs analyzed • {response.result?.findings?.errors?.length || 0} error types found
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-[#00FF41]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[#00FF41]" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <Separator className="bg-[#00FF41]/20" />

          {/* Summary */}
          {response.result?.insights?.summary && (
            <div>
              <div className="font-mono text-xs text-gray-400 uppercase mb-2">Summary</div>
              <p className="font-mono text-sm text-gray-300 leading-relaxed">{response.result.insights.summary}</p>
            </div>
          )}

          {/* Error Types */}
          {response.result?.findings?.errors && response.result.findings.errors.length > 0 && (
            <div>
              <div className="font-mono text-xs text-gray-400 uppercase mb-2">Error Breakdown</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {response.result.findings.errors.map((error, idx) => (
                  <div key={idx} className="bg-[#1E1E1E] border border-red-500/30 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-red-400 font-semibold">{error.error_type}</span>
                      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 font-mono text-xs">
                        {error.count}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-gray-400 line-clamp-2">{error.sample_message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patterns */}
          {response.result?.findings?.patterns && response.result.findings.patterns.length > 0 && (
            <div>
              <div className="font-mono text-xs text-gray-400 uppercase mb-2">Patterns Detected</div>
              <div className="space-y-2">
                {response.result.findings.patterns.map((pattern, idx) => (
                  <div key={idx} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-md p-3">
                    <div className="font-mono text-xs text-cyan-400 font-semibold mb-1">{pattern.pattern}</div>
                    <p className="font-mono text-xs text-gray-400">{pattern.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anomalies */}
          {response.result?.findings?.anomalies && response.result.findings.anomalies.length > 0 && (
            <div>
              <div className="font-mono text-xs text-gray-400 uppercase mb-2">Anomalies</div>
              <div className="space-y-2">
                {response.result.findings.anomalies.map((anomaly, idx) => (
                  <div key={idx} className="bg-[#1E1E1E] border border-yellow-500/30 rounded-md p-3">
                    <div className="font-mono text-xs text-yellow-400 font-semibold mb-1">{anomaly.anomaly}</div>
                    <p className="font-mono text-xs text-gray-400">{anomaly.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peak Times */}
          {response.result?.insights?.peak_times && response.result.insights.peak_times.length > 0 && (
            <div>
              <div className="font-mono text-xs text-gray-400 uppercase mb-2">Peak Error Times</div>
              <div className="space-y-2">
                {response.result.insights.peak_times.map((peak, idx) => (
                  <div key={idx} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-md p-3 flex items-start gap-3">
                    <Clock className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-cyan-400">{new Date(peak.time).toLocaleString()}</span>
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 font-mono text-xs">
                          {peak.error_count} errors
                        </Badge>
                      </div>
                      <p className="font-mono text-xs text-gray-400">{peak.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {response.result?.insights?.recommendations && response.result.insights.recommendations.length > 0 && (
            <div>
              <div className="font-mono text-xs text-gray-400 uppercase mb-2">Recommendations</div>
              <ul className="space-y-2">
                {response.result.insights.recommendations.map((rec, idx) => (
                  <li key={idx} className="font-mono text-xs text-gray-300 flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-[#00FF41] mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trends */}
          {response.result?.insights?.trends && response.result.insights.trends.length > 0 && (
            <div>
              <div className="font-mono text-xs text-gray-400 uppercase mb-2">Trends</div>
              <ul className="space-y-1">
                {response.result.insights.trends.map((trend, idx) => (
                  <li key={idx} className="font-mono text-xs text-gray-400 flex items-start gap-2">
                    <span className="text-[#00FF41]">→</span>
                    <span>{trend}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LogEntry({ log, onCopy }: { log: FormattedLog; onCopy: (text: string) => void }) {
  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'text-red-400'
      case 'WARN':
      case 'WARNING':
        return 'text-yellow-400'
      case 'INFO':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  const getLevelBgColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'bg-red-500/10 border-red-500/30'
      case 'WARN':
      case 'WARNING':
        return 'bg-yellow-500/10 border-yellow-500/30'
      case 'INFO':
        return 'bg-blue-500/10 border-blue-500/30'
      default:
        return 'bg-gray-500/10 border-gray-500/30'
    }
  }

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="group relative bg-[#1A1A1A] hover:bg-[#252525] border-b border-[#2A2A2A] p-3 transition-colors">
      <div className="flex items-start gap-3">
        <span className="font-mono text-xs text-cyan-400 flex-shrink-0 w-32">{formatTimestamp(log.timestamp)}</span>
        <Badge variant="outline" className={cn('font-mono text-xs flex-shrink-0 w-16 justify-center', getLevelBgColor(log.level), getLevelColor(log.level))}>
          {log.level}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-gray-300 break-words">{log.message}</p>
          <div className="flex items-center gap-4 mt-1">
            <span className="font-mono text-xs text-gray-500">Stream: {log.log_stream}</span>
            <span className="font-mono text-xs text-gray-500">ID: {log.request_id}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCopy(JSON.stringify(log, null, 2))}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#00FF41] hover:bg-[#00FF41]/10 flex-shrink-0"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [autoScroll, setAutoScroll] = useState(true)
  const [fontSize, setFontSize] = useState('12')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1E1E1E] border-[#2A2A2A] text-gray-300 font-mono max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#00FF41] font-mono">Settings</DialogTitle>
          <DialogDescription className="text-gray-400 font-mono text-xs">
            Configure your CloudWatch Log Analyzer preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AWS Configuration */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase">AWS Configuration</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="region" className="text-xs text-gray-400">Region</Label>
                <Select defaultValue="us-east-1">
                  <SelectTrigger id="region" className="bg-[#252525] border-[#2A2A2A] text-gray-300 font-mono mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#252525] border-[#2A2A2A]">
                    <SelectItem value="us-east-1" className="font-mono">us-east-1 (N. Virginia)</SelectItem>
                    <SelectItem value="us-west-2" className="font-mono">us-west-2 (Oregon)</SelectItem>
                    <SelectItem value="eu-west-1" className="font-mono">eu-west-1 (Ireland)</SelectItem>
                    <SelectItem value="ap-southeast-1" className="font-mono">ap-southeast-1 (Singapore)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="log-group" className="text-xs text-gray-400">Default Log Group</Label>
                <Select defaultValue="production-api">
                  <SelectTrigger id="log-group" className="bg-[#252525] border-[#2A2A2A] text-gray-300 font-mono mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#252525] border-[#2A2A2A]">
                    <SelectItem value="production-api" className="font-mono">production-api</SelectItem>
                    <SelectItem value="staging-api" className="font-mono">staging-api</SelectItem>
                    <SelectItem value="dev-api" className="font-mono">dev-api</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="bg-[#2A2A2A]" />

          {/* Display Preferences */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase">Display Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-scroll" className="text-xs text-gray-300">Auto-scroll</Label>
                  <p className="text-xs text-gray-500 mt-0.5">Automatically scroll to bottom on new logs</p>
                </div>
                <Switch
                  id="auto-scroll"
                  checked={autoScroll}
                  onCheckedChange={setAutoScroll}
                  className="data-[state=checked]:bg-[#00FF41]"
                />
              </div>

              <div>
                <Label htmlFor="font-size" className="text-xs text-gray-400">Font Size</Label>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger id="font-size" className="bg-[#252525] border-[#2A2A2A] text-gray-300 font-mono mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#252525] border-[#2A2A2A]">
                    <SelectItem value="10" className="font-mono">10px</SelectItem>
                    <SelectItem value="12" className="font-mono">12px (Default)</SelectItem>
                    <SelectItem value="14" className="font-mono">14px</SelectItem>
                    <SelectItem value="16" className="font-mono">16px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#2A2A2A] text-gray-400 hover:text-gray-300 hover:bg-[#252525] font-mono"
          >
            Cancel
          </Button>
          <Button
            onClick={onClose}
            className="bg-[#00FF41] text-black hover:bg-[#00FF41]/90 font-mono font-semibold"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Dashboard({ history, response }: { history: QueryHistoryItem[]; response: CloudWatchResponse | null }) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')

  // Dummy data for when no real data exists
  const hasRealData = history.length > 0 || response !== null

  const dummyAnalytics = {
    totalQueries: 1247,
    totalLogsAnalyzed: 523891,
    totalErrors: 234,
    totalWarnings: 67,
    totalPatterns: 18,
    totalAnomalies: 7
  }

  const dummyTopErrors = [
    { errorType: 'TimeoutError', count: 87, sample: 'Request to external payment gateway timed out after 30s' },
    { errorType: 'NullReferenceException', count: 52, sample: 'Unhandled NullReferenceException in OrdersController at line 221' },
    { errorType: 'DatabaseConnectionError', count: 41, sample: 'Unable to connect to user-db cluster: connection refused' },
    { errorType: 'AuthenticationFailure', count: 28, sample: 'JWT token validation failed: signature expired' },
    { errorType: 'RateLimitExceeded', count: 26, sample: 'API rate limit exceeded for endpoint /api/v2/users' }
  ]

  const dummyRecentActivity = [
    { query: 'Show me all TimeoutErrors in the last hour', timestamp: new Date(Date.now() - 15 * 60000).toISOString(), logsAnalyzed: 2341, errorCount: 17 },
    { query: 'Analyze database connection failures today', timestamp: new Date(Date.now() - 45 * 60000).toISOString(), logsAnalyzed: 8923, errorCount: 5 },
    { query: 'What caused the spike at 2pm?', timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), logsAnalyzed: 15672, errorCount: 42 },
    { query: 'Search for authentication errors in production', timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), logsAnalyzed: 6234, errorCount: 11 },
    { query: 'Show API rate limit errors', timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), logsAnalyzed: 3456, errorCount: 8 },
    { query: 'Find all errors from app-server-2', timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), logsAnalyzed: 12890, errorCount: 23 },
    { query: 'Analyze memory usage warnings', timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), logsAnalyzed: 4567, errorCount: 0 },
    { query: 'Show all critical errors in the last 24h', timestamp: new Date(Date.now() - 12 * 3600000).toISOString(), logsAnalyzed: 34521, errorCount: 67 }
  ]

  // Calculate analytics from history and current response
  const realAnalytics = {
    totalQueries: history.length,
    totalLogsAnalyzed: history.reduce((sum, item) => sum + (item.response?.result?.logs_analyzed || 0), 0) + (response?.result?.logs_analyzed || 0),
    totalErrors: history.reduce((sum, item) => {
      const errors = item.response?.result?.findings?.errors || []
      return sum + errors.reduce((eSum, e) => eSum + e.count, 0)
    }, 0) + (response?.result?.findings?.errors?.reduce((sum, e) => sum + e.count, 0) || 0),
    totalWarnings: history.reduce((sum, item) => {
      const warnings = item.response?.result?.findings?.warnings || []
      return sum + warnings.reduce((wSum, w) => wSum + w.count, 0)
    }, 0) + (response?.result?.findings?.warnings?.reduce((sum, w) => sum + w.count, 0) || 0),
    totalPatterns: history.reduce((sum, item) => sum + (item.response?.result?.findings?.patterns?.length || 0), 0) + (response?.result?.findings?.patterns?.length || 0),
    totalAnomalies: history.reduce((sum, item) => sum + (item.response?.result?.findings?.anomalies?.length || 0), 0) + (response?.result?.findings?.anomalies?.length || 0)
  }

  // Get all unique error types across history
  const allErrors = new Map<string, { count: number; sample: string }>()
  history.forEach(item => {
    item.response?.result?.findings?.errors?.forEach(error => {
      const existing = allErrors.get(error.error_type)
      if (existing) {
        existing.count += error.count
      } else {
        allErrors.set(error.error_type, { count: error.count, sample: error.sample_message })
      }
    })
  })
  response?.result?.findings?.errors?.forEach(error => {
    const existing = allErrors.get(error.error_type)
    if (existing) {
      existing.count += error.count
    } else {
      allErrors.set(error.error_type, { count: error.count, sample: error.sample_message })
    }
  })

  const realTopErrors = Array.from(allErrors.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)

  // Get recent activity
  const realRecentActivity = [...history].reverse().slice(0, 10)

  // Use dummy or real data
  const analytics = hasRealData ? realAnalytics : dummyAnalytics
  const topErrors = hasRealData ? realTopErrors : dummyTopErrors.map(e => [e.errorType, { count: e.count, sample: e.sample }] as const)
  const recentActivity = hasRealData ? realRecentActivity : dummyRecentActivity

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Demo Mode Banner */}
      {!hasRealData && (
        <div className="bg-gradient-to-r from-[#00FF41]/10 via-cyan-500/10 to-purple-500/10 border border-[#00FF41]/30 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-[#00FF41]/20 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-6 w-6 text-[#00FF41]" />
            </div>
            <div className="flex-1">
              <h3 className="font-mono text-lg font-bold text-[#00FF41] mb-2">CloudWatch Log Analytics Dashboard</h3>
              <p className="font-mono text-sm text-gray-300 mb-3">
                Real-time insights and analytics for your AWS CloudWatch logs. The data below shows sample metrics from a production environment.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-cyan-400" />
                  <span className="font-mono text-xs text-gray-400">Connected to production-api</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#00FF41]" />
                  <span className="font-mono text-xs text-gray-400">Monitoring active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="font-mono text-xs text-gray-400">AI-powered analysis ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-gray-400 uppercase">Total Queries</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-white">{analytics.totalQueries}</div>
          <div className="font-mono text-xs text-gray-500 mt-1">Lifetime queries executed</div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-gray-400 uppercase">Logs Analyzed</span>
            <BarChart3 className="h-4 w-4 text-[#00FF41]" />
          </div>
          <div className="font-mono text-2xl font-bold text-white">{analytics.totalLogsAnalyzed.toLocaleString()}</div>
          <div className="font-mono text-xs text-gray-500 mt-1">Across all queries</div>
        </div>

        <div className="bg-[#1A1A1A] border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-gray-400 uppercase">Errors Found</span>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-red-400">{analytics.totalErrors}</div>
          <div className="font-mono text-xs text-gray-500 mt-1">Total error instances</div>
        </div>

        <div className="bg-[#1A1A1A] border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-gray-400 uppercase">Patterns Detected</span>
            <TrendingUp className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-yellow-400">{analytics.totalPatterns}</div>
          <div className="font-mono text-xs text-gray-500 mt-1">Identified patterns</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Errors */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-sm font-semibold text-white uppercase flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              Top Error Types
            </h3>
            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 font-mono text-xs">
              {topErrors.length} types
            </Badge>
          </div>

          {topErrors.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-[#00FF41] mx-auto mb-2" />
              <p className="font-mono text-sm text-gray-400">No errors detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topErrors.map(([errorType, data], idx) => (
                <div key={idx} className="bg-[#252525] border border-red-500/20 rounded-md p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-semibold text-red-400">{errorType}</span>
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 font-mono text-xs">
                      {data.count}
                    </Badge>
                  </div>
                  <p className="font-mono text-xs text-gray-400 line-clamp-1">{data.sample}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-sm font-semibold text-white uppercase flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              Recent Activity
            </h3>
            <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-mono text-xs">
              Last {recentActivity.length}
            </Badge>
          </div>

          <div className="space-y-2 max-h-96 overflow-auto">
            {recentActivity.map((item: any, idx) => (
              <div key={idx} className="bg-[#252525] border border-[#2A2A2A] rounded-md p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-mono text-xs text-gray-300 line-clamp-1 flex-1">
                    {hasRealData ? item.query : item.query}
                  </p>
                  <span className="font-mono text-xs text-gray-500 flex-shrink-0">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-mono text-xs text-gray-500">
                    {hasRealData
                      ? (item.response?.result?.logs_analyzed?.toLocaleString() || 0)
                      : item.logsAnalyzed.toLocaleString()
                    } logs
                  </span>
                  {((hasRealData && item.response?.result?.findings?.errors && item.response.result.findings.errors.length > 0) ||
                    (!hasRealData && item.errorCount > 0)) && (
                    <span className="font-mono text-xs text-red-400">
                      {hasRealData
                        ? item.response.result.findings.errors.reduce((sum: number, e: any) => sum + e.count, 0)
                        : item.errorCount
                      } errors
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Analysis Summary */}
      {response && (
        <div className="bg-gradient-to-r from-[#00FF41]/10 to-[#00FF41]/5 border border-[#00FF41]/30 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-[#00FF41]/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-[#00FF41]" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-semibold text-[#00FF41]">Latest Analysis</h3>
              <p className="font-mono text-xs text-gray-400">{response.result?.query_interpretation}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A]/50 border border-[#2A2A2A] rounded-md p-3">
              <div className="font-mono text-xs text-gray-400 uppercase mb-1">Logs Analyzed</div>
              <div className="font-mono text-xl font-bold text-white">
                {response.result?.logs_analyzed?.toLocaleString() || 0}
              </div>
            </div>

            <div className="bg-[#1A1A1A]/50 border border-red-500/30 rounded-md p-3">
              <div className="font-mono text-xs text-gray-400 uppercase mb-1">Errors</div>
              <div className="font-mono text-xl font-bold text-red-400">
                {response.result?.findings?.errors?.reduce((sum, e) => sum + e.count, 0) || 0}
              </div>
            </div>

            <div className="bg-[#1A1A1A]/50 border border-[#2A2A2A] rounded-md p-3">
              <div className="font-mono text-xs text-gray-400 uppercase mb-1">Patterns</div>
              <div className="font-mono text-xl font-bold text-yellow-400">
                {response.result?.findings?.patterns?.length || 0}
              </div>
            </div>

            <div className="bg-[#1A1A1A]/50 border border-yellow-500/30 rounded-md p-3">
              <div className="font-mono text-xs text-gray-400 uppercase mb-1">Anomalies</div>
              <div className="font-mono text-xl font-bold text-yellow-400">
                {response.result?.findings?.anomalies?.length || 0}
              </div>
            </div>
          </div>

          {response.result?.insights?.recommendations && response.result.insights.recommendations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#00FF41]/20">
              <div className="font-mono text-xs text-gray-400 uppercase mb-2">Key Recommendations</div>
              <ul className="space-y-1">
                {response.result.insights.recommendations.slice(0, 3).map((rec, idx) => (
                  <li key={idx} className="font-mono text-xs text-gray-300 flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-[#00FF41] mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [activeView, setActiveView] = useState<'terminal' | 'dashboard'>('dashboard')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<CloudWatchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<QueryHistoryItem[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [sessionId] = useState(() => `session-${Date.now()}`)

  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new response arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [response])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const result = await callAIAgent(query, AGENT_ID, {
        user_id: 'cloudwatch-user',
        session_id: sessionId
      })

      if (result.success) {
        const typedResponse = result.response as CloudWatchResponse
        setResponse(typedResponse)

        // Add to history
        setHistory(prev => [...prev, {
          query,
          timestamp: new Date().toISOString(),
          response: typedResponse
        }])
        setHistoryIndex(-1)
      } else {
        setError(result.error || 'Failed to analyze logs')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
      setQuery('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setQuery(history[history.length - 1 - newIndex].query)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setQuery(history[history.length - 1 - newIndex].query)
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setQuery('')
      }
    }
  }

  const handleClear = () => {
    setResponse(null)
    setError(null)
  }

  const handleExport = () => {
    if (!response) return

    const exportData = {
      query: history[history.length - 1]?.query || '',
      timestamp: new Date().toISOString(),
      analysis: response.result
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cloudwatch-analysis-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const handleFilterChange = (filter: string) => {
    // This would filter the displayed logs based on level
    console.log('Filter changed to:', filter)
  }

  return (
    <div className="h-screen flex flex-col bg-[#1E1E1E] font-mono">
      {/* Header */}
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onExport={handleExport}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Only show in terminal view */}
        {activeView === 'terminal' && (
          <Sidebar isOpen={isSidebarOpen} onFilterChange={handleFilterChange} />
        )}

        {/* Content Area */}
        {activeView === 'dashboard' ? (
          <Dashboard history={history} response={response} />
        ) : (
          <div className="flex-1 flex flex-col">
          {/* Terminal Output */}
          <ScrollArea ref={scrollRef} className="flex-1 bg-[#1E1E1E] p-4">
            <div className="max-w-6xl mx-auto space-y-4">
              {/* Welcome Message */}
              {!response && !error && (
                <div className="text-center py-12">
                  <TerminalIcon className="h-16 w-16 text-[#00FF41]/30 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-400 mb-2">CloudWatch Log Analyzer</h2>
                  <p className="text-sm text-gray-500 mb-4">Ask natural language questions about your AWS CloudWatch logs</p>
                  <div className="max-w-md mx-auto bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 text-left">
                    <div className="text-xs text-gray-400 uppercase mb-2">Example queries:</div>
                    <ul className="space-y-2 text-xs text-gray-500">
                      <li className="flex items-start gap-2">
                        <span className="text-[#00FF41]">→</span>
                        <span>Show me all errors in the last 2 hours</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#00FF41]">→</span>
                        <span>What caused the spike at 2pm today?</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#00FF41]">→</span>
                        <span>Analyze database connection errors</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-mono text-sm font-semibold text-red-400 mb-1">Error</div>
                      <p className="font-mono text-xs text-red-300">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 text-[#00FF41] animate-spin" />
                  <span className="font-mono text-sm text-gray-400">Analyzing CloudWatch logs...</span>
                </div>
              )}

              {/* Response Display */}
              {response && (
                <div className="space-y-4">
                  {/* Insight Banner */}
                  <InsightBanner response={response} />

                  {/* Log Entries */}
                  {response.result?.formatted_results && response.result.formatted_results.length > 0 && (
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg overflow-hidden">
                      <div className="bg-[#252525] px-4 py-2 border-b border-[#2A2A2A] flex items-center justify-between">
                        <span className="font-mono text-xs text-gray-400 uppercase">Log Entries</span>
                        <Badge variant="outline" className="bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/30 font-mono text-xs">
                          {response.result.formatted_results.length} results
                        </Badge>
                      </div>
                      <div>
                        {response.result.formatted_results.map((log, idx) => (
                          <LogEntry key={idx} log={log} onCopy={handleCopy} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Command Input */}
          <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] p-4">
            <div className="max-w-6xl mx-auto">
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <span className="text-[#00FF41] font-mono text-lg font-bold flex-shrink-0">&gt;</span>
                <Input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your query... (e.g., 'Show me all errors in the last hour')"
                  disabled={loading}
                  className="flex-1 bg-[#252525] border-[#2A2A2A] text-gray-300 font-mono text-sm placeholder:text-gray-600 focus-visible:ring-[#00FF41] focus-visible:border-[#00FF41]"
                />
                <Button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="bg-[#00FF41] text-black hover:bg-[#00FF41]/90 font-mono font-semibold px-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Executing
                    </>
                  ) : (
                    'Execute'
                  )}
                </Button>
                {response && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClear}
                    className="border-[#2A2A2A] text-gray-400 hover:text-gray-300 hover:bg-[#252525] font-mono"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </form>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                <span>Press Enter to execute • Up/Down arrows for history</span>
                {history.length > 0 && (
                  <span>{history.length} queries in history</span>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Copy Notification */}
      {copiedText && (
        <div className="fixed bottom-20 right-4 bg-[#00FF41] text-black px-4 py-2 rounded-md shadow-lg font-mono text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Copied to clipboard
        </div>
      )}
    </div>
  )
}
