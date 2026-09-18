'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, Send, CheckCheck, AlertCircle, Building2, Package as PackageIcon, X, Plus, Video } from 'lucide-react'
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
    
    // Form & Input State
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

    const handleSelectSign = (typeSign: '+' | '-') => {
        if (!input.startsWith('+') && !input.startsWith('-')) {
            setInput(`${typeSign} ${input}`)
        } else {
            setInput(`${typeSign}${input.substring(1)}`)
        }
        setWarningMsg(null)
        inputRef.current?.focus()
    }

    const handleSelectCompany = (comp: CompanyItem) => {
        const cleanName = comp.name.replace(/^\d+\.?\s*/, '').trim()
        const currentSign = sign || '+'
        const currentAmount = amount ? amount.toString() : ''
        
        setInput(`${currentSign}${currentAmount} ${cleanName} `.trimStart())
        setSelectedCompany(comp)
        setSelectedPackage(null)
        setWarningMsg(null)
        inputRef.current?.focus()
    }

    const handleSelectPackage = (pkg: PackageItem) => {
        setSelectedPackage(pkg)
        const currentInput = input.trim()
        setInput(`${currentInput} ${pkg.description} `)
        setWarningMsg(null)
        inputRef.current?.focus()
    }

    // Strict Validation Rule: No random text allowed!
    const validateTransactionInput = (): string | null => {
        const raw = input.trim()
        if (!raw) return 'Please type a transaction message starting with + or -'
        
        if (raw[0] !== '+' && raw[0] !== '-') {
            return 'Invalid Format! Message must start with + (Payment) or - (Charge)'
        }
        
        if (!amount || amount <= 0) {
            return 'Invalid Amount! Please enter a valid number after + or -'
        }

        const { rest } = getParsedInput()
        if (!rest) {
            return 'Missing Company! Please select or type a company name'
        }

        return null // Valid!
    }

    const isFormValid = !validateTransactionInput()

    const handleSend = async () => {
        setWarningMsg(null)
        
        const error = validateTransactionInput()
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
            setWarningMsg('Failed to record entry. Please try again.')
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
        return d.toLocaleDateString('en-IN', { weekday: 'long' })
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
        <div className="flex flex-col h-full relative font-sans overflow-hidden select-none" style={{ backgroundColor: '#EFEAE2' }}>
            {/* iOS WhatsApp Header */}
            <header className="shrink-0 z-20 px-3 py-2 flex items-center justify-between bg-[#F6F6F6]/90 backdrop-blur-md border-b border-gray-300/70 shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                    <Link href="/" className="flex items-center text-[#007AFF] font-medium text-[15px] -ml-1 active:opacity-60 transition-opacity">
                        <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                    </Link>
                    
                    {/* Group Icon & Details */}
                    <div className="flex items-center gap-2.5 min-w-0 ml-1">
                        <img 
                            src="/logo.jpg" 
                            alt="Logo" 
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200"
                        />
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-[16px] font-bold text-gray-900 truncate leading-tight">EXPERT HISAB KITAB</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Chat Body (WhatsApp Image Background) */}
            <div 
                className="flex-1 overflow-y-auto ios-scroll px-3 py-3 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/uploads/WHATSAPP.jpeg')",
                    backgroundColor: '#EFEAE2'
                }}
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500 text-[14px] bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">Loading chat...</div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center px-6 max-w-[300px] bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-200/50">
                            <p className="text-[14px] text-gray-700 font-semibold mb-2">WhatsApp Quick Ledger</p>
                            <p className="text-[13px] text-gray-500 leading-relaxed mb-3">
                                Record transactions strictly starting with <strong className="text-emerald-600">+</strong> or <strong className="text-rose-600">-</strong>.
                            </p>
                            <div className="bg-gray-100 rounded-lg p-2.5 text-left text-[12px] font-mono text-gray-800 space-y-1">
                                <p className="text-emerald-700 font-bold">+15000 BOOSTER BIS Inclusion fee</p>
                                <p className="text-emerald-700 font-bold">+11000 Anjali kitchenware</p>
                                <p className="text-rose-700 font-bold">-126 coffee</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {messagesWithDates.map((item, idx) => {
                            if ('_dateSeparator' in item) {
                                return (
                                    <div key={`date-${idx}`} className="flex justify-center my-1.5">
                                        <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-semibold text-gray-600 shadow-sm border border-gray-200/40 select-none">
                                            {item._dateSeparator}
                                        </span>
                                    </div>
                                )
                            }

                            const msg = item as ChatMessage
                            const isSuccess = msg.status === 'SUCCESS'

                            return (
                                <div key={msg.id} className="flex justify-end">
                                    <div className="rounded-[16px] rounded-tr-[2px] px-3 py-2 max-w-[85%] shadow-[0_1px_1px_rgba(0,0,0,0.08)] bg-[#DCF8C6] text-[#111111] relative">
                                        <p className="text-[15px] font-sans leading-snug break-words whitespace-pre-wrap">
                                            {msg.rawText}
                                            <span className="inline-flex items-center gap-1 text-[11px] text-[#667781] ml-3 float-right mt-1 font-sans">
                                                {formatTime(msg.createdAt)}
                                                {isSuccess ? (
                                                    <CheckCheck className="w-4 h-4 text-[#34B7F1] stroke-[2.5]" />
                                                ) : (
                                                    <span className="text-red-500 font-bold">!</span>
                                                )}
                                            </span>
                                        </p>
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
                <div className="bg-amber-500 text-white px-4 py-2 text-[13px] font-medium flex items-center justify-between shadow-md z-30 transition-all duration-200">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{warningMsg}</span>
                    </div>
                    <button onClick={() => setWarningMsg(null)} className="p-0.5 hover:bg-amber-600 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Live Company Suggestions Bar (Flawless transition) */}
            {companySuggestions.length > 0 && !selectedCompany && (
                <div className="bg-white/95 backdrop-blur-md px-3 py-2 border-t border-gray-200/60 shadow-lg flex gap-2 overflow-x-auto ios-scroll z-20 transition-all duration-300 ease-out">
                    <span className="text-[12px] font-medium text-gray-500 flex items-center gap-1 shrink-0 self-center">
                        <Building2 className="w-3.5 h-3.5" /> Company:
                    </span>
                    {companySuggestions.map(comp => (
                        <button
                            key={comp.id}
                            onClick={() => handleSelectCompany(comp)}
                            className="px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-[#007AFF] text-[13px] font-semibold shrink-0 active:scale-95 transition-all flex items-center gap-1 border border-blue-200 shadow-xs"
                        >
                            {comp.name.replace(/^\d+\.?\s*/, '')}
                        </button>
                    ))}
                </div>
            )}

            {/* Live Package Suggestions Bar (Flawless transition) */}
            {selectedCompany && companyPackages.length > 0 && (
                <div className="bg-purple-50/95 backdrop-blur-md px-3 py-2 border-t border-purple-200 shadow-lg flex gap-2 overflow-x-auto ios-scroll z-20 transition-all duration-300 ease-out">
                    <span className="text-[12px] font-semibold text-purple-800 flex items-center gap-1 shrink-0 self-center">
                        <PackageIcon className="w-3.5 h-3.5 text-purple-600" /> Package:
                    </span>
                    {companyPackages.map(pkg => (
                        <button
                            key={pkg.id}
                            onClick={() => handleSelectPackage(pkg)}
                            className="px-3 py-1 rounded-full bg-purple-600 text-white text-[13px] font-semibold shrink-0 active:scale-95 transition-all flex items-center gap-1 shadow-sm hover:bg-purple-700"
                        >
                            {pkg.description}
                        </button>
                    ))}
                </div>
            )}

            {/* iOS WhatsApp Bottom Bar */}
            <div className="shrink-0 bg-[#F6F6F6] border-t border-gray-300/80 px-2.5 py-2 flex items-center gap-2 safe-area-bottom z-20">
                {/* Left Plus icon */}
                <button 
                    onClick={() => handleSelectSign('+')}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#007AFF] active:bg-gray-200 transition-colors shrink-0"
                    title="Add Payment"
                >
                    <Plus className="w-6 h-6 stroke-[2.2]" />
                </button>

                {/* Rounded Input Field */}
                <div className="flex-1 min-w-0 bg-white rounded-full border border-gray-300 px-3.5 py-1.5 flex items-center gap-2 shadow-inner">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value)
                            setWarningMsg(null)
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="+15000 BOOSTER BIS Inclusion fee"
                        className="w-full text-[15px] text-gray-900 placeholder:text-gray-400 outline-none font-mono bg-transparent"
                        disabled={sending}
                        autoComplete="off"
                        autoCapitalize="none"
                    />
                    <span className="text-gray-400 font-bold text-[14px] shrink-0 select-none">₹</span>
                </div>

                {/* WhatsApp Green Round Send Button */}
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !isFormValid}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isFormValid 
                            ? 'bg-[#00A884] text-white shadow-md active:scale-95' 
                            : 'bg-gray-300 text-gray-500 opacity-60 cursor-not-allowed'
                    }`}
                >
                    <Send className="w-4 h-4" style={{ transform: 'rotate(-45deg)', marginLeft: '2px' }} />
                </button>
            </div>
        </div>
    )
}
