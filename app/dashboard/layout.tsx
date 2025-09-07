import { MainNav } from "@/components/main-nav"
import { NotificationsProvider } from "@/hooks/use-notifications"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NotificationsProvider>
      <div className="flex min-h-screen flex-col">
        <MainNav />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </NotificationsProvider>
  )
}
