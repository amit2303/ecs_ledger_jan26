'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, Send, CheckCircle2, XCircle, ArrowUpRight, Building2 } from 'lucide-react'
import Link from 'next/link'

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

export default function TransactionsPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [companies, setCompanies] = useState<CompanyItem[]>([])
    const [companyPackages, setCompanyPackages] = useState<PackageItem[]>([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [loading, setLoading] = useState(true)
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

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
    }, [])

    useEffect(() => {
        if (selectedCompanyId) {
            fetchCompanyPackages(selectedCompanyId)
        } else {
            setCompanyPackages([])
        }
    }, [selectedCompanyId])

    const handleSend = async (overrideCompanyId?: number) => {
        const text = input.trim()
        if (!text || sending) return

        setInput('')
        setSelectedCompanyId(null)
        setCompanyPackages([])
        setSending(true)

        try {
            const body: any = { text }
            if (overrideCompanyId || selectedCompanyId) {
                body.companyId = overrideCompanyId || selectedCompanyId
            }
            const res = await fetch('/api/transactions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const msg = await res.json()
            if (msg.id) {
                setMessages(prev => [...prev, msg])
            }
            scrollToBottom()
        } catch (err) {
            console.error('Send error:', err)
        } finally {
            setSending(false)
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        const isToday = d.toDateString() === now.toDateString()
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const isYesterday = d.toDateString() === yesterday.toDateString()

        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        if (isToday) return time
        if (isYesterday) return `Yesterday ${time}`
        return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${time}`
    }

    // Compute live suggestions based on current input text
    const getSuggestions = () => {
        if (!input.trim() || !companies.length) return []

        const raw = input.trim()
        const match = raw.match(/^([+-])?\s*(\d+(?:\.\d+)?)?\s*(.*)$/)
        if (!match) return []

        const queryToken = match[3].split('@')[0].trim().toLowerCase()
        if (!queryToken) return []

        return companies.filter(c => {
            const cleanName = c.name.replace(/^\d+\.?\s*/, '').trim().toLowerCase()
            return cleanName.includes(queryToken) || c.name.toLowerCase().includes(queryToken)
        }).slice(0, 6)
    }

    const suggestions = getSuggestions()

    const pickCompanySuggestion = (comp: CompanyItem) => {
        const raw = input.trim()
        const match = raw.match(/^([+-]\s*\d+(?:\.\d+)?\s*)/)
        let prefix = ''
        if (match) {
            prefix = match[1]
        } else if (raw.startsWith('+') || raw.startsWith('-')) {
            prefix = raw[0] + ' '
        }
        
        const cleanName = comp.name.replace(/^\d+\.?\s*/, '').trim()
        setInput(`${prefix}${cleanName} `)
        setSelectedCompanyId(comp.id)
        inputRef.current?.focus()
    }

    const pickPackageSuggestion = (pkg: PackageItem) => {
        const raw = input.trim()
        setInput(`${raw} ${pkg.description} `)
        inputRef.current?.focus()
    }

    // Group messages by date for date separators
    const getDateLabel = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        if (d.toDateString() === now.toDateString()) return 'Today'
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    // Build messages with date separators
    const messagesWithDates: (ChatMessage | { _dateSeparator: string })[] = []
    let lastDate = ''
    for (const msg of messages) {
        const dateLabel = getDateLabel(msg.createdAt)
        if (dateLabel !== lastDate) {
            messagesWithDates.push({ _dateSeparator: dateLabel })
            lastDate = dateLabel
        }
        messagesWithDates.push(msg)
    }

    return (
        <div className="flex flex-col h-full relative" style={{ backgroundColor: '#E8E4DF' }}>
            {/* Header */}
            <header className="shrink-0 z-10 px-4 py-3 flex items-center gap-3 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
                <Link href="/" className="p-1 -ml-1 text-ios-blue active:opacity-60 transition-opacity">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-[17px] font-semibold text-gray-900 truncate">Quick Ledger</h1>
                    <p className="text-[12px] text-ios-gray leading-tight">Type transactions to record them instantly</p>
                </div>
            </header>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto ios-scroll px-4 py-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-ios-gray text-[15px]">Loading messages...</div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center px-8 max-w-[300px]">
                            <div className="w-16 h-16 rounded-full bg-ios-blue/10 flex items-center justify-center mx-auto mb-4">
                                <Send className="w-7 h-7 text-ios-blue" />
                            </div>
                            <h3 className="text-[17px] font-semibold text-gray-900 mb-2">Quick Ledger</h3>
                            <p className="text-[14px] text-ios-gray leading-relaxed">
                                Type transactions like a chat message to instantly record them.
                            </p>
                            <div className="mt-4 bg-white rounded-xl p-3 text-left shadow-sm border border-gray-100">
                                <p className="text-[13px] text-ios-gray font-medium mb-2">Format:</p>
                                <p className="text-[14px] font-mono text-gray-800">+ amount company package desc</p>
                                <p className="text-[13px] text-ios-gray mt-2 font-medium">Examples:</p>
                                <p className="text-[13px] font-mono text-ios-green mt-1">+ 15000 BOOSTER BIS Inclusion sample payment</p>
                                <p className="text-[13px] font-mono text-ios-red mt-1">- 12000 RELIANCE AMC</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {messagesWithDates.map((item, idx) => {
                            if ('_dateSeparator' in item) {
                                return (
                                    <div key={`date-${idx}`} className="flex justify-center my-2">
                                        <span className="px-3 py-1 rounded-full bg-black/5 text-[12px] font-medium text-gray-500 select-none">
                                            {item._dateSeparator}
                                        </span>
                                    </div>
                                )
                            }

                            const msg = item as ChatMessage
                            const isSuccess = msg.status === 'SUCCESS'
                            const isPayment = msg.type === 'PAYMENT'

                            return (
                                <div key={msg.id} className="flex flex-col gap-1.5">
                                    {/* User bubble */}
                                    <div className="flex justify-end">
                                        <div className="chat-bubble-user max-w-[80%]">
                                            <p className="text-[15px] font-mono leading-snug">{msg.rawText}</p>
                                            <p className="text-[11px] text-white/60 text-right mt-1">{formatTime(msg.createdAt)}</p>
                                        </div>
                                    </div>

                                    {/* System response */}
                                    <div className="flex justify-start">
                                        <div className={`chat-bubble-system max-w-[85%] ${isSuccess ? 'chat-bubble-success' : 'chat-bubble-error'}`}>
                                            {isSuccess ? (
                                                <div className="flex items-start gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-ios-green shrink-0 mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[14px] font-medium text-gray-900">
                                                            {formatAmount(msg.amount)} {isPayment ? 'Payment' : 'Charge'}
                                                        </p>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className="text-[13px] text-ios-gray">→</span>
                                                            <Link
                                                                href={`/companies/${msg.companyId}`}
                                                                className="text-[13px] text-ios-blue font-medium truncate hover:underline active:opacity-60"
                                                            >
                                                                {msg.companyName.replace(/^\d+\.?\s*/, '')}
                                                            </Link>
                                                            <ArrowUpRight className="w-3 h-3 text-ios-blue shrink-0" />
                                                        </div>
                                                        {msg.description && (
                                                            <p className="text-[12px] text-ios-gray mt-0.5 truncate">
                                                                {msg.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-start gap-2">
                                                    <XCircle className="w-4 h-4 text-ios-red shrink-0 mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[14px] font-medium text-ios-red">Failed</p>
                                                        <p className="text-[13px] text-gray-600 mt-0.5">
                                                            {msg.errorMsg || 'Unknown error'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Live Autocomplete Suggestions Bar */}
            {suggestions.length > 0 && !companyPackages.length && (
                <div className="bg-white/95 backdrop-blur-md px-3 py-2 border-t border-gray-200/60 shadow-lg flex gap-2 overflow-x-auto ios-scroll">
                    <span className="text-[12px] font-medium text-ios-gray flex items-center gap-1 shrink-0 self-center">
                        <Building2 className="w-3.5 h-3.5" /> Select Company:
                    </span>
                    {suggestions.map(comp => (
                        <button
                            key={comp.id}
                            onClick={() => pickCompanySuggestion(comp)}
                            className="px-3 py-1 rounded-full bg-ios-blue/10 hover:bg-ios-blue/20 text-ios-blue text-[13px] font-medium shrink-0 active:scale-95 transition-all flex items-center gap-1 border border-ios-blue/20"
                        >
                            {comp.name.replace(/^\d+\.?\s*/, '')}
                        </button>
                    ))}
                </div>
            )}

            {/* Package Suggestions Bar */}
            {companyPackages.length > 0 && (
                <div className="bg-white/95 backdrop-blur-md px-3 py-2 border-t border-gray-200/60 shadow-lg flex gap-2 overflow-x-auto ios-scroll">
                    <span className="text-[12px] font-medium text-ios-gray flex items-center gap-1 shrink-0 self-center">
                        Select Package:
                    </span>
                    {companyPackages.map(pkg => (
                        <button
                            key={pkg.id}
                            onClick={() => pickPackageSuggestion(pkg)}
                            className="px-3 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-[13px] font-medium shrink-0 active:scale-95 transition-all flex items-center gap-1 border border-purple-200"
                        >
                            {pkg.description}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Bar */}
            <div className="shrink-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/60 safe-area-bottom">
                <div className="px-3 py-2 flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="+ 15000 BOOSTER BIS Inclusion sample payment"
                            className="w-full px-4 py-2.5 bg-gray-100 rounded-full text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-ios-blue/30 transition-all font-mono"
                            disabled={sending}
                            autoComplete="off"
                            autoCapitalize="characters"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => handleSend()}
                        disabled={!input.trim() || sending}
                        className="w-9 h-9 rounded-full bg-ios-blue flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition-all"
                    >
                        <Send className="w-4 h-4 text-white" style={{ transform: 'rotate(-45deg)' }} />
                    </button>
                </div>
            </div>
        </div>
    )
}
