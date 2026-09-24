'use client'

import { useEffect, useState, useRef, useMemo, memo } from 'react'
import { ChevronLeft, AlertCircle, Package as PackageIcon, X, ChevronDown, Search, ListFilter, Check, Trash2, Ban, Calendar, MoreVertical, Pencil, Eye, UserCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { extractMiscDescription } from '@/lib/transactionParser'
import { IOSKeyboard } from '@/components/IOSKeyboard'

// ─── Person Config ────────────────────────────────────────────
const PERSONS = [
    { canonical: 'Amit Mishra',         display: 'Amit',   color: '#007AFF', bg: '#EBF5FF', border: '#BFDBFE' },
    { canonical: 'Sumit Mishra',        display: 'Sumit',  color: '#34C759', bg: '#EDFAEF', border: '#BBF7D0' },
    { canonical: 'Shyam Sunder Mishra', display: 'SSM',    color: '#FF9500', bg: '#FFF4E5', border: '#FED7AA' },
    { canonical: 'Pankaj Sharma',       display: 'Pankaj', color: '#AF52DE', bg: '#F5EEFF', border: '#E9D5FF' },
] as const

interface ChatMessage {
    id: number
    rawText: string
    type: string
    amount: number
    companyName: string
    companyId: number | null
    packageId: number | null
    description: string | null
    status: string
    errorMsg: string | null
    paymentId: number | null
    chargeId: number | null
    salaryPaymentId?: number | null
    employeeId?: number | null
    person: string | null
    isEdited?: boolean
    createdAt: string
}

interface CompanyItem {
    id: number
    name: string
}

interface PackageItem {
    id: number
    description: string
}

interface EmployeeItem {
    id: number
    name: string
    salary: number
}

function renderFormattedText(textStr: string) {
    if (!textStr) return null
    // Match @ followed by optional space and person name token
    const regex = /(@\s*[A-Za-z0-9_]+)/g
    const tokens = textStr.split(regex)
    return tokens.map((token, idx) => {
        if (token.startsWith('@')) {
            const personName = token.substring(1).trim().toUpperCase()
            return (
                <span key={idx} className="text-[#111827] uppercase">
                    <span className="font-normal font-sans">@ </span>
                    <span className="font-bold font-sans">{personName}</span>
                </span>
            )
        }
        return <span key={idx}>{token}</span>
    })
}

/**
 * Color Coded Message Text Component (Native WhatsApp Style)
 * + AMOUNT    -> Standard Green (#00875A) e.g. "+ ₹20,000/-"
 * - AMOUNT    -> Standard Red (#D9383A)   e.g. "- ₹20,000/-"
 * Company     -> Standard Blue (#007AFF)
 * Description -> Standard Black (#111827)
 * @Person     -> Color-coded mention badge
 */
function ColorCodedMessageText({ text, companyName }: { text: string; companyName?: string | null }) {
    const raw = text.trim()
    if (!raw) return <span>{text}</span>

    const isPlus = raw.startsWith('+')
    const isMinus = raw.startsWith('-')

    if (!isPlus && !isMinus) {
        return <span className="font-normal text-[#111827] uppercase">{renderFormattedText(text.toUpperCase())}</span>
    }

    const sign = raw[0]
    const afterSign = raw.substring(1).trim()
    
    // Extract numerical amount
    const amountMatch = afterSign.match(/^(\d*\.?\d+)/)
    if (!amountMatch) {
        return <span className="font-normal text-[#111827] uppercase">{renderFormattedText(text.toUpperCase())}</span>
    }

    const amountStr = amountMatch[1]
    const amountNum = parseFloat(amountStr)
    const formattedAmount = !isNaN(amountNum) ? amountNum.toLocaleString('en-IN') : amountStr
    const restAfterAmount = afterSign.substring(amountMatch[0].length)

    // Standard WhatsApp/iOS colors with normal font weight
    const amountColorClass = isPlus 
        ? 'font-medium text-[#00875A]' 
        : 'font-medium text-[#D9383A]'

    // Isolate Company Name and Description
    let compPart = ''
    let descPart = restAfterAmount

    if (companyName) {
        const cleanCompName = companyName.replace(/^\d+\.?\s*/, '').trim().toUpperCase()
        const rawCompName = companyName.trim().toUpperCase()
        const uppercaseRest = restAfterAmount.toUpperCase()

        const matchComp = [cleanCompName, rawCompName].find(c => c && uppercaseRest.trim().startsWith(c))

        if (matchComp) {
            const matchIndex = uppercaseRest.indexOf(matchComp)
            compPart = restAfterAmount.substring(matchIndex, matchIndex + matchComp.length)
            descPart = restAfterAmount.substring(matchIndex + matchComp.length)
        }
    }

    const isMiscCompany = companyName === 'ECS MISC' || companyName?.toUpperCase().includes('MISC') || companyName?.toUpperCase().includes('MSC')

    if (!compPart && restAfterAmount.trim() && !isMinus && !isMiscCompany) {
        const trimmedRest = restAfterAmount.trim()
        const spaceIndex = trimmedRest.indexOf(' ')
        if (spaceIndex !== -1) {
            compPart = trimmedRest.substring(0, spaceIndex)
            descPart = trimmedRest.substring(spaceIndex)
        } else {
            compPart = trimmedRest
            descPart = ''
        }
    }

    const cleanComp = compPart.trim()
    const cleanDesc = descPart.trim()

    return (
        <span className="font-sans text-[15px] leading-relaxed tracking-normal font-normal">
            {/* + ₹20,000/- or - ₹20,000/- */}
            <span className={amountColorClass}>
                {sign} ₹{formattedAmount}/-
            </span>

            {/* GUARANTEED SPACE + COMPANY NAME */}
            {cleanComp && (
                <>
                    {' '}
                    <span className={cleanComp.toUpperCase().includes('MISC') || cleanComp.toUpperCase().includes('MSC')
                        ? "font-semibold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300/80 uppercase text-[13px]"
                        : "font-medium text-[#007AFF] uppercase"
                    }>
                        {cleanComp}
                    </span>
                </>
            )}

            {/* GUARANTEED SPACE + DESCRIPTION */}
            {cleanDesc && (
                <>
                    {' '}
                    <span className="font-normal text-[#111827] uppercase">
                        {renderFormattedText(cleanDesc)}
                    </span>
                </>
            )}
        </span>
    )
}

const TransactionMessageItem = memo(({ 
    msg, 
    activeMsgMenuId,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleContextMenu,
    handleBubbleClick,
    formatTime
}: {
    msg: ChatMessage,
    activeMsgMenuId: number | undefined,
    handleTouchStart: (msg: ChatMessage, e: any) => void,
    handleTouchEnd: () => void,
    handleTouchMove: () => void,
    handleContextMenu: (msg: ChatMessage, e: any) => void,
    handleBubbleClick: (msg: ChatMessage, e: any) => void,
    formatTime: (dateStr: string) => string
}) => {
    const isSuccess = msg.status === 'SUCCESS'
    const isDeleted = msg.status === 'DELETED'

    if (isDeleted) {
        return (
            <div className="flex justify-end pr-1.5 my-0.5">
                <div className="rounded-[14px] rounded-tr-[2px] px-3.5 py-2 min-w-[170px] max-w-[85%] shadow-md bg-[#EFECE6]/90 text-gray-500 relative flex items-center gap-2 italic text-[14px] select-none">
                    <Ban className="w-4 h-4 text-gray-400 shrink-0 not-italic stroke-[2]" />
                    <span className="font-normal text-[#667781] flex-1">This message was deleted</span>
                    <span className="text-[11px] text-[#8696a0] not-italic ml-2 self-end mb-0.5 font-sans">
                        {formatTime(msg.createdAt)}
                    </span>
                    
                    {/* Outgoing Top-Right Tail */}
                    <span className="absolute -right-[6px] top-0 w-[12px] h-[19px] overflow-hidden pointer-events-none">
                        <svg width="12" height="19" viewBox="0 0 12 19" fill="#EFECE6">
                            <path d="M0,0 L12,0 C7,3 4,7 0,14 Z" />
                        </svg>
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex justify-end pr-1.5 my-0.5 items-center">
            <div 
                onTouchStart={(e) => handleTouchStart(msg, e)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onMouseDown={(e) => handleTouchStart(msg, e)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onContextMenu={(e) => handleContextMenu(msg, e)}
                onClick={(e) => handleBubbleClick(msg, e)}
                className={`rounded-[14px] rounded-tr-[2px] px-3 py-2 min-w-[120px] max-w-[85%] shadow-sm bg-[#E7FFDB] text-[#111111] cursor-pointer active:scale-98 transition-all hover:shadow-md select-none ${
                    activeMsgMenuId === msg.id 
                        ? 'relative z-50 ring-2 ring-white/90 shadow-2xl scale-[1.02]' 
                        : 'relative'
                }`}
                title="Long press or tap for options (View, Edit, Delete)"
            >
                <div className="text-[15px] font-sans leading-snug break-words whitespace-pre-wrap font-normal">
                    <ColorCodedMessageText text={msg.rawText} companyName={msg.companyName} />
                    
                    {/* @Person tag for legacy messages where person wasn't inside rawText */}
                    {msg.person && !msg.rawText.includes('@') && (() => {
                        const p = PERSONS.find(p => p.canonical === msg.person)
                        return p ? (
                            <span className="text-[#111827] text-[15px] ml-1 uppercase">
                                <span className="font-normal font-sans">@ </span>
                                <span className="font-bold font-sans">{p.display.toUpperCase()}</span>
                            </span>
                        ) : null
                    })()}
                    
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#667781] ml-3 float-right mt-1 font-sans font-normal select-none">
                        {msg.isEdited && (
                            <span className="text-[10px] text-[#667781]/90 italic font-normal mr-0.5">
                                edited
                            </span>
                        )}
                        {formatTime(msg.createdAt)}
                        {isSuccess ? (
                            <svg viewBox="0 0 16 11" className="w-[16px] h-[11px] fill-[#53BDEB] inline-block shrink-0 ml-0.5">
                                <path d="M11.002 0.402l-6.302 6.303-2.302-2.302-1.398 1.398 3.7 3.7 7.7-7.7-1.398-1.398zm3.7 0l-7.7 7.7-1.3-1.3-1.4 1.4 2.7 2.7 9.1-9.1-1.4-1.4z" />
                            </svg>
                        ) : (
                            <span className="text-red-500 font-bold">!</span>
                        )}
                    </span>
                </div>

                {/* WhatsApp Outgoing Top-Right Tail */}
                <span className="absolute -right-[6px] top-0 w-[12px] h-[19px] overflow-hidden pointer-events-none">
                    <svg width="12" height="19" viewBox="0 0 12 19" fill="#E7FFDB">
                        <path d="M0,0 L12,0 C7,3 4,7 0,14 Z" />
                    </svg>
                </span>
            </div>
        </div>
    )
}, (prevProps, nextProps) => {
    // Only re-render if message status, edit state, or menu active state changes
    return (
        prevProps.msg.status === nextProps.msg.status &&
        prevProps.msg.isEdited === nextProps.msg.isEdited &&
        prevProps.msg.id === nextProps.msg.id &&
        (prevProps.activeMsgMenuId === prevProps.msg.id) === (nextProps.activeMsgMenuId === nextProps.msg.id)
    )
})
TransactionMessageItem.displayName = 'TransactionMessageItem'

export default function TransactionsPage() {
    const router = useRouter()
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [companies, setCompanies] = useState<CompanyItem[]>([])
    const [companyPackages, setCompanyPackages] = useState<PackageItem[]>([])
    
    // Filter & Search State (Unified iOS Filter: Person (+/-), Month, Company, Employee)
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
    const [filterPersons, setFilterPersons] = useState<string[]>([])
    const [filterPersonType, setFilterPersonType] = useState<'all' | 'income' | 'expense'>('all')
    const [filterMonth, setFilterMonth] = useState<string | null>(null)
    const [filterCompanyId, setFilterCompanyId] = useState<number | null>(null)
    const [filterEmployeeId, setFilterEmployeeId] = useState<number | null>(null)
    const [filterTab, setFilterTab] = useState<'person' | 'month' | 'company' | 'employee'>('person')
    const [filterCompanySearch, setFilterCompanySearch] = useState('')
    const [filterEmployeeSearch, setFilterEmployeeSearch] = useState('')

    // Form & Input State
    const [input, setInput] = useState('')
    const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null)
    const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null)
    const [employees, setEmployees] = useState<EmployeeItem[]>([])
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null)
    const [selectedPerson, setSelectedPerson] = useState<typeof PERSONS[number] | null>(null)
    const [isPersonPickerOpen, setIsPersonPickerOpen] = useState(false)
    const [warningMsg, setWarningMsg] = useState<string | null>(null)

    // Custom Transaction Date State (for adding entries to previous day / custom date)
    const [customEntryDate, setCustomEntryDate] = useState<string | null>(null)
    const [isDateMenuOpen, setIsDateMenuOpen] = useState(false)

    // Notification State
    const [activeNotification, setActiveNotification] = useState<{
        id: number
        rawText: string
        companyName?: string | null
    } | null>(null)
    const notificationTimerRef = useRef<NodeJS.Timeout | null>(null)

    const requestNotificationPermission = () => {
        // Request Push Permission synchronously on user interaction
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {})
        }
    }

    // Helper functions for date operations
    const getTodayStr = () => {
        const now = new Date()
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        const d = String(now.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
    }

    const formatDisplayCustomDate = (dateStr: string) => {
        if (!dateStr) return ''
        try {
            const [y, m, d] = dateStr.split('-').map(Number)
            const dateObj = new Date(y, m - 1, d)
            return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        } catch {
            return dateStr
        }
    }

    // Message Action Modal & Delete / Edit State
    const [activeMsgMenu, setActiveMsgMenu] = useState<{
        msg: ChatMessage
        rect: { top: number; bottom: number; left: number; right: number; width: number; height: number }
        placement: 'above' | 'below'
    } | null>(null)
    const [deletingMsgId, setDeletingMsgId] = useState<number | null>(null)
    const [confirmDeleteMsg, setConfirmDeleteMsg] = useState<ChatMessage | null>(null)
    const [editingMsgId, setEditingMsgId] = useState<number | null>(null)
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
    const isLongPressTriggered = useRef(false)

    const openContextMenu = (msg: ChatMessage, element: HTMLElement) => {
        const domRect = element.getBoundingClientRect()
        const rect = {
            top: domRect.top,
            bottom: domRect.bottom,
            left: domRect.left,
            right: domRect.right,
            width: domRect.width,
            height: domRect.height
        }
        const menuHeight = 155
        const spaceBelow = window.innerHeight - rect.bottom
        const placement: 'above' | 'below' = spaceBelow >= menuHeight + 15 ? 'below' : 'above'
        setActiveMsgMenu({
            msg,
            rect,
            placement
        })
    }

    const handleTouchStart = (msg: ChatMessage, e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
        if (msg.status === 'DELETED') return
        isLongPressTriggered.current = false
        const target = e.currentTarget
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = setTimeout(() => {
            isLongPressTriggered.current = true
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                try { window.navigator.vibrate(40) } catch {}
            }
            openContextMenu(msg, target)
        }, 380)
    }

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
        }
    }

    const handleTouchMove = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
        }
    }

    const handleContextMenu = (msg: ChatMessage, e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (msg.status === 'DELETED') return
        openContextMenu(msg, e.currentTarget)
    }

    const handleBubbleClick = (msg: ChatMessage, e: React.MouseEvent<HTMLDivElement>) => {
        if (msg.status === 'DELETED') return
        if (!isLongPressTriggered.current) {
            openContextMenu(msg, e.currentTarget)
        }
    }

    const handleViewMessage = (msg: ChatMessage) => {
        setActiveMsgMenu(null)
        if (msg.companyId) {
            handleNavigateToLedger(msg)
        } else if (msg.employeeId) {
            router.push(`/employee-payments/${msg.employeeId}`)
        } else {
            router.push('/expert-hisab')
        }
    }

    const handleEditMessage = async (msg: ChatMessage) => {
        setActiveMsgMenu(null)
        setEditingMsgId(msg.id)
        setInput(msg.rawText)
        if (msg.companyId) {
            const comp = companies.find(c => c.id === msg.companyId)
            if (comp) {
                setSelectedCompany(comp)
                try {
                    const res = await fetch(`/api/companies/${comp.id}`)
                    const data = await res.json()
                    if (data && Array.isArray(data.packages)) {
                        const pkgs = data.packages.map((p: any) => ({ id: p.id, description: p.description }))
                        setCompanyPackages(pkgs)
                        if (msg.packageId) {
                            const foundPkg = pkgs.find((p: any) => p.id === msg.packageId)
                            if (foundPkg) setSelectedPackage(foundPkg)
                        }
                    }
                } catch (err) {
                    console.error('Failed to load packages during edit:', err)
                }
            }
        } else {
            setSelectedCompany(null)
            setSelectedPackage(null)
            setCompanyPackages([])
        }
        if (msg.employeeId) {
            const emp = employees.find(e => e.id === msg.employeeId)
            if (emp) setSelectedEmployee(emp)
        } else {
            setSelectedEmployee(null)
        }
        const detected = detectPersonFromText(msg.rawText)
        if (detected) setSelectedPerson(detected)

        setTimeout(() => {
            setIsCustomKeyboardOpen(true)
        }, 100)
    }

    // Removed custom iOS transaction sound as per user request to use native OS tone

    const showNativeNotification = (msg: ChatMessage) => {
        try {
            const raw = (msg.rawText || '').trim()
            const afterSign = raw.startsWith('+') || raw.startsWith('-') ? raw.substring(1).trim() : raw
            const amountMatch = afterSign.match(/^(\d*\.?\d+)/)
            const isInc = msg.rawText.startsWith('+')
            const sign = isInc ? '+' : '-'
            const amountNum = msg.amount || (amountMatch ? parseFloat(amountMatch[1]) : 0)
            const formattedAmount = amountNum ? amountNum.toLocaleString('en-IN') : '0'
            const restText = amountMatch ? afterSign.substring(amountMatch[0].length).trim() : raw

            const notifTitle = amountMatch ? `${sign} ₹${formattedAmount}/- ${restText}`.trim() : raw
            const iconUrl = `${window.location.origin}/logo.jpg`

            const notifOptions: any = {
                body: msg.companyName ? `Company: ${msg.companyName}` : 'Recorded in Ledger',
                icon: iconUrl,
                badge: iconUrl,
                tag: `ecs-chat-${msg.id || Date.now()}`,
                renotify: true
            }

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((reg) => {
                    reg.showNotification(notifTitle, notifOptions)
                }).catch(() => {
                    if (typeof window !== 'undefined' && 'Notification' in window) {
                        try { new Notification(notifTitle, notifOptions) } catch {}
                    }
                })
            } else if (typeof window !== 'undefined' && 'Notification' in window) {
                try { new Notification(notifTitle, notifOptions) } catch {}
            }
        } catch (err) {
            console.error('Notification error:', err)
        }
    }

    const triggerIosNotification = (msg: ChatMessage) => {

        // 1.5 Haptic Feedback for iOS/Android
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([50, 80, 50])
        }

        // 2. In-app floating banner
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current)
        }
        setActiveNotification({
            id: Date.now(),
            rawText: msg.rawText,
            companyName: msg.companyName
        })
        notificationTimerRef.current = setTimeout(() => {
            setActiveNotification(null)
        }, 4000)

        // 3. OS Notification Center popup
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                showNativeNotification(msg)
            } else if (Notification.permission === 'default') {
                Notification.requestPermission().then((perm) => {
                    if (perm === 'granted') {
                        showNativeNotification(msg)
                    }
                }).catch(() => {})
            }
        }
    }

    const handleDeleteMessage = async (msg: ChatMessage) => {
        if (msg.status === 'DELETED') return
        setDeletingMsgId(msg.id)
        try {
            const res = await fetch(`/api/transactions/chat/${msg.id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                await res.json()
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'DELETED' } : m))
            } else {
                const err = await res.json()
                alert(err.error || 'Failed to delete transaction')
            }
        } catch (err) {
            console.error('Delete error:', err)
            alert('Network error while deleting transaction')
        } finally {
            setDeletingMsgId(null)
            setConfirmDeleteMsg(null)
        }
    }



    const handleNavigateToLedger = (msg: ChatMessage) => {
        setActiveMsgMenu(null)
        if (!msg.companyId) return
        if (msg.packageId) {
            if (msg.paymentId) {
                router.push(`/companies/${msg.companyId}/packages/${msg.packageId}?highlightPayment=${msg.paymentId}#payment-${msg.paymentId}`)
            } else if (msg.chargeId) {
                router.push(`/companies/${msg.companyId}/packages/${msg.packageId}?highlightCharge=${msg.chargeId}#charge-${msg.chargeId}`)
            } else {
                router.push(`/companies/${msg.companyId}/packages/${msg.packageId}`)
            }
        } else {
            router.push(`/companies/${msg.companyId}`)
        }
    }
    
    const [sending, setSending] = useState(false)
    const [loading, setLoading] = useState(true)
    const [isCustomKeyboardOpen, setIsCustomKeyboardOpen] = useState(false)
    const [cursorPosition, setCursorPosition] = useState(0)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputScrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (inputScrollRef.current) {
            inputScrollRef.current.scrollLeft = inputScrollRef.current.scrollWidth
        }
    }, [input, cursorPosition])

    const handleCustomKeyPress = (char: string) => {
        // Prevent typing after person tag
        const personEndMatch = input.match(/@\s*(AMIT|SUMIT|SSM|PAPA|MAMAJI|PANKAJ|BHAIYA)$/i)
        if (personEndMatch) {
            setWarningMsg('Cannot write anything after selecting person tag')
            return
        }

        // Prevent typing any non (+/-) key as first character when input is empty
        if (!input && char !== '+' && char !== '-') {
            setWarningMsg('Chat message MUST start with + or - symbol')
            return
        }

        const before = input.slice(0, cursorPosition)
        const after = input.slice(cursorPosition)
        const nextVal = (before + char + after).toUpperCase()
        setCursorPosition(prev => prev + 1)
        handleInputChange(nextVal)
    }

    const handleCustomBackspace = () => {
        if (cursorPosition > 0) {
            const before = input.slice(0, cursorPosition - 1)
            const after = input.slice(cursorPosition)
            const nextVal = before + after
            setCursorPosition(prev => prev - 1)
            handleInputChange(nextVal)
        }
    }

    


    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
    }

    const fetchMessages = async () => {
        try {
            const res = await fetch('/api/transactions/chat')
            const data = await res.json()
            if (Array.isArray(data)) {
                setMessages(data)
            }
        } catch (err) {
            console.error('Failed to fetch messages:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchCompanies = async () => {
        try {
            const res = await fetch('/api/companies')
            const data = await res.json()
            if (Array.isArray(data)) {
                setCompanies(data.map((c: any) => ({ id: c.id, name: c.name })))
            }
        } catch (err) {
            console.error('Failed to fetch companies:', err)
        }
    }

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees')
            const data = await res.json()
            if (Array.isArray(data)) {
                setEmployees(data.map((e: any) => ({ id: e.id, name: e.name, salary: parseFloat(e.salary) || 0 })))
            }
        } catch (err) {
            console.error('Failed to fetch employees:', err)
        }
    }

    const fetchCompanyPackages = async (companyId: number) => {
        try {
            const res = await fetch(`/api/companies/${companyId}`)
            const data = await res.json()
            if (data && Array.isArray(data.packages)) {
                setCompanyPackages(data.packages.map((p: any) => ({ id: p.id, description: p.description })))
            }
        } catch (err) {
            console.error('Failed to fetch company packages:', err)
        }
    }

    useEffect(() => {
        fetchMessages().then(scrollToBottom)
        fetchCompanies()
        fetchEmployees()

        // Register Service Worker for notifications
        if (typeof window !== 'undefined') {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch((err) => console.error('SW register error:', err))
            }
        }
    }, [])

    useEffect(() => {
        if (selectedCompany && selectedCompany.id !== -1) {
            fetchCompanyPackages(selectedCompany.id)
        } else {
            setCompanyPackages([])
            setSelectedPackage(null)
        }
    }, [selectedCompany])

    // Helper to test if message is Income (+) or Expense (-)
    const isMessageIncome = (msg: ChatMessage) => {
        return msg.rawText.trim().startsWith('+') || msg.paymentId !== null || msg.type === 'PAYMENT'
    }

    const isMessageExpense = (msg: ChatMessage) => {
        return msg.rawText.trim().startsWith('-') || msg.chargeId !== null || msg.salaryPaymentId !== null || msg.type === 'CHARGE' || msg.type === 'EXPENSE'
    }

    // Helper to format Year-Month
    const getMonthKey = (dateStr: string) => {
        try {
            const d = new Date(dateStr)
            if (isNaN(d.getTime())) return ''
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            return `${year}-${month}`
        } catch {
            return ''
        }
    }

    const formatMonthLabel = (monthKey: string) => {
        if (!monthKey) return ''
        const [yearStr, monthStr] = monthKey.split('-')
        const year = parseInt(yearStr)
        const month = parseInt(monthStr) - 1
        const d = new Date(year, month, 1)
        return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    }

    // Distinct available months derived from messages
    const availableMonths = useMemo(() => {
        const monthSet = new Set<string>()
        messages.forEach(m => {
            const key = getMonthKey(m.createdAt)
            if (key) monthSet.add(key)
        })
        if (monthSet.size === 0) {
            const now = new Date()
            const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            monthSet.add(key)
        }
        return Array.from(monthSet).sort().reverse()
    }, [messages])

    // Detect Sign, Amount, Company, and Description from current input text
    const getParsedInput = () => {
        const raw = input.trim()
        if (!raw) return { sign: null, amount: null, companyText: '', description: '' }

        const sign = raw[0] === '+' || raw[0] === '-' ? raw[0] : null
        const afterSign = sign ? raw.substring(1).trim() : raw
        const amountMatch = afterSign.match(/^(\d*\.?\d+)/)
        const amount = amountMatch ? parseFloat(amountMatch[1]) : null
        const restAfterAmount = amountMatch ? afterSign.substring(amountMatch[0].length).trim() : afterSign

        let companyText = ''
        let description = restAfterAmount

        if (selectedCompany && restAfterAmount) {
            const cleanName = selectedCompany.name.replace(/^\d+\.?\s*/, '').trim()
            if (restAfterAmount.toLowerCase().startsWith(cleanName.toLowerCase())) {
                companyText = cleanName
                description = restAfterAmount.substring(cleanName.length).trim()
            } else if (restAfterAmount.toLowerCase().startsWith(selectedCompany.name.toLowerCase())) {
                companyText = selectedCompany.name
                description = restAfterAmount.substring(selectedCompany.name.length).trim()
            }
        }

        return { sign, amount, companyText, description }
    }

    const { sign, amount } = getParsedInput()

    // Filter company suggestions as user types (includes ECS MISC head as first option)
    const getCompanySuggestions = () => {
        const raw = input.trim()
        if (raw.startsWith('-')) return [] // No company suggestions for Expenses!
        if (selectedCompany || !raw) return []
        const afterSign = raw.startsWith('+') ? raw.substring(1).trim() : raw
        const amountMatch = afterSign.match(/^(\d*\.?\d+)/)
        const rest = amountMatch ? afterSign.substring(amountMatch[0].length).trim() : afterSign

        const allHeads: CompanyItem[] = [
            { id: -1, name: 'ECS MISC' },
            ...companies
        ]

        if (!rest) return allHeads.slice(0, 8)

        // Strip @mention before matching company name
        const queryToken = rest.replace(/@[A-Z0-9_]+/gi, '').toLowerCase().trim()
        if (!queryToken) return allHeads.slice(0, 8)

        return allHeads.filter(c => {
            const cleanName = c.name.replace(/^\d+\.?\s*/, '').trim().toLowerCase()
            return cleanName.includes(queryToken) || c.name.toLowerCase().includes(queryToken)
        }).slice(0, 8)
    }

    const companySuggestions = getCompanySuggestions()

    // Filter employee suggestions as user types (ONLY for Expenses / '-')
    const getEmployeeSuggestions = () => {
        const raw = input.trim()
        if (!raw.startsWith('-')) return [] // Only for Expenses
        if (selectedEmployee || !employees.length) return []
        const afterSign = raw.substring(1).trim()
        const amountMatch = afterSign.match(/^(\d*\.?\d+)/)
        const rest = amountMatch ? afterSign.substring(amountMatch[0].length).trim() : afterSign
        if (!rest) return employees.slice(0, 8)

        // Strip @mention before matching employee name
        const queryToken = rest.replace(/@[A-Z0-9_]+/gi, '').toLowerCase().trim()
        if (!queryToken) return employees.slice(0, 8)

        return employees.filter(e => {
            const cleanName = e.name.toLowerCase().trim()
            return cleanName.includes(queryToken) || queryToken.includes(cleanName)
        }).slice(0, 8)
    }

    const employeeSuggestions = getEmployeeSuggestions()

    // Detect person from text if typed directly or selected
    const detectPersonFromText = (text: string) => {
        const upper = text.toUpperCase()
        if (/@\s*AMIT/i.test(upper)) return PERSONS[0]
        if (/@\s*SUMIT/i.test(upper)) return PERSONS[1]
        if (/@\s*(SSM|PAPA|MAMAJI|SHYAM)/i.test(upper)) return PERSONS[2]
        if (/@\s*(PANKAJ|BHAIYA)/i.test(upper)) return PERSONS[3]
        return null
    }

    // Handle Input Change with seamless reactive syncing:
    // 1. Must start with + or -
    // 2. Clearing text field wipes all previous selections
    // 3. Auto-convert input to UPPERCASE
    // 4. Typing @ triggers person picker options without stripping @
    // 5. Automatically updates / restores Company, Package, and Employee options as user types, deletes, or edits!
    const handleInputChange = (val: string) => {
        const upperVal = val.toUpperCase()

        // Clearing text field -> reset all selections
        if (!upperVal.trim()) {
            setInput('')
            setCursorPosition(0)
            setSelectedCompany(null)
            setSelectedPackage(null)
            setSelectedEmployee(null)
            setSelectedPerson(null)
            setIsPersonPickerOpen(false)
            setCompanyPackages([])
            setWarningMsg(null)
            return
        }

        // Must start with + or -
        if (upperVal.length > 0 && upperVal[0] !== '+' && upperVal[0] !== '-') {
            setWarningMsg('Input MUST start with + (Payment) or - (Expense)')
            return
        }

        // For expenses (-), clear any selected package and sync employee / ECS MISC head
        if (upperVal.startsWith('-')) {
            if (selectedPackage) setSelectedPackage(null)
            if (companyPackages.length > 0) setCompanyPackages([])

            const afterSign = upperVal.substring(1).trim()
            const amountMatch = afterSign.match(/^(\d*\.?\d+)/)
            const rest = amountMatch ? afterSign.substring(amountMatch[0].length).trim() : afterSign
            const textWithoutPerson = rest.replace(/@[A-Z0-9_]+/gi, '').trim()

            // Check if user typed ECS MISC / ECS MSC / MISC for expense
            const isMiscTyped = textWithoutPerson.includes('ECS MISC') || textWithoutPerson.includes('ECS MSC') || textWithoutPerson === 'MISC'
            if (isMiscTyped) {
                if (!selectedCompany || selectedCompany.id !== -1) {
                    setSelectedCompany({ id: -1, name: 'ECS MISC' })
                    setSelectedEmployee(null)
                }
            } else {
                // Check if selectedEmployee is still in text; if not, reset so suggestions appear
                if (selectedEmployee) {
                    const empName = selectedEmployee.name.toUpperCase().trim()
                    if (!textWithoutPerson.includes(empName)) {
                        setSelectedEmployee(null)
                    }
                } else if (textWithoutPerson && employees.length > 0 && selectedCompany?.id !== -1) {
                    // Auto-detect employee if typed in text (only if ECS MISC is not active)
                    const matchedEmp = employees.find(e => {
                        const empName = e.name.toUpperCase().trim()
                        return textWithoutPerson === empName ||
                               textWithoutPerson.startsWith(empName + ' ') ||
                               textWithoutPerson.includes(empName)
                    })
                    if (matchedEmp) {
                        setSelectedEmployee(matchedEmp)
                        setSelectedCompany(null)
                    }
                }
            }
        } else if (upperVal.startsWith('+')) {
            if (selectedEmployee) setSelectedEmployee(null)

            const afterSign = upperVal.substring(1).trim()
            const amountMatch = afterSign.match(/^(\d*\.?\d+)/)
            const rest = amountMatch ? afterSign.substring(amountMatch[0].length).trim() : afterSign
            const textWithoutPerson = rest.replace(/@[A-Z0-9_]+/gi, '').trim()

            // If selectedCompany is set to real company, verify it is still in the typed text
            let currentComp = selectedCompany
            if (currentComp && currentComp.id !== -1) {
                const cleanName = currentComp.name.replace(/^\d+\.?\s*/, '').toUpperCase().trim()
                const fullName = currentComp.name.toUpperCase().trim()
                const isStillInText = textWithoutPerson.includes(cleanName) || textWithoutPerson.includes(fullName)
                if (!isStillInText) {
                    currentComp = null
                    setSelectedCompany(null)
                    setSelectedPackage(null)
                    setCompanyPackages([])
                }
            }

            // Auto-detect ECS MISC head if explicitly typed in text
            const isMiscTyped = textWithoutPerson.includes('ECS MISC') || textWithoutPerson.includes('ECS MSC') || textWithoutPerson === 'MISC'
            if (isMiscTyped && (!currentComp || currentComp.id !== -1)) {
                currentComp = { id: -1, name: 'ECS MISC' }
                setSelectedCompany(currentComp)
                setSelectedPackage(null)
                setCompanyPackages([])
            }

            // If no company selected or just deleted, auto-detect if user typed full company name
            if (!currentComp && textWithoutPerson && companies.length > 0) {
                const matchedComp = companies.find(c => {
                    const clean = c.name.replace(/^\d+\.?\s*/, '').toUpperCase().trim()
                    const full = c.name.toUpperCase().trim()
                    return textWithoutPerson === clean || 
                           textWithoutPerson === full ||
                           textWithoutPerson.startsWith(clean + ' ') || 
                           textWithoutPerson.startsWith(full + ' ')
                })
                if (matchedComp) {
                    currentComp = matchedComp
                    setSelectedCompany(matchedComp)
                    fetchCompanyPackages(matchedComp.id)
                }
            }

            // Package auto-detection / verification from typed text
            if (currentComp && companyPackages.length > 0) {
                const matchedPkg = companyPackages.find(p => {
                    const desc = p.description.toUpperCase().trim()
                    return textWithoutPerson.includes(desc)
                })
                if (matchedPkg) {
                    setSelectedPackage(matchedPkg)
                }
            }
        }

        // Disallow writing anything after the person tag
        const personTagMatch = upperVal.match(/^(.*(@\s*(?:AMIT|SUMIT|SSM|PAPA|MAMAJI|PANKAJ|BHAIYA)))(.+)$/i)
        if (personTagMatch) {
            setWarningMsg('Cannot write anything after selecting person tag')
            setInput(personTagMatch[1])
            return
        }

        const hasAt = upperVal.includes('@')
        const detected = detectPersonFromText(upperVal)

        if (detected) {
            setSelectedPerson(detected)
            setIsPersonPickerOpen(false)
        } else if (hasAt) {
            setIsPersonPickerOpen(true)
            setSelectedPerson(null)
        } else {
            setIsPersonPickerOpen(false)
            setSelectedPerson(null)
        }

        setInput(upperVal)
        setWarningMsg(null)
    }

    const handleSelectEmployee = (emp: EmployeeItem) => {
        const cleanName = emp.name.toUpperCase().trim()
        const currentSign = sign || '-'
        const currentAmount = amount ? amount.toString() : ''
        const currentPerson = selectedPerson || detectPersonFromText(input)
        const personTag = currentPerson ? ` @ ${currentPerson.display.toUpperCase()}` : ''
        
        setInput(`${currentSign}${currentAmount} ${cleanName}${personTag}`.trimStart())
        setSelectedEmployee(emp)
        setSelectedCompany(null)
        if (currentPerson) setSelectedPerson(currentPerson)
        setWarningMsg(null)
        setIsCustomKeyboardOpen(true)
    }

    const handleSelectPerson = (p: typeof PERSONS[number]) => {
        setSelectedPerson(p)
        setIsPersonPickerOpen(false)

        const personTag = `@ ${p.display.toUpperCase()}`

        // Insert or replace @person at the end of input, ensuring space before @
        if (input.includes('@')) {
            const replacedTrailing = input.replace(/\s*@\s*[A-Z0-9_]*$/i, ` ${personTag}`)
            if (replacedTrailing !== input) {
                setInput(replacedTrailing.trimStart())
            } else {
                setInput(input.replace(/\s*@\s*[A-Z0-9_]*/i, ` ${personTag}`).trimStart())
            }
        } else {
            const trimmed = input.trimEnd()
            setInput(trimmed ? `${trimmed} ${personTag}` : personTag)
        }

        setWarningMsg(null)
        setIsCustomKeyboardOpen(true)
    }

    const handleSelectCompany = (comp: CompanyItem) => {
        if (comp.id === -1) {
            // ECS MISC head option selected: DO NOT write "ECS MISC" into text input!
            setSelectedCompany(comp)
            setSelectedPackage(null)
            setSelectedEmployee(null)
            setCompanyPackages([])
            setWarningMsg(null)
            setIsCustomKeyboardOpen(true)
            return
        }

        const cleanName = comp.name.replace(/^\d+\.?\s*/, '').trim().toUpperCase()
        const currentSign = sign || '+'
        const currentAmount = amount ? amount.toString() : ''
        const currentPerson = selectedPerson || detectPersonFromText(input)
        const personTag = currentPerson ? ` @ ${currentPerson.display.toUpperCase()}` : ''
        
        const finalText = `${currentSign}${currentAmount} ${cleanName}${personTag}`.trimStart()
        setInput(finalText)
        setCursorPosition(finalText.length)
        setSelectedCompany(comp)
        setSelectedPackage(null)
        setSelectedEmployee(null)
        if (currentPerson) setSelectedPerson(currentPerson)
        setWarningMsg(null)
        setIsCustomKeyboardOpen(true)
    }

    const handleSelectPackage = (pkg: PackageItem) => {
        if (selectedPackage?.id === pkg.id) {
            setSelectedPackage(null)
        } else {
            setSelectedPackage(pkg)
        }
        setWarningMsg(null)
        setIsCustomKeyboardOpen(true)
    }

    // Validation Rules:
    // For - (Expense):
    // 1. Must start with -
    // 2. Must contain valid positive amount
    // 3. Must tag a person (@Amit, @Sumit, @SSM, or @Pankaj)
    // 4. Description / Employee is optional
    // 5. NO company or package needed!
    //
    // For + (Payment):
    // 1. Must start with +
    // 2. Must contain valid positive amount
    // 3. Must select a company
    // 4. Must select a package (if company has packages)
    const validateTransactionInput = (): string | null => {
        const raw = input.trim()
        if (!raw) return 'Message MUST start with + or - symbol'
        
        if (raw[0] !== '+' && raw[0] !== '-') {
            return 'Invalid Format! Message MUST start with + (Payment) or - (Expense)'
        }
        
        const { amount, sign } = getParsedInput()

        if (!amount || amount <= 0) {
            return 'Please enter amount after ' + raw[0]
        }



        const isMiscEntry = selectedCompany?.id === -1 || raw.toUpperCase().includes('ECS MISC') || raw.toUpperCase().includes('ECS MSC')

        if (isMiscEntry) {
            const cleanDesc = extractMiscDescription(raw)
            if (!cleanDesc) {
                return 'Please enter a description for ECS MISC entries'
            }
        }

        // Expense Flow (starts with -)
        if (sign === '-') {
            const personToUse = selectedPerson || detectPersonFromText(raw)
            if (!personToUse) {
                return 'Please tag a person (@Amit, @Sumit, @SSM, or @Pankaj)'
            }
            return null // Valid Expense!
        }

        // Payment Flow (starts with +)
        if (!selectedCompany) {
            return 'Please select a company or ECS MISC head'
        }

        if (selectedCompany.id !== -1 && companyPackages.length > 0 && !selectedPackage) {
            return 'Please select a package'
        }

        return null // Valid Payment!
    }

    const isFormValid = !validateTransactionInput()

    const handleSend = async () => {
        requestNotificationPermission()
        setWarningMsg(null)
        
        const error = validateTransactionInput()
        if (error) {
            setWarningMsg(error)
            return
        }

        if (sending) return
        setSending(true)

        // Convert everything to UPPERCASE before saving
        const rawText = input.trim().toUpperCase()
        const personToUse = selectedPerson || detectPersonFromText(rawText)
        const isExpense = rawText.startsWith('-')
        const isMisc = selectedCompany?.id === -1 || rawText.includes('ECS MISC') || rawText.includes('ECS MSC')

        let empIdToSend = isExpense ? (selectedEmployee?.id || null) : null
        if (isExpense && !empIdToSend && employees.length > 0) {
            const matchedEmp = employees.find(e => {
                const empName = e.name.toUpperCase().trim()
                return rawText.includes(empName)
            })
            if (matchedEmp) empIdToSend = matchedEmp.id
        }

        const isEditing = Boolean(editingMsgId)
        try {
            if (editingMsgId) {
                try {
                    await fetch(`/api/transactions/chat/${editingMsgId}`, { method: 'DELETE' })
                    setMessages(prev => prev.filter(m => m.id !== editingMsgId))
                } catch (delErr) {
                    console.warn('Edit delete error:', delErr)
                }
                setEditingMsgId(null)
            }

            const body = {
                text: rawText,
                companyId: isExpense || isMisc ? null : selectedCompany?.id,
                companyName: isMisc ? 'ECS MISC' : (selectedCompany?.name || ''),
                isMisc,
                packageId: isExpense || isMisc ? null : selectedPackage?.id,
                employeeId: empIdToSend,
                person: personToUse?.canonical || null,
                isExpense,
                isEdited: isEditing,
                customDate: customEntryDate || undefined
            }

            const res = await fetch('/api/transactions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const msg = await res.json()
            if (msg.id) {
                setMessages(prev => {
                    const next = [...prev, msg]
                    return next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                })
                triggerIosNotification(msg)
            }

            // Reset form on success
            setInput('')
            setCursorPosition(0)
            setSelectedCompany(null)
            setSelectedPackage(null)
            setSelectedEmployee(null)
            setCompanyPackages([])
            setSelectedPerson(null)
            setIsPersonPickerOpen(false)
            setWarningMsg(null)
            scrollToBottom()
        } catch (err) {
            console.error('Send error:', err)
            setWarningMsg('Failed to record entry. Please try again.')
        } finally {
            setSending(false)
            setIsCustomKeyboardOpen(true)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement | HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (isFormValid) {
                handleSend()
            } else {
                const err = validateTransactionInput()
                if (err) setWarningMsg(err)
            }
            return
        }

        // Prevent typing after person tag
        const personEndMatch = input.match(/@\s*(AMIT|SUMIT|SSM|PAPA|MAMAJI|PANKAJ|BHAIYA)$/i)
        if (personEndMatch && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const personStartIndex = input.lastIndexOf('@')
            const sel = typeof window !== 'undefined' ? window.getSelection() : null
            const cursorPos = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startOffset : input.length
            if (cursorPos > personStartIndex) {
                e.preventDefault()
                setWarningMsg('Cannot write anything after selecting person tag')
                return
            }
        }

        // Prevent typing any non (+/-) key as first character when input is empty
        if (!input && e.key.length === 1 && e.key !== '+' && e.key !== '-' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault()
            setWarningMsg('Chat message MUST start with + or - symbol')
        }
    }

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    }

    // Group messages by date for iOS WhatsApp date separators
    const getDateLabel = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        if (d.toDateString() === now.toDateString()) return 'Today'
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
        
        // Show formatted date e.g. "18 Sep 2026" or "18/09/2026"
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    // Filter helper functions
    const matchesSinglePerson = (msg: ChatMessage, targetPerson: string) => {
        const p = (msg.person || '').toLowerCase()
        const raw = (msg.rawText || '').toLowerCase()
        if (targetPerson === 'Amit Mishra') {
            return p.includes('amit') || /@\s*amit/i.test(raw)
        }
        if (targetPerson === 'Sumit Mishra') {
            return p.includes('sumit') || /@\s*sumit/i.test(raw)
        }
        if (targetPerson === 'Shyam Sunder Mishra') {
            return p.includes('shyam') || p.includes('ssm') || p.includes('mishra') || /@\s*(ssm|shyam|papa|mamaji)/i.test(raw)
        }
        if (targetPerson === 'Pankaj Sharma') {
            return p.includes('pankaj') || /@\s*(pankaj|bhaiya)/i.test(raw)
        }
        return p.includes(targetPerson.toLowerCase()) || raw.includes(targetPerson.toLowerCase())
    }

    const matchesPersons = (msg: ChatMessage, targetPersons: string[]) => {
        if (!targetPersons || targetPersons.length === 0) return true
        return targetPersons.some(targetPerson => matchesSinglePerson(msg, targetPerson))
    }

    const matchesType = (msg: ChatMessage, type: 'all' | 'income' | 'expense') => {
        if (type === 'all') return true
        if (type === 'income') return isMessageIncome(msg)
        if (type === 'expense') return isMessageExpense(msg)
        return true
    }

    const matchesMonth = (msg: ChatMessage, monthKey: string | null) => {
        if (!monthKey) return true
        return getMonthKey(msg.createdAt) === monthKey
    }

    const matchesCompany = (msg: ChatMessage, compId: number | null) => {
        if (compId === null) return true
        return msg.companyId === compId
    }

    const matchesEmployee = (msg: ChatMessage, empId: number | null) => {
        if (empId === null) return true
        if (msg.employeeId === empId) return true
        const targetEmp = employees.find(e => e.id === empId)
        if (targetEmp) {
            const empName = targetEmp.name.toLowerCase().trim()
            const desc = (msg.description || '').toLowerCase()
            const raw = (msg.rawText || '').toLowerCase()
            return desc.includes(empName) || raw.includes(empName)
        }
        return false
    }

    // Filter messages based on search query, persons (+/- type), month, company, and employee
    const filteredMessages = messages.filter(msg => {
        if (!matchesCompany(msg, filterCompanyId)) return false
        if (!matchesPersons(msg, filterPersons)) return false
        if (!matchesType(msg, filterPersonType)) return false
        if (!matchesMonth(msg, filterMonth)) return false
        if (!matchesEmployee(msg, filterEmployeeId)) return false

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim()
            const textMatch = msg.rawText.toLowerCase().includes(q)
            const compMatch = msg.companyName?.toLowerCase().includes(q)
            const amountMatch = msg.amount?.toString().includes(q)
            const personMatch = msg.person?.toLowerCase().includes(q)
            if (!textMatch && !compMatch && !amountMatch && !personMatch) return false
        }
        return true
    })

    const activeFilterCount = 
        (filterPersons.length > 0 ? 1 : 0) + 
        (filterPersonType !== 'all' ? 1 : 0) + 
        (filterMonth !== null ? 1 : 0) + 
        (filterCompanyId !== null ? 1 : 0) + 
        (filterEmployeeId !== null ? 1 : 0)

    const handleClearAllFilters = () => {
        setFilterPersons([])
        setFilterPersonType('all')
        setFilterMonth(null)
        setFilterCompanyId(null)
        setFilterEmployeeId(null)
        setFilterCompanySearch('')
        setFilterEmployeeSearch('')
    }

    const messagesWithDates: (ChatMessage | { _dateSeparator: string })[] = []
    let lastDate = ''
    for (const msg of filteredMessages) {
        const dateLabel = getDateLabel(msg.createdAt)
        if (dateLabel !== lastDate) {
            messagesWithDates.push({ _dateSeparator: dateLabel })
            lastDate = dateLabel
        }
        messagesWithDates.push(msg)
    }

    return (
        <div className="flex flex-col h-full relative font-sans overflow-hidden select-none" style={{ backgroundColor: '#EFEAE2' }}>
            {/* iOS WhatsApp Header */}
            <header className="shrink-0 z-20 px-3.5 py-3 flex items-center justify-between bg-[#F6F6F6]/95  border-b border-gray-300/80 shadow-xs min-h-[68px]">
                {isSearchOpen ? (
                    <div className="flex items-center gap-2.5 w-full animate-in fade-in duration-200">
                        {/* Search Pill Input (Matching iOS WhatsApp Screenshot) */}
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 text-gray-800 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />
                            <input 
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                                tabIndex={-1}
                                className="w-full bg-[#F5F3EF] hover:bg-[#EFECE6] focus:bg-white text-gray-900 text-[16px] font-normal pl-11 pr-9 py-2.5 rounded-full outline-none border border-gray-300/50 focus:border-[#007AFF] transition-all shadow-xs"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')} 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Separate Circular Close Button (Matching iOS WhatsApp Screenshot) */}
                        <button 
                            onClick={() => { setIsSearchOpen(false); setSearchQuery('') }} 
                            className="w-11 h-11 rounded-full bg-[#F5F3EF] hover:bg-gray-200 border border-gray-300/50 shadow-xs flex items-center justify-center shrink-0 active:scale-95 transition-all text-gray-900"
                            title="Close Search"
                        >
                            <X className="w-5 h-5 stroke-[2]" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                            <Link href="/expert-hisab" className="flex items-center text-[#007AFF] font-medium text-[16px] -ml-1 active:opacity-60 transition-opacity shrink-0">
                                <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
                            </Link>
                            
                            {/* Group Icon & Details */}
                            <div className="flex items-center gap-2.5 min-w-0">
                                <img 
                                    src="/logo.jpg" 
                                    alt="Logo" 
                                    className="w-[42px] h-[42px] rounded-full object-cover shrink-0 border border-gray-200 shadow-xs"
                                />
                                <div className="flex flex-col min-w-0">
                                    <h1 className="text-[16px] sm:text-[17px] font-bold text-gray-900 truncate leading-tight tracking-tight">EXPERT HISAB KITAB</h1>
                                    {activeFilterCount > 0 && (
                                        <span className="text-[11px] font-medium text-blue-700 truncate flex items-center gap-1">
                                            {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''} ({filteredMessages.length} results)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Header Actions (iPhone Default Filter Icon & Search Icon) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* iPhone Default Top Filter Dropdown Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                    className={`p-2 rounded-full transition-all active:scale-95 flex items-center justify-center relative ${
                                        activeFilterCount > 0 
                                            ? 'text-[#007AFF] bg-blue-100/90 font-bold' 
                                            : 'text-[#007AFF] hover:bg-gray-200/60'
                                    }`}
                                    title="Filter Transactions"
                                >
                                    <ListFilter className="w-5 h-5 stroke-[2.2]" />
                                    {activeFilterCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#007AFF] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#F6F6F6] shadow-xs">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>

                                {/* Top-Down iOS Dropdown Popover */}
                                {isFilterMenuOpen && (
                                    <>
                                        {/* Backdrop to close on tap outside */}
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => { setIsFilterMenuOpen(false); setFilterCompanySearch(''); setFilterEmployeeSearch(''); }} 
                                        />

                                        {/* Dropdown Card */}
                                        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white/95  rounded-2xl shadow-2xl border border-gray-200/80 z-50 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in slide-in-from-top-2 duration-150">
                                            {/* Dropdown Header */}
                                            <div className="px-3.5 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                                                <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                                                    Filter
                                                </span>
                                                {activeFilterCount > 0 && (
                                                    <button
                                                        onClick={handleClearAllFilters}
                                                        className="text-[12px] font-semibold text-[#007AFF] hover:underline"
                                                    >
                                                        Reset ({activeFilterCount})
                                                    </button>
                                                )}
                                            </div>

                                            {/* iOS Segmented Control (Person, Month, Company, Employee) */}
                                            <div className="p-2 bg-gray-50/50 border-b border-gray-100">
                                                <div className="grid grid-cols-4 bg-[#767680]/15 p-0.5 rounded-[9px] text-[11px] sm:text-[12px]">
                                                    <button
                                                        onClick={() => setFilterTab('person')}
                                                        className={`py-1 rounded-[7px] transition-all flex items-center justify-center gap-0.5 ${
                                                            filterTab === 'person'
                                                                ? 'bg-white text-black font-semibold shadow-xs'
                                                                : 'text-[#3C3C43]/60 hover:text-black font-medium'
                                                        }`}
                                                    >
                                                        <span>Person</span>
                                                        {(filterPersons.length > 0 || filterPersonType !== 'all') && <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF]" />}
                                                    </button>

                                                    <button
                                                        onClick={() => setFilterTab('month')}
                                                        className={`py-1 rounded-[7px] transition-all flex items-center justify-center gap-0.5 ${
                                                            filterTab === 'month'
                                                                ? 'bg-white text-black font-semibold shadow-xs'
                                                                : 'text-[#3C3C43]/60 hover:text-black font-medium'
                                                        }`}
                                                    >
                                                        <span>Month</span>
                                                        {filterMonth !== null && <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF]" />}
                                                    </button>

                                                    <button
                                                        onClick={() => setFilterTab('company')}
                                                        className={`py-1 rounded-[7px] transition-all flex items-center justify-center gap-0.5 ${
                                                            filterTab === 'company'
                                                                ? 'bg-white text-black font-semibold shadow-xs'
                                                                : 'text-[#3C3C43]/60 hover:text-black font-medium'
                                                        }`}
                                                    >
                                                        <span>Company</span>
                                                        {filterCompanyId !== null && <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF]" />}
                                                    </button>

                                                    <button
                                                        onClick={() => setFilterTab('employee')}
                                                        className={`py-1 rounded-[7px] transition-all flex items-center justify-center gap-0.5 ${
                                                            filterTab === 'employee'
                                                                ? 'bg-white text-black font-semibold shadow-xs'
                                                                : 'text-[#3C3C43]/60 hover:text-black font-medium'
                                                        }`}
                                                    >
                                                        <span>Employee</span>
                                                        {filterEmployeeId !== null && <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF]" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Scrollable Options List */}
                                            <div className="flex-1 overflow-y-auto ios-scroll max-h-64 divide-y divide-gray-50">
                                                {/* 1. Person Tab (Includes Income / Expense toggle & Multiple Selection) */}
                                                {filterTab === 'person' && (
                                                    <div>
                                                        {/* Income / Expense toggle for Person */}
                                                        <div className="p-2 border-b border-gray-100 bg-gray-50/70">
                                                            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">
                                                                Transaction Type
                                                            </div>
                                                            <div className="grid grid-cols-3 bg-[#767680]/15 p-0.5 rounded-[8px] text-[12px]">
                                                                <button
                                                                    onClick={() => setFilterPersonType('all')}
                                                                    className={`py-1 rounded-[6px] transition-all font-medium ${
                                                                        filterPersonType === 'all'
                                                                            ? 'bg-white text-black font-semibold shadow-xs'
                                                                            : 'text-[#3C3C43]/70 hover:text-black'
                                                                    }`}
                                                                >
                                                                    All
                                                                </button>
                                                                <button
                                                                    onClick={() => setFilterPersonType('income')}
                                                                    className={`py-1 rounded-[6px] transition-all font-medium ${
                                                                        filterPersonType === 'income'
                                                                            ? 'bg-[#00875A] text-white font-semibold shadow-xs'
                                                                            : 'text-[#00875A] hover:bg-white/50'
                                                                    }`}
                                                                >
                                                                    + Income
                                                                </button>
                                                                <button
                                                                    onClick={() => setFilterPersonType('expense')}
                                                                    className={`py-1 rounded-[6px] transition-all font-medium ${
                                                                        filterPersonType === 'expense'
                                                                            ? 'bg-[#D9383A] text-white font-semibold shadow-xs'
                                                                            : 'text-[#D9383A] hover:bg-white/50'
                                                                    }`}
                                                                >
                                                                    - Expense
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Person List with Multi-Select */}
                                                        <button
                                                            onClick={() => { setFilterPersons([]); }}
                                                            className={`w-full px-3.5 py-2.5 text-[14px] flex items-center justify-between text-left transition-colors ${
                                                                filterPersons.length === 0 ? 'font-semibold text-[#007AFF] bg-blue-50/60' : 'text-gray-800 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <span>All Persons</span>
                                                            {filterPersons.length === 0 && <Check className="w-4 h-4 text-[#007AFF] shrink-0" />}
                                                        </button>
                                                        {PERSONS.map(p => {
                                                            const isSelected = filterPersons.includes(p.canonical)
                                                            return (
                                                                <button
                                                                    key={p.canonical}
                                                                    onClick={() => {
                                                                        setFilterPersons(prev => 
                                                                            prev.includes(p.canonical)
                                                                                ? prev.filter(x => x !== p.canonical)
                                                                                : [...prev, p.canonical]
                                                                        )
                                                                    }}
                                                                    className={`w-full px-3.5 py-2.5 text-[14px] flex items-center justify-between text-left transition-colors ${
                                                                        isSelected ? 'font-semibold text-[#007AFF] bg-blue-50/60' : 'text-gray-800 hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    <span>{p.display}</span>
                                                                    {isSelected && <Check className="w-4 h-4 text-[#007AFF] shrink-0" />}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                )}

                                                {/* 2. Month Tab */}
                                                {filterTab === 'month' && (
                                                    <>
                                                        <button
                                                            onClick={() => { setFilterMonth(null); setIsFilterMenuOpen(false); }}
                                                            className={`w-full px-3.5 py-2.5 text-[14px] flex items-center justify-between text-left transition-colors ${
                                                                filterMonth === null ? 'font-semibold text-[#007AFF] bg-blue-50/60' : 'text-gray-800 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <span>All Months</span>
                                                            {filterMonth === null && <Check className="w-4 h-4 text-[#007AFF] shrink-0" />}
                                                        </button>
                                                        {availableMonths.map(mKey => {
                                                            const isSelected = filterMonth === mKey
                                                            const count = messages.filter(m => getMonthKey(m.createdAt) === mKey).length
                                                            return (
                                                                <button
                                                                    key={mKey}
                                                                    onClick={() => { setFilterMonth(isSelected ? null : mKey); setIsFilterMenuOpen(false); }}
                                                                    className={`w-full px-3.5 py-2.5 text-[14px] flex items-center justify-between text-left transition-colors ${
                                                                        isSelected ? 'font-semibold text-[#007AFF] bg-blue-50/60' : 'text-gray-800 hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span>{formatMonthLabel(mKey)}</span>
                                                                        <span className="text-[11px] font-normal text-gray-400">({count})</span>
                                                                    </div>
                                                                    {isSelected && <Check className="w-4 h-4 text-[#007AFF] shrink-0" />}
                                                                </button>
                                                            )
                                                        })}
                                                    </>
                                                )}

                                                {/* 3. Company Tab */}
                                                {filterTab === 'company' && (
                                                    <>
                                                        <div className="p-2 border-b border-gray-100 bg-white">
                                                            <div className="relative">
                                                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search"
                                                                    value={filterCompanySearch}
                                                                    onChange={(e) => setFilterCompanySearch(e.target.value)}
                                                                    autoFocus
                                                                    tabIndex={-1}
                                                                    className="w-full bg-[#767680]/12 text-[13px] rounded-lg pl-7 pr-7 py-1 text-black placeholder:text-gray-400 outline-none border border-transparent focus:border-[#007AFF]/40"
                                                                />
                                                                {filterCompanySearch && (
                                                                    <button
                                                                        onClick={() => setFilterCompanySearch('')}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-0.5"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => { setFilterCompanyId(null); setIsFilterMenuOpen(false); setFilterCompanySearch(''); }}
                                                            className={`w-full px-3.5 py-2.5 text-[14px] flex items-center justify-between text-left transition-colors ${
                                                                filterCompanyId === null ? 'font-semibold text-[#007AFF] bg-blue-50/60' : 'text-gray-800 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <span>All Companies</span>
                                                            {filterCompanyId === null && <Check className="w-4 h-4 text-[#007AFF] shrink-0" />}
                                                        </button>

                                                        {companies
                                                            .filter(comp => {
                                                                if (!filterCompanySearch.trim()) return true
                                                                const q = filterCompanySearch.toLowerCase().trim()
                                                                const cleanName = comp.name.replace(/^\d+\.?\s*/, '').toLowerCase()
                                                                return cleanName.includes(q) || comp.name.toLowerCase().includes(q)
                                                            })
                                                            .map(comp => {
                                                                const isSelected = filterCompanyId === comp.id
                                                                const cleanName = comp.name.replace(/^\d+\.?\s*/, '')
                                                                return (
                                                                    <button
                                                                        key={comp.id}
                                                                        onClick={() => { setFilterCompanyId(isSelected ? null : comp.id); setIsFilterMenuOpen(false); setFilterCompanySearch(''); }}
                                                                        className={`w-full px-3.5 py-2.5 text-[14px] flex items-center justify-between text-left transition-colors ${
                                                                            isSelected ? 'font-semibold text-[#007AFF] bg-blue-50/60' : 'text-gray-800 hover:bg-gray-50'
                                                                        }`}
                                                                    >
                                                                        <span className="truncate pr-2">{cleanName}</span>
                                                                        {isSelected && <Check className="w-4 h-4 text-[#007AFF] shrink-0" />}
                                                                    </button>
                                                                )
                                                            })}

                                                        {companies.filter(comp => {
                                                            if (!filterCompanySearch.trim()) return true
                                                            const q = filterCompanySearch.toLowerCase().trim()
                                                            const cleanName = comp.name.replace(/^\d+\.?\s*/, '').toLowerCase()
                                                            return cleanName.includes(q) || comp.name.toLowerCase().includes(q)
                                                        }).length === 0 && (
                                                            <div className="px-4 py-5 text-center text-gray-400 text-[13px]">
                                                                No companies found
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* 4. Employee Tab */}
                                                {filterTab === 'employee' && (
                                                    <>
                                                        <div className="p-2 border-b border-gray-100 bg-white">
                                                            <div className="relative">
                                                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search"
                                                                    value={filterEmployeeSearch}
                                                                    onChange={(e) => setFilterEmployeeSearch(e.target.value)}
                                                                    autoFocus
                                                                    tabIndex={-1}
                                                                    className="w-full bg-[#767680]/12 text-[13px] rounded-lg pl-7 pr-7 py-1 text-black placeholder:text-gray-400 outline-none border border-transparent focus:border-[#007AFF]/40"
                                                                />
                                                                {filterEmployeeSearch && (
                                                                    <button
                                                                        onClick={() => setFilterEmployeeSearch('')}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-0.5"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => { setFilterEmployeeId(null); setIsFilterMenuOpen(false); setFilterEmployeeSearch(''); }}
                                                            className={`w-full px-3.5 py-2.5 text-[14px] flex items-center justify-between text-left transition-colors ${
                                                                filterEmployeeId === null ? 'font-semibold text-[#007AFF] bg-blue-50/60' : 'text-gray-800 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <span>All Employees</span>
                                                            {filterEmployeeId === null && <Check className="w-4 h-4 text-[#007AFF] shrink-0" />}
                                                        </button>

                                                        {employees
                                                            .filter(emp => {
                                                                if (!filterEmployeeSearch.trim()) return true
                                                                const q = filterEmployeeSearch.toLowerCase().trim()
                                                                return emp.name.toLowerCase().includes(q)
                                                            })
                                                            .map(emp => {
                                                                const isSelected = filterEmployeeId === emp.id
                                                                return (
                                                                    <button
                                                                        key={emp.id}
                                                                        onClick={() => { setFilterEmployeeId(isSelected ? null : emp.id); setIsFilterMenuOpen(false); setFilterEmployeeSearch(''); }}
                                                                        className={`w-full px-3.5 py-2.5 text-[14px] flex items-center justify-between text-left transition-colors ${
                                                                            isSelected ? 'font-semibold text-[#007AFF] bg-blue-50/60' : 'text-gray-800 hover:bg-gray-50'
                                                                        }`}
                                                                    >
                                                                        <span className="truncate pr-2">{emp.name}</span>
                                                                        {isSelected && <Check className="w-4 h-4 text-[#007AFF] shrink-0" />}
                                                                    </button>
                                                                )
                                                            })}

                                                        {employees.filter(emp => {
                                                            if (!filterEmployeeSearch.trim()) return true
                                                            const q = filterEmployeeSearch.toLowerCase().trim()
                                                            return emp.name.toLowerCase().includes(q)
                                                        }).length === 0 && (
                                                            <div className="px-4 py-5 text-center text-gray-400 text-[13px]">
                                                                No employees found
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Three Dots Menu Button for Date Selection */}
                            <div className="relative">
                                <button 
                                    onClick={() => {
                                        setIsDateMenuOpen(!isDateMenuOpen)
                                        setIsFilterMenuOpen(false)
                                    }}
                                    className={`p-2 rounded-full active:scale-95 transition-all relative ${
                                        customEntryDate
                                            ? 'text-[#007AFF] bg-blue-50/90 hover:bg-blue-100/70'
                                            : 'text-gray-600 hover:bg-gray-200/60'
                                    }`}
                                    title="Transaction Date Options (Add for Past / Custom Date)"
                                >
                                    <MoreVertical className="w-5 h-5 stroke-[2.2]" />
                                    {customEntryDate && (
                                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#007AFF] ring-2 ring-white" />
                                    )}
                                </button>

                                {/* Date Selection Popover Menu */}
                                {isDateMenuOpen && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setIsDateMenuOpen(false)} 
                                        />
                                        <div className="absolute right-0 top-full mt-2 w-[240px] bg-white/95  rounded-[20px] shadow-2xl border border-black/10 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none flex flex-col gap-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[14px] font-semibold text-gray-900 flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4 text-[#007AFF]" /> Choose Date
                                                </span>
                                                {customEntryDate && (
                                                    <button
                                                        onClick={() => {
                                                            setCustomEntryDate(null)
                                                            setIsDateMenuOpen(false)
                                                        }}
                                                        className="text-[12px] text-[#007AFF] hover:underline font-medium"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>

                                            <input 
                                                type="date"
                                                tabIndex={-1}
                                                max={getTodayStr()}
                                                value={customEntryDate || getTodayStr()}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    if (val) {
                                                        setCustomEntryDate(val === getTodayStr() ? null : val)
                                                        setIsDateMenuOpen(false)
                                                    }
                                                }}
                                                className="w-full text-[15px] bg-gray-100/80 hover:bg-gray-100 active:bg-gray-200/70 border border-gray-200/80 rounded-[12px] px-3 py-2.5 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 font-sans cursor-pointer text-center transition-colors"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Search Icon Button */}
                            <button 
                                onClick={() => { setIsSearchOpen(true); setIsFilterMenuOpen(false) }}
                                className="p-2 text-[#007AFF] hover:bg-gray-200/60 rounded-full active:scale-95 transition-all relative"
                                title="Search Chat"
                            >
                                <Search className="w-5 h-5 stroke-[2.2]" />
                                {searchQuery && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#007AFF] border-2 border-[#F6F6F6]" />
                                )}
                            </button>
                        </div>
                    </>
                )}
            </header>

            {/* Active Filter Chips Banner (Shown directly below header if any filter is active) */}
            {activeFilterCount > 0 && (
                <div className="shrink-0 bg-[#F8FAFC]/95  border-b border-gray-300/70 px-3.5 py-2 flex items-center justify-between gap-2 overflow-x-auto ios-scroll z-10">
                    <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                        {(filterPersons.length > 0 || filterPersonType !== 'all') && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-blue-50 text-[#007AFF] border border-blue-200 shadow-2xs shrink-0">
                                <span>
                                    Person: {filterPersons.length > 0 ? filterPersons.map(cp => PERSONS.find(p => p.canonical === cp)?.display || cp).join(', ') : 'All'}
                                    {filterPersonType === 'income' ? ' (+ Income)' : filterPersonType === 'expense' ? ' (- Expense)' : ''}
                                </span>
                                <button 
                                    onClick={() => { setFilterPersons([]); setFilterPersonType('all'); }}
                                    className="hover:bg-blue-200/60 rounded-full p-0.5"
                                    title="Remove Person filter"
                                >
                                    <X className="w-3 h-3 stroke-[2.5]" />
                                </button>
                            </span>
                        )}
                        {filterMonth && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs shrink-0">
                                <span>Month: {formatMonthLabel(filterMonth)}</span>
                                <button 
                                    onClick={() => setFilterMonth(null)}
                                    className="hover:bg-amber-200/60 rounded-full p-0.5"
                                    title="Remove Month filter"
                                >
                                    <X className="w-3 h-3 stroke-[2.5]" />
                                </button>
                            </span>
                        )}
                        {filterCompanyId !== null && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs shrink-0">
                                <span className="truncate max-w-[140px]">Company: {companies.find(c => c.id === filterCompanyId)?.name.replace(/^\d+\.?\s*/, '')}</span>
                                <button 
                                    onClick={() => setFilterCompanyId(null)}
                                    className="hover:bg-purple-200/60 rounded-full p-0.5"
                                    title="Remove Company filter"
                                >
                                    <X className="w-3 h-3 stroke-[2.5]" />
                                </button>
                            </span>
                        )}
                        {filterEmployeeId !== null && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs shrink-0">
                                <span className="truncate max-w-[140px]">Employee: {employees.find(e => e.id === filterEmployeeId)?.name}</span>
                                <button 
                                    onClick={() => setFilterEmployeeId(null)}
                                    className="hover:bg-emerald-200/60 rounded-full p-0.5"
                                    title="Remove Employee filter"
                                >
                                    <X className="w-3 h-3 stroke-[2.5]" />
                                </button>
                            </span>
                        )}
                        <button 
                            onClick={handleClearAllFilters}
                            className="text-[12px] font-semibold text-gray-500 hover:text-gray-900 underline px-1.5 py-0.5 shrink-0"
                        >
                            Clear all
                        </button>
                    </div>
                    <span className="text-[11px] font-medium text-gray-500 shrink-0">
                        {filteredMessages.length} results
                    </span>
                </div>
            )}

            {/* Chat Body (WhatsApp Image Background) */}
            <div 
                onClick={() => setIsCustomKeyboardOpen(false)}
                className="flex-1 overflow-y-auto ios-scroll px-3.5 py-3.5 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/uploads/WHATSAPP.jpeg')",
                    backgroundColor: '#EFEAE2'
                }}
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500 text-[14px] bg-[#F9F9F9]  px-4 py-2 rounded-full shadow-sm font-medium">Loading chat...</div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center px-6 max-w-[320px] bg-white/85  rounded-[20px] p-5 shadow-sm border border-gray-200/60">
                            <p className="text-[15px] text-gray-800 font-medium mb-2">WhatsApp Quick Ledger</p>
                            <p className="text-[13px] text-gray-600 leading-relaxed mb-3 font-normal">
                                Start entries with <strong className="text-[#00875A]">+</strong> or <strong className="text-[#D9383A]">-</strong>.
                            </p>
                            <div className="bg-gray-100/90 rounded-xl p-3 text-left text-[13px] space-y-1.5 font-normal">
                                <p className="text-[#00875A]">+15000 <span className="text-[#007AFF]">BOOSTER</span> <span className="text-[#111827]">BIS INCLUSION FEE</span></p>
                                <p className="text-[#00875A]">+11000 <span className="text-[#007AFF]">ANJALI</span> <span className="text-[#111827]">KITCHENWARE</span></p>
                                <p className="text-[#D9383A]">-126 <span className="text-[#007AFF]">COFFEE</span></p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {messagesWithDates.map((item, idx) => {
                            if ('_dateSeparator' in item) {
                                return (
                                    <div key={`date-${idx}`} className="flex justify-center my-2">
                                        <span className="px-3 py-1 rounded-[8px] bg-white text-[12px] font-medium text-[#54656F] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] tracking-normal select-none">
                                            {item._dateSeparator}
                                        </span>
                                    </div>
                                )
                            }

                            const msg = item as ChatMessage
                            return (
                                <TransactionMessageItem
                                    key={msg.id}
                                    msg={msg}
                                    activeMsgMenuId={activeMsgMenu?.msg.id}
                                    handleTouchStart={handleTouchStart}
                                    handleTouchEnd={handleTouchEnd}
                                    handleTouchMove={handleTouchMove}
                                    handleContextMenu={handleContextMenu}
                                    handleBubbleClick={handleBubbleClick}
                                    formatTime={formatTime}
                                />
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                {/* WhatsApp Floating Scroll to Bottom Button */}
                <button 
                    onClick={scrollToBottom}
                    className="absolute right-4 bottom-20 z-20 w-9 h-9 rounded-full bg-white/95 text-[#54656F] shadow-[0_1px_3px_rgba(0,0,0,0.2)] flex items-center justify-center hover:bg-white active:scale-95 transition-all border border-gray-100"
                    title="Scroll to bottom"
                >
                    <ChevronDown className="w-5 h-5 stroke-[2.2]" />
                </button>
            </div>


            {warningMsg && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-gray-900/95  text-white px-4 py-2.5 rounded-full text-[13px] font-medium flex items-center gap-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.15)] z-50 animate-in slide-in-from-bottom-2 fade-in duration-200 w-max max-w-[90vw]">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="truncate">{warningMsg}</span>
                    <button onClick={() => setWarningMsg(null)} className="p-0.5 hover:bg-white/10 rounded-full ml-1 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="shrink-0 bg-[#EFEAE2] safe-area-bottom z-20">
            {/* iOS WhatsApp Bottom Input Bar */}
            <div className="border-t border-gray-300/60 px-3 py-2 flex items-center gap-2">
                {/* Rounded Input Field */}
                <div 
                    onClick={() => {
                        setIsCustomKeyboardOpen(true)
                        setTimeout(scrollToBottom, 50)
                    }}
                    className="flex-1 min-w-0 bg-white rounded-full border border-gray-300/80 px-4 py-2 flex items-center gap-2 shadow-xs cursor-text"
                >
                    <div 
                        ref={inputScrollRef} 
                        className="w-full text-[15px] font-normal text-gray-900 font-sans tracking-normal uppercase min-h-[22px] flex items-center overflow-x-auto whitespace-nowrap scroll-smooth relative"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setCursorPosition(input.length)
                                setIsCustomKeyboardOpen(true)
                            }
                        }}
                    >
                        {input === '' && !isCustomKeyboardOpen ? (
                            <span className="text-gray-400 select-none pointer-events-none">Tap to type transaction...</span>
                        ) : (
                            <div className="flex items-center">
                                {input.split('').map((char, i) => (
                                    <span 
                                        key={i} 
                                        className="relative flex items-center h-full cursor-text"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                            const clickX = e.clientX - rect.left
                                            if (clickX > rect.width / 2) {
                                                setCursorPosition(i + 1)
                                            } else {
                                                setCursorPosition(i)
                                            }
                                            setIsCustomKeyboardOpen(true)
                                        }}
                                    >
                                        {cursorPosition === i && isCustomKeyboardOpen && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 -ml-[1px] w-[2px] h-[19px] bg-[#007AFF] animate-pulse z-10 rounded-full" />
                                        )}
                                        <span className="whitespace-pre">{char === ' ' ? '\u00A0' : char}</span>
                                    </span>
                                ))}
                                <span 
                                    className="relative flex items-center h-[22px] min-w-[12px] cursor-text"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setCursorPosition(input.length)
                                        setIsCustomKeyboardOpen(true)
                                    }}
                                >
                                    {cursorPosition === input.length && isCustomKeyboardOpen && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 -ml-[1px] w-[2px] h-[19px] bg-[#007AFF] animate-pulse z-10 rounded-full" />
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                    {input && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleInputChange('')
                                setCursorPosition(0)
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* WhatsApp Green Round Send Button */}
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !isFormValid}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isFormValid 
                            ? 'bg-[#00A884] text-white shadow-md active:scale-95 cursor-pointer' 
                            : 'bg-gray-300 text-gray-500 opacity-60 cursor-not-allowed'
                    }`}
                >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current ml-0.5">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>

            {/* ─── Selected State Badges (inside keyboard zone, below text bar) ─── */}

            {/* Selected Head: ECS MISC */}
            {selectedCompany?.id === -1 && (
                <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(210,210,215,0.5)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[12px] font-bold text-[#D97706] bg-[#FEF3C7] border border-[#FDE68A] px-2.5 py-0.5 rounded-full shadow-sm shrink-0">
                            Head: ECS MISC
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedCompany(null)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Selected Employee */}
            {selectedEmployee && input.startsWith('-') && (
                <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(210,210,215,0.5)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                            <UserCircle2 className="w-3 h-3 text-gray-500" /> Employee
                        </span>
                        <span className="text-[13px] font-medium text-gray-800 truncate">
                            {selectedEmployee.name}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedEmployee(null)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Custom Date Badge */}
            {customEntryDate && (
                <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(210,210,215,0.5)' }}>
                    <div className="flex items-center gap-2 min-w-0 text-[13px] text-gray-600">
                        <span>Date:</span>
                        <strong className="font-medium text-gray-900">{formatDisplayCustomDate(customEntryDate)}</strong>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCustomEntryDate(null)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Selected Package */}
            {selectedPackage && (
                <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(210,210,215,0.5)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                            <PackageIcon className="w-3 h-3 text-gray-500" /> Package
                        </span>
                        <span className="text-[13px] font-medium text-gray-800 truncate">
                            {selectedPackage.description}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedPackage(null)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Custom iOS 26 Liquid Glass Keyboard with integrated suggestions */}
            <IOSKeyboard
                isOpen={isCustomKeyboardOpen}
                onClose={() => setIsCustomKeyboardOpen(false)}
                onKeyPress={handleCustomKeyPress}
                onBackspace={handleCustomBackspace}
                onSend={handleSend}
                isFormValid={isFormValid}
                sending={sending}
                inputValue={input}
                companySuggestions={companySuggestions}
                employeeSuggestions={employeeSuggestions}
                companyPackages={companyPackages}
                persons={PERSONS}
                selectedCompany={selectedCompany}
                selectedEmployee={selectedEmployee}
                selectedPackage={selectedPackage}
                selectedPerson={selectedPerson}
                isPersonPickerOpen={isPersonPickerOpen}
                onSelectCompany={handleSelectCompany}
                onSelectEmployee={handleSelectEmployee}
                onSelectPackage={handleSelectPackage}
                onSelectPerson={handleSelectPerson}
                cursorPosition={cursorPosition}
                onCursorMove={setCursorPosition}
            />
            </div>



            {/* iOS WhatsApp Style Context Menu attached directly to chat bubble */}
            {activeMsgMenu && (
                <>
                    {/* Backdrop dim/blur behind the highlighted chat */}
                    <div 
                        className="fixed inset-0 z-40 bg-black/35  animate-in fade-in duration-150 select-none"
                        onClick={() => setActiveMsgMenu(null)}
                    />

                    {/* Pop-up Menu positioned directly above or below the chat bubble */}
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={
                            activeMsgMenu.placement === 'below'
                                ? {
                                    top: `${Math.min(window.innerHeight - 170, activeMsgMenu.rect.bottom + 6)}px`,
                                    right: `${Math.max(12, window.innerWidth - activeMsgMenu.rect.right)}px`
                                  }
                                : {
                                    bottom: `${Math.min(window.innerHeight - 170, window.innerHeight - activeMsgMenu.rect.top + 6)}px`,
                                    right: `${Math.max(12, window.innerWidth - activeMsgMenu.rect.right)}px`
                                  }
                        }
                        className={`fixed z-50 w-[200px] sm:w-[220px] bg-[#F2F2F7]/95  rounded-[18px] shadow-2xl border border-white/60 overflow-hidden divide-y divide-gray-300/60 animate-in zoom-in-95 duration-150 flex flex-col select-none ${
                            activeMsgMenu.placement === 'below' 
                                ? 'slide-in-from-top-2 origin-top-right' 
                                : 'slide-in-from-bottom-2 origin-bottom-right'
                        }`}
                    >
                        {/* Option 1: View (Only shown for company transactions or employee expenses) */}
                        {Boolean(activeMsgMenu.msg.companyId || activeMsgMenu.msg.employeeId) && (
                            <button
                                onClick={() => handleViewMessage(activeMsgMenu.msg)}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-[15px] font-normal text-gray-900 hover:bg-gray-200/50 active:bg-gray-300/60 transition-colors"
                            >
                                <Eye className="w-4 h-4 text-gray-700 stroke-[1.9]" />
                                <span>View</span>
                            </button>
                        )}

                        {/* Option 2: Edit */}
                        <button
                            onClick={() => handleEditMessage(activeMsgMenu.msg)}
                            className="w-full px-4 py-2.5 flex items-center gap-3 text-[15px] font-normal text-gray-900 hover:bg-gray-200/50 active:bg-gray-300/60 transition-colors"
                        >
                            <Pencil className="w-4 h-4 text-gray-700 stroke-[1.9]" />
                            <span>Edit</span>
                        </button>

                        {/* Option 3: Delete (Triggers native iOS warning dialog) */}
                        <button
                            onClick={() => {
                                const msg = activeMsgMenu.msg
                                setActiveMsgMenu(null)
                                setConfirmDeleteMsg(msg)
                            }}
                            className="w-full px-4 py-2.5 flex items-center gap-3 text-[15px] font-normal text-[#FF3B30] hover:bg-red-50 active:bg-red-100 transition-colors"
                        >
                            <Trash2 className="w-4 h-4 text-[#FF3B30] stroke-[1.9]" />
                            <span>Delete</span>
                        </button>
                    </div>
                </>
            )}

            {/* iOS Native Style Delete Warning Dialog */}
            {confirmDeleteMsg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40  animate-in fade-in duration-150 select-none">
                    <div className="w-full max-w-[280px] sm:max-w-[290px] bg-[#F2F2F2]/95  rounded-[18px] text-center shadow-2xl border border-gray-200/50 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
                        <div className="p-4.5 pt-5 pb-3.5 flex flex-col items-center">
                            <h3 className="text-[17px] font-semibold text-gray-900 leading-tight">
                                Delete Message?
                            </h3>
                            <p className="text-[13px] text-gray-600 mt-2 leading-snug">
                                This transaction will be permanently removed from this chat and the ledger.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 border-t border-gray-300/80 divide-x divide-gray-300/80 text-[17px]">
                            <button
                                onClick={() => setConfirmDeleteMsg(null)}
                                disabled={deletingMsgId === confirmDeleteMsg.id}
                                className="py-3 text-[#007AFF] font-normal hover:bg-gray-200/50 active:bg-gray-300/50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteMessage(confirmDeleteMsg)}
                                disabled={deletingMsgId === confirmDeleteMsg.id}
                                className="py-3 text-[#FF3B30] font-semibold hover:bg-red-50/50 active:bg-red-100/50 transition-colors"
                            >
                                {deletingMsgId === confirmDeleteMsg.id ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Native iPhone Notification Banner (Floats from top on new entry) */}
            {activeNotification && (
                <div 
                    onClick={() => setActiveNotification(null)}
                    className="fixed top-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[420px] z-50 pointer-events-auto cursor-pointer animate-in fade-in slide-in-from-top-6 duration-300 ease-out select-none"
                    style={{ filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.18))' }}
                >
                    <div className="bg-white/95 text-gray-900  rounded-[20px] p-3.5 border border-black/10 shadow-2xl flex items-center gap-3.5 transition-transform active:scale-[0.98]">
                        {/* App Icon */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src="/logo.jpg" 
                            alt="Icon" 
                            className="w-10 h-10 rounded-[10px] object-cover border border-black/10 shadow-xs shrink-0" 
                        />

                        {/* Notification Details */}
                        <div className="flex-1 min-w-0 text-[15px] font-sans">
                            <ColorCodedMessageText 
                                text={activeNotification.rawText} 
                                companyName={activeNotification.companyName} 
                            />
                        </div>

                        {/* Timestamp & Dismiss */}
                        <div className="flex flex-col items-end justify-between self-stretch shrink-0 text-gray-400">
                            <span className="text-[11px] font-medium tracking-tight">now</span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setActiveNotification(null); }}
                                className="p-0.5 hover:text-gray-700 rounded-full transition-colors mt-auto"
                                title="Dismiss"
                            >
                                <X className="w-3.5 h-3.5 stroke-[2.2]" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}


