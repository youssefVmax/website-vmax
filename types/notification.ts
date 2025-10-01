export type NotificationType = "info" | "warning" | "success" | "error" | "deal" | "callback" | "message"
export type PriorityType = "low" | "medium" | "high"

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  priority: PriorityType
  from: string
  fromAvatar?: string
  to: string[]
  timestamp: Date
  read: boolean
  dealId?: string
  dealName?: string
  dealStage?: string
  dealValue?: number
  isManagerMessage?: boolean
  actionRequired?: boolean
  // MySQL storage fields
  salesAgentId?: string
  salesAgent?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  callbackId?: string
  callbackStatus?: string
  callbackReason?: string
  targetId?: string
  userRole?: string
  teamName?: string
  isRead?: boolean
}
