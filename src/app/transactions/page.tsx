'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, Send, CheckCheck, AlertCircle, Building2, Package as PackageIcon, X, Plus, Minus } from 'lucide-react'
import Link from 'next/link'

import { useRouter } from 'next/navigation'

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
    const router = useRouter()
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [companies, setCompanies] = useState<CompanyItem[]>([])
    const [companyPackages, setCompanyPackages] = useState<PackageItem[]>([])
    
    // Form & Input State
    const [input, setInput] = useState('')
    const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null)
    const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null)
    const [warningMsg, setWarningMsg] = useState<string | null>(null)

    const handleMessageClick = (msg: ChatMessage) => {
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

    // Detect Sign, Amount, Company, and Description from current input text
    const getParsedInput = () => {
        const raw = input.trim()
        if (!raw) return { sign: null, amount: null, companyText: '', description: '' }

        const sign = raw[0] === '+' || raw[0] === '-' ? raw[0] : null
        const afterSign = sign ? raw.substring(1).trim() : raw
        const amountMatch = afterSign.match(/^(\d+(?:\.\d+)?)/)
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

    const { sign, amount, companyText, description: descriptionText } = getParsedInput()

    // Filter company suggestions as user types
    const getCompanySuggestions = () => {
        if (selectedCompany || !input.trim() || !companies.length) return []
        const raw = input.trim()
        const afterSign = (raw[0] === '+' || raw[0] === '-') ? raw.substring(1).trim() : raw
        const amountMatch = afterSign.match(/^(\d+(?:\.\d+)?)/)
        const rest = amountMatch ? afterSign.substring(amountMatch[0].length).trim() : afterSign
        if (!rest) return companies.slice(0, 6)

        const queryToken = rest.toLowerCase().trim()
        return companies.filter(c => {
            const cleanName = c.name.replace(/^\d+\.?\s*/, '').trim().toLowerCase()
            return cleanName.includes(queryToken) || c.name.toLowerCase().includes(queryToken)
        }).slice(0, 6)
    }

    const companySuggestions = getCompanySuggestions()

    // Handle Input Change with strict rules: 
    // 1. Must start with + or -
    // 2. Clearing text field wipes all previous selections (Company & Package null and void)
    const handleInputChange = (val: string) => {
        // Clearing text field -> reset all selections
        if (!val.trim()) {
            setInput('')
            setSelectedCompany(null)
            setSelectedPackage(null)
            setCompanyPackages([])
            setWarningMsg(null)
            return
        }

        // Must start with + or -
        if (val.length > 0 && val[0] !== '+' && val[0] !== '-') {
            setWarningMsg('Input MUST start with + (Payment) or - (Charge)')
            return
        }

        setInput(val)
        setWarningMsg(null)
    }

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
        if (selectedPackage?.id === pkg.id) {
            setSelectedPackage(null)
        } else {
            setSelectedPackage(pkg)
        }
        setWarningMsg(null)
        inputRef.current?.focus()
    }

    // Validation Rules:
    // 1. Must start with + or -
    // 2. Must contain valid positive amount
    // 3. Must select a company
    // 4. Must select a package (if company has packages)
    // 5. Description is OPTIONAL!
    const validateTransactionInput = (): string | null => {
        const raw = input.trim()
        if (!raw) return 'Message MUST start with + or - symbol'
        
        if (raw[0] !== '+' && raw[0] !== '-') {
            return 'Invalid Format! Message MUST start with + (Payment) or - (Charge)'
        }
        
        const { amount } = getParsedInput()

        if (!amount || amount <= 0) {
            return 'Please enter amount after + or -'
        }

        if (!selectedCompany) {
            return 'Please select a company'
        }

        if (companyPackages.length > 0 && !selectedPackage) {
            return 'Please select a package'
        }

        return null // Valid! (Description is optional)
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (isFormValid) {
                handleSend()
            } else {
                const err = validateTransactionInput()
                if (err) setWarningMsg(err)
            }
            return
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

    // Display packages: When a package is selected, hide all other package pills!
    const displayPackages = selectedPackage
        ? companyPackages.filter(p => p.id === selectedPackage.id)
        : companyPackages

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
                                    <div 
                                        onClick={() => handleMessageClick(msg)}
                                        className="rounded-[16px] rounded-tr-[2px] px-3 py-2 max-w-[85%] shadow-[0_1px_1px_rgba(0,0,0,0.08)] bg-[#DCF8C6] text-[#111111] relative cursor-pointer active:scale-95 transition-all hover:shadow-md group"
                                        title="Tap to view transaction package"
                                    >
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

            {/* Live Package Suggestions Bar (When selected, ONLY selected package is shown!) */}
            {selectedCompany && companyPackages.length > 0 && (
                <div className="bg-purple-50/95 backdrop-blur-md px-3 py-2 border-t border-purple-200 shadow-lg flex gap-2 overflow-x-auto ios-scroll z-20 transition-all duration-300 ease-out items-center">
                    <span className="text-[12px] font-semibold text-purple-800 flex items-center gap-1 shrink-0 self-center">
                        <PackageIcon className="w-3.5 h-3.5 text-purple-600" /> Package:
                    </span>
                    {displayPackages.map(pkg => {
                        const isSelected = selectedPackage?.id === pkg.id
                        return (
                            <button
                                key={pkg.id}
                                onClick={() => handleSelectPackage(pkg)}
                                className={`px-3 py-1 rounded-full text-[13px] font-semibold shrink-0 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs ${
                                    isSelected
                                        ? 'bg-purple-700 text-white ring-2 ring-purple-400 font-bold'
                                        : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100'
                                }`}
                            >
                                {isSelected && <span className="text-[14px]">✓</span>}
                                {pkg.description}
                                {isSelected && <X className="w-3.5 h-3.5 ml-1 opacity-80 hover:opacity-100" />}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* iOS WhatsApp Bottom Bar */}
            <div className="shrink-0 bg-[#EFEAE2] border-t border-gray-300/60 px-3 py-2.5 flex items-center gap-2 safe-area-bottom z-20">
                {/* Rounded Input Field */}
                <div className="flex-1 min-w-0 bg-white rounded-full border border-gray-300 px-4 py-2 flex items-center gap-2 shadow-xs">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="+15000 BOOSTER BIS Inclusion fee"
                        className="w-full text-[16px] text-gray-900 placeholder:text-gray-400 outline-none font-sans bg-transparent"
                        disabled={sending}
                        autoComplete="off"
                        autoCapitalize="none"
                    />
                    {input && (
                        <button
                            type="button"
                            onClick={() => handleInputChange('')}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
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
                            ? 'bg-[#00A884] text-white shadow-md active:scale-95' 
                            : 'bg-gray-300 text-gray-500 opacity-60 cursor-not-allowed'
                    }`}
                >
                    <Send className="w-5 h-5" style={{ transform: 'rotate(-45deg)', marginLeft: '2px' }} />
                </button>
            </div>
        </div>
    )
}
