import { useAuth } from "@/contexts/auth-context"
import { useThemeCustomization } from "@/contexts/theme-customization-context"
import { useTheme } from "@/components/theme-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground text-sm">Your account information</p>
      </div>
      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed-in admin user details from /api/auth/me</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} readOnly />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Input value={user?.role ?? ""} readOnly className="capitalize" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { mode, customization, updateCustomization, resetCustomization } =
    useThemeCustomization()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Customize appearance and theme preferences
        </p>
      </div>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Light, dark, or system theme</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Theme customization</CardTitle>
          <CardDescription>
            Editing <span className="font-medium capitalize">{mode}</span> mode — values apply
            only to the currently active {mode} theme. Switch the appearance above to customize
            the other mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="primary">Primary color</Label>
            <Input
              id="primary"
              value={customization.primaryColor}
              onChange={(e) => updateCustomization({ primaryColor: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="accent">Accent color</Label>
            <Input
              id="accent"
              value={customization.accentColor}
              onChange={(e) => updateCustomization({ accentColor: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sidebar">Sidebar color</Label>
            <Input
              id="sidebar"
              value={customization.sidebarColor}
              onChange={(e) => updateCustomization({ sidebarColor: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="radius">Border radius</Label>
            <Input
              id="radius"
              value={customization.borderRadius}
              onChange={(e) => updateCustomization({ borderRadius: e.target.value })}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="font">Font family</Label>
            <Input
              id="font"
              value={customization.fontFamily}
              onChange={(e) => updateCustomization({ fontFamily: e.target.value })}
            />
          </div>
          <Button variant="outline" onClick={resetCustomization} className="sm:col-span-2 w-fit">
            Reset to defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
