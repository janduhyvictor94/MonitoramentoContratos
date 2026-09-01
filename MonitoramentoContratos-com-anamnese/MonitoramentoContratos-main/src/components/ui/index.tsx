import React from 'react'
import { Loader2, X } from 'lucide-react'

// ─── Button ──────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-ink-900 text-cream-50 hover:bg-ink-800 focus:ring-ink-700 shadow-sm',
  gold:
    'bg-gold-600 text-cream-50 hover:bg-gold-700 focus:ring-gold-500 shadow-sm',
  secondary:
    'bg-cream-50 text-ink-800 border border-ink-200 hover:bg-cream-100 hover:border-gold-400 focus:ring-gold-300',
  ghost:
    'text-ink-600 hover:bg-cream-200 hover:text-ink-900 focus:ring-ink-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 tracking-wide',
  md: 'px-5 py-2.5 text-sm gap-2 tracking-wide',
  lg: 'px-6 py-3 text-base gap-2 tracking-wide',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-md
        focus:outline-none focus:ring-2 focus:ring-offset-1
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}

// ─── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
}

export function Input({
  label, error, hint, leftIcon, className = '', id, ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-ink-700 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            w-full rounded-md border bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900
            placeholder:text-ink-400 transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-500
            disabled:bg-cream-200 disabled:text-ink-500
            ${error ? 'border-red-400 focus:ring-red-400' : 'border-ink-200'}
            ${leftIcon ? 'pl-10' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

// ─── Select ──────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({
  label, error, options, className = '', id, ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-ink-700 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full rounded-md border bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900
          focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-500
          disabled:bg-cream-200 disabled:text-ink-500 transition-all duration-150
          ${error ? 'border-red-400' : 'border-ink-200'}
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Textarea ────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, className = '', id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-xs font-medium text-ink-700 uppercase tracking-wider">{label}</label>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full rounded-md border bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900
          placeholder:text-ink-400 transition-all duration-150 resize-y min-h-[100px]
          focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-500
          ${error ? 'border-red-400' : 'border-ink-200'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

// ─── Badge ───────────────────────────────────────────────────────────────────
interface BadgeProps {
  label: string
  className?: string
}

export function Badge({ label, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
}

const modalSizes: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-[98vw] w-[98vw]',
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null

  const isFull = size === 'full'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${modalSizes[size]} bg-cream-50 rounded-lg shadow-2xl flex flex-col ${
          isFull ? 'h-[96vh]' : 'max-h-[90vh]'
        } border border-ink-200`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 shrink-0">
          <h2 className="heading-serif text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-400 hover:bg-cream-200 hover:text-ink-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-hidden flex-1 flex flex-col">{children}</div>
      </div>
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div
      className={`bg-cream-50 rounded-lg border border-ink-100 shadow-sm ${
        padding ? 'p-6' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 rounded-full bg-cream-200 p-5 text-gold-600">{icon}</div>
      <h3 className="heading-serif mb-1 text-lg">{title}</h3>
      {description && <p className="mb-5 text-sm text-ink-500 max-w-sm">{description}</p>}
      {action}
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 22 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-gold-600" />
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  sub?: string
}

export function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <Card className="flex items-start gap-4">
      <div className={`rounded-lg p-3 ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="luxury-label text-ink-500">{label}</p>
        <p className="heading-serif text-3xl mt-1">{value}</p>
        {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
      </div>
    </Card>
  )
}