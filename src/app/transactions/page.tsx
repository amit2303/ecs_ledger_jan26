'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, Send, CheckCheck, AlertCircle, Building2, Package as PackageIcon, X } from 'lucide-react'
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
    
    // Controlled Form State
    const [input, setInput] = useState('')
    const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null)
    const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null)
    const [warningMsg, setWarningMsg] = useState<string | null>(null)
    
    const [sending, setSending] = useState(false)
    const [loading, setLoading] = useState(true)
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
        if (selectedCompany) {
            fetchCompanyPackages(selectedCompany.id)
        } else {
            setCompanyPackages([])
            setSelectedPackage(null)
        }
    }, [selectedCompany])

    // Detect Sign & Amount from current input text
    const getParsedInput = () => {
        const raw = input.trim()
        if (!raw) return { sign: null, amount: null, rest: '' }

        const sign = raw[0] === '+' || raw[0] === '-' ? raw[0] : null
        const afterSign = sign ? raw.substring(1).trim() : raw
        const amountMatch = afterSign.match(/^(\d+(?:\.\d+)?)/)
        const amount = amountMatch ? parseFloat(amountMatch[1]) : null
        const rest = amountMatch ? afterSign.substring(amountMatch[0].length).trim() : afterSign

        return { sign, amount, rest }
    }

    const { sign, amount, rest: descriptionText } = getParsedInput()

    // Filter company suggestions as user types
    const getCompanySuggestions = () => {
        if (selectedCompany || !input.trim() || !companies.length) return []
        const { rest } = getParsedInput()
        if (!rest) return companies.slice(0, 6)

        const queryToken = rest.toLowerCase().trim()
        return companies.filter(c => {
            const cleanName = c.name.replace(/^\d+\.?\s*/, '').trim().toLowerCase()
            return cleanName.includes(queryToken) || c.name.toLowerCase().includes(queryToken)
        }).slice(0, 6)
    }

    const companySuggestions = getCompanySuggestions()

    const handleSelectCompany = (comp: CompanyItem) => {
        const cleanName = comp.name.replace(/^\d+\.?\s*/, '').trim()
        const currentSign = sign || '+'
        const currentAmount = amount ? amount.toString() : ''
        
        // Update input text format: "+ 3000 BOOSTER "
        setInput(`${currentSign} ${currentAmount} ${cleanName} `.trimStart())
        setSelectedCompany(comp)
        setSelectedPackage(null)
        setWarningMsg(null)
        inputRef.current?.focus()
    }

    const handleSelectPackage = (pkg: PackageItem) => {
        setSelectedPackage(pkg)
        setWarningMsg(null)
        inputRef.current?.focus()
    }

    const clearSelectedPackage = () => {
        setSelectedPackage(null)
    }

    // Strict Validation before sending
    const validateBeforeSend = (): string | null => {
        const raw = input.trim()
        if (!raw) return 'Please type a transaction message starting with + or -'
        
        if (raw[0] !== '+' && raw[0] !== '-') {
            return 'Message must start with + (Payment) or - (Charge)'
        }
        
        if (!amount || amount <= 0) {
            return 'Please enter a valid numeric amount'
        }

        if (!selectedCompany) {
            return 'Please select a Company from the suggestions'
        }

        if (!selectedPackage) {
            return 'Please select a Package above the chat field'
        }

        // Description validation: extract text after company name
        const cleanCompName = selectedCompany.name.replace(/^\d+\.?\s*/, '').trim().toLowerCase()
        const inputLower = raw.toLowerCase()
        const compIdx = inputLower.indexOf(cleanCompName)
        let desc = ''
        if (compIdx !== -1) {
            desc = raw.substring(compIdx + cleanCompName.length).trim()
        }

        if (!desc) {
            return 'Please add a description for this transaction'
        }

        return null // All valid!
    }

    const handleSend = async () => {
        setWarningMsg(null)
        
        const error = validateBeforeSend()
        if (error) {
            setWarningMsg(error)
            return
        }

        if (sending) return
        setSending(true)

        const rawText = input.trim()

        try {
            const body = {
                text: rawText,
                companyId: selectedCompany?.id,
                packageId: selectedPackage?.id
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

            // Reset form on success
            setInput('')
            setSelectedCompany(null)
            setSelectedPackage(null)
            setCompanyPackages([])
            setWarningMsg(null)
            scrollToBottom()
        } catch (err) {
            console.error('Send error:', err)
            setWarningMsg('Failed to send transaction. Please check connection.')
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

    const formatAmount = (num: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(num)
    }

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr)
        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        return time
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
                        <div className="text-center px-8 max-w-[320px]">
                            <div className="w-16 h-16 rounded-full bg-ios-blue/10 flex items-center justify-center mx-auto mb-4">
                                <Send className="w-7 h-7 text-ios-blue" />
                            </div>
                            <h3 className="text-[17px] font-semibold text-gray-900 mb-2">Quick Ledger</h3>
                            <p className="text-[14px] text-ios-gray leading-relaxed mb-4">
                                Enter <span className="text-ios-green font-bold">+</span> for Payment or <span className="text-ios-red font-bold">-</span> for Charge, select Company & Package, then type description.
                            </p>
                            <div className="bg-white rounded-xl p-3 text-left shadow-sm border border-gray-100">
                                <p className="text-[12px] text-ios-gray font-medium mb-1.5">Example:</p>
                                <p className="text-[13px] font-mono text-ios-green font-semibold">+ 3000 BOOSTER</p>
                                <p className="text-[12px] text-purple-700 mt-1">📦 Package: BIS Inclusion</p>
                                <p className="text-[12px] text-gray-600 mt-1">📝 Description: sample payment</p>
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
                                <div key={msg.id} className="flex justify-end">
                                    <div
                                        className={`rounded-2xl px-4 py-3 max-w-[85%] shadow-sm transition-all border ${
                                            isPayment
                                                ? 'bg-emerald-700 text-white border-emerald-600'
                                                : 'bg-rose-700 text-white border-rose-600'
                                        }`}
                                    >
                                        {/* Amount & Type Badge */}
                                        <div className="flex items-center justify-between gap-3 mb-1">
                                            <span className="text-[12px] font-bold uppercase tracking-wide opacity-90">
                                                {isPayment ? '+ PAYMENT' : '- CHARGE'}
                                            </span>
                                            <span className="text-[16px] font-bold font-mono">
                                                {formatAmount(msg.amount)}
                                            </span>
                                        </div>

                                        {/* Company & Package details */}
                                        <div className="flex flex-wrap items-center gap-1.5 my-1.5 text-[13px]">
                                            <Link
                                                href={`/companies/${msg.companyId}`}
                                                className="px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 font-semibold truncate transition-all"
                                            >
                                                🏢 {msg.companyName.replace(/^\d+\.?\s*/, '')}
                                            </Link>
                                            {msg.description && msg.description.startsWith('[') && (
                                                <span className="px-2 py-0.5 rounded-md bg-purple-900/40 text-purple-100 font-medium">
                                                    📦 {msg.description.split(']')[0].substring(1)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <p className="text-[14px] text-white/90 leading-snug break-words">
                                            {msg.description ? msg.description.replace(/^\[.*?\]\s*/, '') : msg.rawText}
                                        </p>

                                        {/* Timestamp & Double Blue Ticks */}
                                        <div className="flex items-center justify-end gap-1.5 mt-2 pt-1 border-t border-white/10">
                                            <span className="text-[11px] text-white/70">
                                                {formatTime(msg.createdAt)}
                                            </span>
                                            {isSuccess ? (
                                                <CheckCheck className="w-4 h-4 text-sky-300 stroke-[2.5]" />
                                            ) : (
                                                <span className="text-[11px] text-red-200">Failed</span>
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

            {/* Warning Alert Banner */}
            {warningMsg && (
                <div className="bg-amber-500/95 backdrop-blur-md px-4 py-2 text-white text-[13px] font-medium flex items-center justify-between shadow-md border-t border-amber-400">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{warningMsg}</span>
                    </div>
                    <button onClick={() => setWarningMsg(null)} className="p-0.5 hover:bg-amber-600/50 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Selected Package Badge above Chat input */}
            {selectedPackage && (
                <div className="bg-purple-100/90 backdrop-blur-md px-4 py-2 border-t border-purple-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                        <PackageIcon className="w-4 h-4 text-purple-700" />
                        <span className="text-[13px] font-medium text-purple-900">
                            Target Package: <strong className="font-semibold">{selectedPackage.description}</strong>
                        </span>
                    </div>
                    <button
                        onClick={clearSelectedPackage}
                        className="text-[12px] font-medium text-purple-700 hover:text-purple-900 underline flex items-center gap-1"
                    >
                        Change
                    </button>
                </div>
            )}

            {/* Live Company Suggestions Bar */}
            {companySuggestions.length > 0 && !selectedCompany && (
                <div className="bg-white/95 backdrop-blur-md px-3 py-2 border-t border-gray-200/60 shadow-lg flex gap-2 overflow-x-auto ios-scroll">
                    <span className="text-[12px] font-medium text-ios-gray flex items-center gap-1 shrink-0 self-center">
                        <Building2 className="w-3.5 h-3.5" /> Select Company:
                    </span>
                    {companySuggestions.map(comp => (
                        <button
                            key={comp.id}
                            onClick={() => handleSelectCompany(comp)}
                            className="px-3 py-1 rounded-full bg-ios-blue/10 hover:bg-ios-blue/20 text-ios-blue text-[13px] font-medium shrink-0 active:scale-95 transition-all flex items-center gap-1 border border-ios-blue/20"
                        >
                            {comp.name.replace(/^\d+\.?\s*/, '')}
                        </button>
                    ))}
                </div>
            )}

            {/* Live Package Suggestions Bar (Shown immediately after company selected) */}
            {selectedCompany && !selectedPackage && companyPackages.length > 0 && (
                <div className="bg-purple-50/95 backdrop-blur-md px-3 py-2 border-t border-purple-200 shadow-lg flex gap-2 overflow-x-auto ios-scroll">
                    <span className="text-[12px] font-medium text-purple-800 flex items-center gap-1 shrink-0 self-center">
                        <PackageIcon className="w-3.5 h-3.5 text-purple-600" /> Select Package:
                    </span>
                    {companyPackages.map(pkg => (
                        <button
                            key={pkg.id}
                            onClick={() => handleSelectPackage(pkg)}
                            className="px-3 py-1 rounded-full bg-purple-600 text-white text-[13px] font-medium shrink-0 active:scale-95 transition-all flex items-center gap-1 shadow-sm hover:bg-purple-700"
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
                            onChange={(e) => {
                                setInput(e.target.value)
                                setWarningMsg(null)
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="+ 3000 BOOSTER sample payment"
                            className="w-full px-4 py-2.5 bg-gray-100 rounded-full text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-ios-blue/30 transition-all font-mono"
                            disabled={sending}
                            autoComplete="off"
                            autoCapitalize="characters"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending}
                        className="w-9 h-9 rounded-full bg-ios-blue flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-sm"
                    >
                        <Send className="w-4 h-4 text-white" style={{ transform: 'rotate(-45deg)' }} />
                    </button>
                </div>
            </div>
        </div>
    )
}
