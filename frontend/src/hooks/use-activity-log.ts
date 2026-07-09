import * as React from "react"

import { activityLog, type ActivityEntry } from "@/lib/activity-log"

export function useActivityLog() {
  const [entries, setEntries] = React.useState<ActivityEntry[]>(() =>
    activityLog.list(),
  )

  React.useEffect(() => {
    setEntries(activityLog.list())
    return activityLog.subscribe(setEntries)
  }, [])

  return {
    entries,
    clear: activityLog.clear,
  }
}
