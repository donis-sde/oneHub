import * as React from "react"

function currentHash() {
  if (typeof window === "undefined") {
    return ""
  }
  return window.location.hash
}

export function useHashRoute() {
  const [hash, setHash] = React.useState(currentHash)

  React.useEffect(() => {
    const onChange = () => setHash(currentHash())
    window.addEventListener("hashchange", onChange)
    return () => window.removeEventListener("hashchange", onChange)
  }, [])

  return hash
}
