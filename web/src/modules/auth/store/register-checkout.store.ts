import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type CheckoutStep = 0 | 1 | 2

export interface CompanyData {
  name: string
  document: string
  phone: string
}

export interface UserData {
  name: string
  email: string
  password: string
  password_confirmation: string
}

interface RegisterCheckoutState {
  step: CheckoutStep
  company: CompanyData
  user: UserData
  acceptedTerms: boolean

  setCompany: (data: CompanyData) => void
  setUser: (data: UserData) => void
  setAcceptedTerms: (value: boolean) => void
  nextStep: () => void
  previousStep: () => void
  goToStep: (step: CheckoutStep) => void
  reset: () => void
}

const initialCompany: CompanyData = { name: '', document: '', phone: '' }
const initialUser: UserData = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
}

export const CHECKOUT_STEPS = [
  { id: 0, label: 'Empresa' },
  { id: 1, label: 'Usuário' },
  { id: 2, label: 'Confirmar' },
] as const

const initialState = {
  step: 0 as CheckoutStep,
  company: initialCompany,
  user: initialUser,
  acceptedTerms: false,
}

export const useRegisterCheckoutStore = create<RegisterCheckoutState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCompany: (data) => set({ company: data }),
      setUser: (data) => set({ user: data }),
      setAcceptedTerms: (value) => set({ acceptedTerms: value }),

      nextStep: () => {
        const current = get().step
        if (current < 2) set({ step: (current + 1) as CheckoutStep })
      },

      previousStep: () => {
        const current = get().step
        if (current > 0) set({ step: (current - 1) as CheckoutStep })
      },

      goToStep: (step) => set({ step }),

      reset: () => {
        set(initialState)
        useRegisterCheckoutStore.persist.clearStorage()
      },
    }),
    {
      name: 'nox:register-checkout',
      storage: createJSONStorage(() => sessionStorage),
      // SEC-30: não persistir PII (empresa/usuário/senha); só progresso.
      partialize: (state) => ({
        step: Math.min(state.step, 2) as CheckoutStep,
      }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<RegisterCheckoutState>
        let step = (stored.step ?? 0) as number
        if (step > 2) step = 2

        return {
          ...current,
          step: Math.min(Math.max(step, 0), 2) as CheckoutStep,
        }
      },
    },
  ),
)
