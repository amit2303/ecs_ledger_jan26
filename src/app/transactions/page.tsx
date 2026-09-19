'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, Send, AlertCircle, Building2, Package as PackageIcon, X, ChevronDown } from 'lucide-react'
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

/**
 * Color Coded Message Text Component (Native WhatsApp Style)
 * + AMOUNT    -> Standard Green (#00875A) e.g. "+ ₹20,000/-"
 * - AMOUNT    -> Standard Red (#D9383A)   e.g. "- ₹20,000/-"
 * Company     -> Standard Blue (#007AFF)
 * Description -> Standard Black (#111827)
 */
function ColorCodedMessageText({ text, companyName }: { text: string; companyName?: string | null }) {
    const raw = text.trim()
    if (!raw) return <span>{text}</span>

    const isPlus = raw.startsWith('+')
    const isMinus = raw.startsWith('-')

    if (!isPlus && !isMinus) {
        return <span className="font-normal text-[#111827] uppercase">{text.toUpperCase()}</span>
    }

    const sign = raw[0]
    const afterSign = raw.substring(1).trim()
    
    // Extract numerical amount
    const amountMatch = afterSign.match(/^(\d+(?:\.\d+)?)/)
    if (!amountMatch) {
        return <span className="font-normal text-[#111827] uppercase">{text.toUpperCase()}</span>
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

    if (!compPart && restAfterAmount.trim()) {
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
                    <span className="font-medium text-[#007AFF] uppercase">
                        {cleanComp}
                    </span>
                </>
            )}

            {/* GUARANTEED SPACE + DESCRIPTION */}
            {cleanDesc && (
                <>
                    {' '}
                    <span className="font-normal text-[#111827] uppercase">
                        {cleanDesc}
                    </span>
                </>
            )}
        </span>
    )
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
    // 3. Auto-convert input to UPPERCASE
    const handleInputChange = (val: string) => {
        const upperVal = val.toUpperCase()

        // Clearing text field -> reset all selections
        if (!upperVal.trim()) {
            setInput('')
            setSelectedCompany(null)
            setSelectedPackage(null)
            setCompanyPackages([])
            setWarningMsg(null)
            return
        }

        // Must start with + or -
        if (upperVal.length > 0 && upperVal[0] !== '+' && upperVal[0] !== '-') {
            setWarningMsg('Input MUST start with + (Payment) or - (Charge)')
            return
        }

        setInput(upperVal)
        setWarningMsg(null)
    }

    const handleSelectCompany = (comp: CompanyItem) => {
        const cleanName = comp.name.replace(/^\d+\.?\s*/, '').trim().toUpperCase()
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

        // Convert everything to UPPERCASE before saving
        const rawText = input.trim().toUpperCase()

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

    return (
        <div className="flex flex-col h-full relative font-sans overflow-hidden select-none" style={{ backgroundColor: '#EFEAE2' }}>
            {/* iOS WhatsApp Header */}
            <header className="shrink-0 z-20 px-4 py-3.5 flex items-center justify-between bg-[#F6F6F6]/95 backdrop-blur-md border-b border-gray-300/80 shadow-xs min-h-[68px]">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className="flex items-center text-[#007AFF] font-medium text-[16px] -ml-1 active:opacity-60 transition-opacity">
                        <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
                    </Link>
                    
                    {/* Group Icon & Details */}
                    <div className="flex items-center gap-3 min-w-0">
                        <img 
                            src="/logo.jpg" 
                            alt="Logo" 
                            className="w-[42px] h-[42px] rounded-full object-cover shrink-0 border border-gray-200 shadow-xs"
                        />
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-[17px] font-bold text-gray-900 truncate leading-tight tracking-tight">EXPERT HISAB KITAB</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Chat Body (WhatsApp Image Background) */}
            <div 
                className="flex-1 overflow-y-auto ios-scroll px-3.5 py-3.5 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/uploads/WHATSAPP.jpeg')",
                    backgroundColor: '#EFEAE2'
                }}
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500 text-[14px] bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm font-medium">Loading chat...</div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center px-6 max-w-[320px] bg-white/85 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-gray-200/60">
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
                            const isSuccess = msg.status === 'SUCCESS'

                            return (
                                <div key={msg.id} className="flex justify-end pr-1.5 my-0.5">
                                    <div 
                                        onClick={() => handleMessageClick(msg)}
                                        className="rounded-[14px] rounded-tr-[2px] px-3 py-2 min-w-[120px] max-w-[85%] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] bg-[#E7FFDB] text-[#111111] relative cursor-pointer active:scale-98 transition-all hover:shadow-md group"
                                        title="Tap to view transaction package"
                                    >
                                        <div className="text-[15px] font-sans leading-snug break-words whitespace-pre-wrap font-normal">
                                            <ColorCodedMessageText text={msg.rawText} companyName={msg.companyName} />
                                            
                                            <span className="inline-flex items-center gap-1 text-[11px] text-[#667781] ml-3 float-right mt-1 font-sans font-normal select-none">
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

            {/* Live Company Suggestions Bar */}
            {companySuggestions.length > 0 && !selectedCompany && (
                <div className="bg-white/95 backdrop-blur-md px-3 py-2 border-t border-gray-200/60 shadow-lg flex gap-2 overflow-x-auto ios-scroll z-20 transition-all duration-300 ease-out">
                    <span className="text-[12px] font-medium text-gray-500 flex items-center gap-1 shrink-0 self-center uppercase tracking-wide">
                        <Building2 className="w-3.5 h-3.5" /> Company:
                    </span>
                    {companySuggestions.map(comp => (
                        <button
                            key={comp.id}
                            onClick={() => handleSelectCompany(comp)}
                            className="px-3.5 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#007AFF] text-[13px] font-medium shrink-0 active:scale-95 transition-all flex items-center gap-1 border border-blue-200 shadow-xs uppercase"
                        >
                            {comp.name.replace(/^\d+\.?\s*/, '')}
                        </button>
                    ))}
                </div>
            )}

            {/* Live Package Suggestions Bar (hides when a package is selected) */}
            {selectedCompany && companyPackages.length > 0 && !selectedPackage && (
                <div className="bg-purple-50/95 backdrop-blur-md px-3 py-2 border-t border-purple-200 shadow-lg flex gap-2 overflow-x-auto ios-scroll z-20 transition-all duration-300 ease-out items-center">
                    <span className="text-[12px] font-medium text-purple-800 flex items-center gap-1 shrink-0 self-center uppercase tracking-wide">
                        <PackageIcon className="w-3.5 h-3.5 text-purple-600" /> Select Package:
                    </span>
                    {companyPackages.map(pkg => (
                        <button
                            key={pkg.id}
                            onClick={() => handleSelectPackage(pkg)}
                            className="px-3.5 py-1.5 rounded-full bg-white text-purple-900 border border-purple-200 hover:bg-purple-100 text-[13px] font-medium shrink-0 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs uppercase"
                        >
                            {pkg.description}
                        </button>
                    ))}
                </div>
            )}

            {/* FIXED DOCKED PACKAGE BADGE ABOVE TEXT INPUT FIELD */}
            {selectedPackage && (
                <div className="bg-purple-50/95 backdrop-blur-md px-3.5 py-1.5 border-t border-b border-purple-200/80 flex items-center justify-between z-20 animate-in slide-in-from-bottom-1 duration-200 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-semibold tracking-wider text-purple-700 uppercase flex items-center gap-1 shrink-0 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                            <PackageIcon className="w-3.5 h-3.5 text-purple-600" /> PACKAGE
                        </span>
                        <span className="text-[13px] font-semibold text-purple-900 truncate uppercase">
                            {selectedPackage.description}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedPackage(null)}
                        className="p-1 text-purple-600 hover:text-purple-900 hover:bg-purple-100 rounded-full transition-colors shrink-0"
                        title="Remove package selection"
                    >
                        <X className="w-4 h-4 stroke-[2]" />
                    </button>
                </div>
            )}

            {/* iOS WhatsApp Bottom Input Bar */}
            <div className="shrink-0 bg-[#EFEAE2] border-t border-gray-300/60 px-3 py-2 flex items-center gap-2 safe-area-bottom z-20">
                {/* Rounded Input Field */}
                <div className="flex-1 min-w-0 bg-white rounded-full border border-gray-300/80 px-4 py-2 flex items-center gap-2 shadow-xs">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="+15000 BOOSTER BIS INCLUSION FEE"
                        className="w-full text-[15px] font-normal text-gray-900 placeholder:text-gray-400 placeholder:font-normal outline-none font-sans bg-transparent tracking-normal uppercase"
                        disabled={sending}
                        autoComplete="off"
                        autoCapitalize="characters"
                    />
                    {input && (
                        <button
                            type="button"
                            onClick={() => handleInputChange('')}
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
        </div>
    )
}
