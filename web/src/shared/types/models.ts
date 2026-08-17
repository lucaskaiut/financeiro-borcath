import type { Permission } from '@/shared/constants/permissions'

export interface Role {
  id: number
  name: string
  description: string | null
  is_default: boolean
  permissions?: Permission[]
}

export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  document: string | null
  is_master: boolean
  roles?: Role[]
  created_at: string | null
  updated_at: string | null
}

export interface Tenant {
  id: string
  name: string
  document: string
  email: string
  phone: string | null
  domain: string
  is_umbrella?: boolean
  created_at: string | null
  updated_at: string | null
}

export interface AvailableTenant {
  id: string
  name: string
  is_home?: boolean
  is_umbrella?: boolean
}

export interface Session {
  user: User
  tenant: Tenant
  roles: Role[]
  permissions: Permission[]
  is_master: boolean
  available_tenants: AvailableTenant[]
}
