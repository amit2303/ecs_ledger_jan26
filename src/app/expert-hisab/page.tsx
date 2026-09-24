'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { 
    TrendingUp, TrendingDown, IndianRupee, 
    ArrowRightLeft, ChevronDown, Calendar, Plus, BarChart2, LineChart,
    Users, Clock, BookText
} from 'lucide-react'

const PERSONS = [
    { canonical: 'Amit Mishra',         display: 'Amit',   group: 'SSM',    color: '#007AFF', bg: '#EBF5FF' },
    { canonical: 'Sumit Mishra',        display: 'Sumit',  group: 'SSM',    color: '#34C759', bg: '#EDFAEF' },
    { canonical: 'Shyam Sunder Mishra', display: 'SSM',    group: 'SSM',    color: '#FF9500', bg: '#FFF4E5' },
    { canonical: 'Pankaj Sharma',       display: 'Pankaj', group: 'PANKAJ', color: '#AF52DE', bg: '#F5EEFF' },
]

const SSM_SHARE = 0.75
const PANKAJ_SHARE = 0.25

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
    paymentId: number | null
    chargeId: number | null
    person: string | null
    createdAt: string
}

interface HistoricalSummary {
    id: number
    month: string
    income: number
    expense: number
    net: number
    ssmIncome: number
    ssmExpense: number
    pankajIncome: number
    pankajExpense: number
    entryCount: number
}

function formatCurrency(n: number) {
    return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getMonthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
    const [y, m] = key.split('-')
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function shortMonthLabel(key: string) {
    const [y, m] = key.split('-')
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export default function ExpertDashboardPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [historicalSummaries, setHistoricalSummaries] = useState<HistoricalSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()))
    const [hoveredMonth, setHoveredMonth] = useState<{ month: string; income: number; expense: number; net: number; x: number; y: number } | null>(null)

    useEffect(() => {
        Promise.all([
            fetch('/api/transactions/chat?includeArchived=true').then(r => r.json()),
            fetch('/api/expert-hisab/summaries').then(r => r.json())
        ])
        .then(([chatData, histData]) => {
            if (Array.isArray(chatData)) setMessages(chatData)
            if (Array.isArray(histData)) setHistoricalSummaries(histData)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }, [])

    const availableMonths = useMemo(() => {
        const set = new Set<string>()
        // Historical months
        historicalSummaries.forEach(h => set.add(h.month))
        // Active chat message months (only count chats from Sept 2026 onwards)
        messages.forEach(m => { 
            if (m.status === 'SUCCESS') {
                const k = getMonthKey(new Date(m.createdAt))
                if (k >= '2026-09') {
                    set.add(k)
                }
            } 
        })
        // Ensure current month is always present
        const cur = getMonthKey(new Date())
        set.add(cur)
        return Array.from(set).sort().reverse()
    }, [messages, historicalSummaries])

    // All chronological monthly data for the chart and yearly calculations
    const allMonthlyBreakdown = useMemo(() => {
        const map = new Map<string, { month: string; income: number; expense: number; net: number; count: number }>()

        // Historical summaries
        historicalSummaries.forEach(h => {
            map.set(h.month, {
                month: h.month,
                income: h.income,
                expense: h.expense,
                net: h.net,
                count: h.entryCount
            })
        })

        // Live chat messages (only count from Sept 2026 onwards)
        messages.forEach(m => {
            if (m.status !== 'SUCCESS') return
            const k = getMonthKey(new Date(m.createdAt))
            if (k < '2026-09') return // Ignore old chats, handled by HistoricalMonthSummary

            const existing = map.get(k) || { month: k, income: 0, expense: 0, net: 0, count: 0 }
            if (m.type === 'PAYMENT') existing.income += m.amount
            else if (m.type === 'CHARGE') existing.expense += m.amount
            existing.count += 1
            existing.net = existing.income - existing.expense
            map.set(k, existing)
        })

        return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
    }, [historicalSummaries, messages])

    // Financial Year Stats (April to March, e.g. FY 2025-26)
    const financialYearInfo = useMemo(() => {
        const [yearStr, monthStr] = (selectedMonth || getMonthKey(new Date())).split('-')
        const y = parseInt(yearStr, 10)
        const m = parseInt(monthStr, 10)
        const startYear = m >= 4 ? y : y - 1
        const endYear = startYear + 1
        const fyLabel = `FY ${startYear}-${String(endYear).slice(-2)}`
        const startMonthKey = `${startYear}-04`
        const endMonthKey = `${endYear}-03`
        return { startYear, endYear, fyLabel, startMonthKey, endMonthKey }
    }, [selectedMonth])

    const financialYearStats = useMemo(() => {
        const { startMonthKey, endMonthKey, fyLabel } = financialYearInfo
        const monthsInFY = allMonthlyBreakdown.filter(m => m.month >= startMonthKey && m.month <= endMonthKey)
        let income = 0, expense = 0, count = 0
        monthsInFY.forEach(m => {
            income += m.income
            expense += m.expense
            count += m.count
        })
        const net = income - expense
        const monthsCount = Math.max(1, monthsInFY.length)
        const avgIncome = income / monthsCount
        const avgExpense = expense / monthsCount
        const avgNet = net / monthsCount

        return {
            label: fyLabel,
            income,
            expense,
            net,
            count,
            avgIncome,
            avgExpense,
            avgNet,
            monthsCount
        }
    }, [allMonthlyBreakdown, financialYearInfo])

    const histSummary = useMemo(() => {
        return historicalSummaries.find(h => h.month === selectedMonth)
    }, [historicalSummaries, selectedMonth])

    const monthMessages = useMemo(() => {
        if (selectedMonth < '2026-09') return [] // No chat breakdown for historical months
        return messages.filter(m => 
            m.status === 'SUCCESS' && 
            getMonthKey(new Date(m.createdAt)) === selectedMonth
        ).reverse()
    }, [messages, selectedMonth])

    const totals = useMemo(() => {
        if (histSummary && monthMessages.length === 0) {
            return {
                received: histSummary.income,
                spent: histSummary.expense,
                net: histSummary.net,
                entryCount: histSummary.entryCount
            }
        }
        let received = histSummary ? histSummary.income : 0
        let spent = histSummary ? histSummary.expense : 0
        monthMessages.forEach(m => {
            if (m.type === 'PAYMENT') received += m.amount
            else if (m.type === 'CHARGE') spent += m.amount
        })
        return { 
            received, 
            spent, 
            net: received - spent,
            entryCount: (histSummary ? histSummary.entryCount : 0) + monthMessages.length
        }
    }, [monthMessages, histSummary])

    const ssmStats = useMemo(() => {
        let received = histSummary ? histSummary.ssmIncome : 0
        let spent = histSummary ? histSummary.ssmExpense : 0
        monthMessages.filter(m => m.person && (m.person.includes('Mishra') || m.person.includes('SSM') || m.person.includes('Amit') || m.person.includes('Sumit'))).forEach(m => {
            if (m.type === 'PAYMENT') received += m.amount
            else if (m.type === 'CHARGE') spent += m.amount
        })
        return { received, spent, net: received - spent }
    }, [monthMessages, histSummary])

    const pankajStats = useMemo(() => {
        let received = histSummary ? histSummary.pankajIncome : 0
        let spent = histSummary ? histSummary.pankajExpense : 0
        monthMessages.filter(m => m.person && m.person.includes('Pankaj')).forEach(m => {
            if (m.type === 'PAYMENT') received += m.amount
            else if (m.type === 'CHARGE') spent += m.amount
        })
        return { received, spent, net: received - spent }
    }, [monthMessages, histSummary])

    const settlement = useMemo(() => {
        const net = totals.net
        const ssmShareRatio = selectedMonth < '2025-11' ? 0.67 : SSM_SHARE
        const pankajShareRatio = selectedMonth < '2025-11' ? 0.33 : PANKAJ_SHARE
        const ssmExpected = net * ssmShareRatio
        const pankajExpected = net * pankajShareRatio
        const ssmActual = ssmStats.net
        const pankajActual = pankajStats.net
        const ssmDiff = ssmExpected - ssmActual
        const pankajDiff = pankajExpected - pankajActual
        let message = ''
        let isSettled = false
        let amount = 0
        let payer = ''
        let payee = ''

        if (Math.abs(net) < 1) { 
            message = 'Net is zero. No settlement needed.'
            isSettled = true 
            amount = 0
        } else if (Math.abs(ssmDiff) < 1 && Math.abs(pankajDiff) < 1) { 
            message = 'All accounts are settled per share ratio.'
            isSettled = true 
            amount = 0
        } else if (ssmDiff > 0.01) {
            amount = Math.abs(ssmDiff)
            payer = 'Mr. Pankaj Sharma'
            payee = 'Mr. Shyam Sunder Mishra'
            message = `Mr. Pankaj Sharma to give ₹${formatCurrency(amount)} to Mr. Shyam Sunder Mishra.`
        } else if (pankajDiff > 0.01) {
            amount = Math.abs(pankajDiff)
            payer = 'Mr. Shyam Sunder Mishra'
            payee = 'Mr. Pankaj Sharma'
            message = `Mr. Shyam Sunder Mishra to give ₹${formatCurrency(amount)} to Mr. Pankaj Sharma.`
        } else {
            message = 'Review individual contributions for exact settlement.'
        }
        return { message, isSettled, amount, payer, payee, ssmExpected, pankajExpected, ssmActual, pankajActual, ssmDiff, pankajDiff }
    }, [totals, ssmStats, pankajStats, selectedMonth])

    const currentIdx = availableMonths.indexOf(selectedMonth)
    const canPrev = currentIdx < availableMonths.length - 1
    const canNext = currentIdx > 0

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto ios-scroll pb-44" style={{ backgroundColor: '#F2F2F7' }}>
            {/* Top Header matching iOS Ledger header style */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between gap-3">
                    {/* Left: Blue Icon Box + Dashboard + Month */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-[14px] bg-[#E8F1FD] flex items-center justify-center shrink-0 border border-black/5">
                            <Calendar className="w-5 h-5 text-[#2563EB] stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-[20px] sm:text-[22px] font-bold text-gray-900 tracking-tight leading-tight">Dashboard</h1>
                            <p className="text-[12px] sm:text-[13px] text-gray-500 font-normal truncate">{monthLabel(selectedMonth)}</p>
                        </div>
                    </div>

                    {/* Right: Select Month Dropdown */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                            <select 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="appearance-none bg-white border border-gray-200/90 rounded-xl pl-3 pr-7 py-1.5 text-[12px] sm:text-[13px] font-semibold text-gray-800 shadow-2xs focus:outline-none cursor-pointer"
                            >
                                {availableMonths.map((mKey) => (
                                    <option key={mKey} value={mKey}>
                                        {shortMonthLabel(mKey)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-gray-500 text-[14px] bg-white px-5 py-3 rounded-full shadow-sm border border-black/5 font-medium animate-pulse">Loading...</div>
                </div>
            ) : monthMessages.length === 0 && (!histSummary || histSummary.entryCount === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center px-6 mt-12 opacity-80 ios-fade-in">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <BookText className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-[17px] font-semibold text-gray-900 tracking-tight">No Transactions</h3>
                    <p className="text-[14px] text-gray-500 text-center mt-1">There is no financial history recorded for {monthLabel(selectedMonth)}.</p>
                </div>
            ) : (
                <div className="px-4 space-y-3 mt-3 ios-fade-in">
                    {/* Monthly Metrics: Net on Top, Income & Expense side-by-side (2 columns) */}
                    <div className="space-y-3">
                        {/* 1. Net Card */}
                        <div 
                            className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 transition-transform active:scale-[0.98]"
                        >
                            <div className="min-w-0 pr-2">
                                <p className="text-[12px] sm:text-[13px] font-medium text-gray-500">Net ({monthLabel(selectedMonth)})</p>
                                <p className="text-[22px] sm:text-[24px] font-bold text-gray-950 tracking-tight mt-0.5 tabular-nums break-words">
                                    ₹{formatCurrency(totals.net)}
                                </p>
                            </div>
                            <div className="w-11 h-11 rounded-[14px] bg-[#EBF3FE] flex items-center justify-center shrink-0">
                                <IndianRupee className="w-5 h-5 text-[#2563EB] stroke-[2.2]" />
                            </div>
                        </div>

                        {/* 2 & 3. Income & Expenses side-by-side in 2 columns */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Income Card */}
                            <div 
                                className="bg-white rounded-[20px] p-4 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 transition-transform active:scale-[0.98]"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[12px] font-medium text-gray-500 truncate">Income</span>
                                    <div className="w-8 h-8 rounded-[10px] bg-[#E8F8EE] flex items-center justify-center shrink-0">
                                        <TrendingUp className="w-4 h-4 text-[#16A34A] stroke-[2.2]" />
                                    </div>
                                </div>
                                <p className="text-[20px] sm:text-[22px] font-bold text-[#16A34A] tracking-tight tabular-nums break-words">
                                    ₹{formatCurrency(totals.received)}
                                </p>
                            </div>

                            {/* Expenses Card */}
                            <div 
                                className="bg-white rounded-[20px] p-4 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 transition-transform active:scale-[0.98]"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[12px] font-medium text-gray-500 truncate">Expenses</span>
                                    <div className="w-8 h-8 rounded-[10px] bg-[#FDECEC] flex items-center justify-center shrink-0">
                                        <TrendingDown className="w-4 h-4 text-[#EF4444] stroke-[2.2]" />
                                    </div>
                                </div>
                                <p className="text-[20px] sm:text-[22px] font-bold text-[#EF4444] tracking-tight tabular-nums break-words">
                                    ₹{formatCurrency(totals.spent)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Share Distribution Card */}
                    <div 
                        className="bg-white rounded-[20px] p-4 space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-[10px] bg-[#EBF3FE] flex items-center justify-center shrink-0">
                                <Users className="w-4 h-4 text-[#007AFF] stroke-[2.2]" />
                            </div>
                            <h2 className="text-[14px] sm:text-[15px] font-bold text-gray-900 tracking-tight">
                                Monthly Share Distribution
                            </h2>
                        </div>

                        {/* 2 Partner Share cards side-by-side */}
                        <div className="grid grid-cols-2 gap-2.5">
                            {/* Mr. Shyam Sunder Mishra */}
                            <div className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-3 sm:p-3.5 flex flex-col items-center text-center">
                                <p className="text-[12px] sm:text-[13px] font-semibold text-gray-800 tracking-tight truncate max-w-full">
                                    Mr. Shyam Sunder Mishra
                                </p>
                                <p className="text-[18px] sm:text-[22px] font-bold text-[#007AFF] tracking-tight mt-1 tabular-nums break-words max-w-full">
                                    ₹{formatCurrency(settlement.ssmExpected)}
                                </p>
                                <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate max-w-full">
                                    {selectedMonth < '2025-11' ? '67%' : '75%'} of Monthly Net
                                </p>
                            </div>

                            {/* Mr. Pankaj Sharma */}
                            <div className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-3 sm:p-3.5 flex flex-col items-center text-center">
                                <p className="text-[12px] sm:text-[13px] font-semibold text-gray-800 tracking-tight truncate max-w-full">
                                    Mr. Pankaj Sharma
                                </p>
                                <p className="text-[18px] sm:text-[22px] font-bold text-[#007AFF] tracking-tight mt-1 tabular-nums break-words max-w-full">
                                    ₹{formatCurrency(settlement.pankajExpected)}
                                </p>
                                <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate max-w-full">
                                    {selectedMonth < '2025-11' ? '33%' : '25%'} of Monthly Net
                                </p>
                            </div>
                        </div>

                        {/* Monthly Settlement Status Alert Banner */}
                        <div className="rounded-xl bg-[#F0F6FE] border border-[#D2E4FC] p-3.5 sm:p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] sm:text-[13px] font-bold text-[#007AFF] tracking-tight">
                                    Monthly Settlement Status:
                                </p>
                                <p className="text-[22px] sm:text-[24px] font-bold text-[#007AFF] tracking-tight mt-0.5 tabular-nums break-words">
                                    ₹{formatCurrency(settlement.amount)}
                                </p>
                                <p className="text-[12px] sm:text-[13px] text-[#2563EB] font-normal mt-0.5 leading-snug">
                                    {settlement.isSettled 
                                        ? settlement.message 
                                        : `${settlement.payer} to give to ${settlement.payee}.`}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#D2E4FC] flex items-center justify-center shrink-0 shadow-2xs">
                                <ArrowRightLeft className="w-5 h-5 text-[#007AFF] stroke-[2.2]" />
                            </div>
                        </div>
                    </div>

                    {/* Cash in Hand Section */}
                    <div 
                        className="bg-white rounded-[20px] p-4 space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#EBF3FE] flex items-center justify-center shrink-0">
                                <IndianRupee className="w-4 h-4 text-[#007AFF] stroke-[2.2]" />
                            </div>
                            <h2 className="text-[14px] sm:text-[15px] font-bold text-gray-900 tracking-tight">
                                Cash in Hand - {monthLabel(selectedMonth)}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            {/* Mr. Shyam Sunder Mishra */}
                            <div className="bg-[#F0F6FE] border border-[#D2E4FC] rounded-xl p-3 sm:p-3.5 flex flex-col items-center text-center">
                                <p className="text-[12px] sm:text-[13px] font-semibold text-gray-900 tracking-tight truncate max-w-full">
                                    Mr. Shyam Sunder Mishra
                                </p>
                                <p className="text-[18px] sm:text-[22px] font-bold text-[#1D68F2] tracking-tight mt-1 tabular-nums break-words max-w-full">
                                    ₹{formatCurrency(ssmStats.net)}
                                </p>
                                <p className="text-[11px] text-gray-500 font-normal mt-0.5">
                                    Cash in Hand
                                </p>
                                <div className="w-full space-y-1.5 mt-3 pt-2.5 border-t border-[#D2E4FC]/70">
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-[10px] sm:text-[11px] font-medium text-[#16A34A]">Income</span>
                                        <span className="text-[12px] sm:text-[13px] font-bold text-gray-900 tabular-nums break-words max-w-full">
                                            ₹{formatCurrency(ssmStats.received)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-[10px] sm:text-[11px] font-medium text-[#EF4444]">Expenses</span>
                                        <span className="text-[12px] sm:text-[13px] font-bold text-gray-900 tabular-nums break-words max-w-full">
                                            ₹{formatCurrency(ssmStats.spent)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Mr. Pankaj Sharma */}
                            <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-3 sm:p-3.5 flex flex-col items-center text-center">
                                <p className="text-[12px] sm:text-[13px] font-semibold text-gray-900 tracking-tight truncate max-w-full">
                                    Mr. Pankaj Sharma
                                </p>
                                <p className="text-[18px] sm:text-[22px] font-bold text-[#16A34A] tracking-tight mt-1 tabular-nums break-words max-w-full">
                                    ₹{formatCurrency(pankajStats.net)}
                                </p>
                                <p className="text-[11px] text-gray-500 font-normal mt-0.5">
                                    Cash in Hand
                                </p>
                                <div className="w-full space-y-1.5 mt-3 pt-2.5 border-t border-[#DCFCE7]/90">
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-[10px] sm:text-[11px] font-medium text-[#16A34A]">Income</span>
                                        <span className="text-[12px] sm:text-[13px] font-bold text-gray-900 tabular-nums break-words max-w-full">
                                            ₹{formatCurrency(pankajStats.received)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-[10px] sm:text-[11px] font-medium text-[#EF4444]">Expenses</span>
                                        <span className="text-[12px] sm:text-[13px] font-bold text-gray-900 tabular-nums break-words max-w-full">
                                            ₹{formatCurrency(pankajStats.spent)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* 5. Financial Year Summary Card */}
                    <div 
                        className="bg-white rounded-[20px] p-4 space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#E8F1FD] flex items-center justify-center shrink-0">
                                <TrendingUp className="w-4 h-4 text-[#2563EB] stroke-[2.2]" />
                            </div>
                            <h2 className="text-[14px] sm:text-[15px] font-bold text-gray-900 tracking-tight">
                                Financial Year Summary ({financialYearStats.label})
                            </h2>
                        </div>

                        {/* Top: FY Net (Full Width) */}
                        <div className="bg-[#EBF3FE] border border-[#DBEAFE] rounded-xl p-3 sm:p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] sm:text-[12px] font-medium text-gray-500">FY Net ({financialYearStats.label})</p>
                                <p className="text-[18px] sm:text-[22px] font-bold text-[#2563EB] tracking-tight mt-0.5 tabular-nums break-words leading-tight">
                                    ₹{formatCurrency(financialYearStats.net)}
                                </p>
                            </div>
                            <div className="w-9 h-9 rounded-lg bg-white border border-[#DBEAFE] flex items-center justify-center shrink-0 shadow-2xs">
                                <IndianRupee className="w-4.5 h-4.5 text-[#2563EB] stroke-[2.2]" />
                            </div>
                        </div>

                        {/* Below: FY Income | FY Expenses (2 columns side-by-side) */}
                        <div className="grid grid-cols-2 gap-2.5">
                            {/* FY Income */}
                            <div className="bg-[#EDFAEF] border border-[#DCFCE7] rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
                                <p className="text-[11px] sm:text-[12px] font-medium text-gray-500">FY Income</p>
                                <p className="text-[15px] sm:text-[18px] font-bold text-[#16A34A] tracking-tight mt-1 tabular-nums break-words leading-tight">
                                    ₹{formatCurrency(financialYearStats.income)}
                                </p>
                            </div>

                            {/* FY Expenses */}
                            <div className="bg-[#FDECEC] border border-[#FEE2E2] rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
                                <p className="text-[11px] sm:text-[12px] font-medium text-gray-500">FY Expenses</p>
                                <p className="text-[15px] sm:text-[18px] font-bold text-[#EF4444] tracking-tight mt-1 tabular-nums break-words leading-tight">
                                    ₹{formatCurrency(financialYearStats.expense)}
                                </p>
                            </div>
                        </div>

                        {/* Monthly Averages Sub-Box */}
                        <div className="border border-gray-100 rounded-xl p-3 sm:p-3.5 bg-[#F9FAFB]/80">
                            <p className="text-[12px] sm:text-[13px] font-bold text-gray-900 mb-2">Monthly Averages</p>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium">Avg Income</p>
                                    <p className="text-[12px] sm:text-[14px] font-bold text-[#16A34A] tracking-tight mt-0.5 tabular-nums break-words leading-tight">
                                        ₹{formatCurrency(financialYearStats.avgIncome)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium">Avg Expenses</p>
                                    <p className="text-[12px] sm:text-[14px] font-bold text-[#EF4444] tracking-tight mt-0.5 tabular-nums break-words leading-tight">
                                        ₹{formatCurrency(financialYearStats.avgExpense)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium">Avg Net</p>
                                    <p className="text-[12px] sm:text-[14px] font-bold text-[#2563EB] tracking-tight mt-0.5 tabular-nums break-words leading-tight">
                                        ₹{formatCurrency(financialYearStats.avgNet)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 6. Monthly Income vs Expense Line Graph Card */}
                    <div 
                        className="bg-white rounded-[20px] p-4 space-y-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5"
                    >
                        {/* Header */}
                        <div className="space-y-2">
                            {/* Heading at Top */}
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[#E8F1FD] flex items-center justify-center shrink-0">
                                    <LineChart className="w-4 h-4 text-[#2563EB] stroke-[2.2]" />
                                </div>
                                <h2 className="text-[14px] sm:text-[15px] font-bold text-gray-900 tracking-tight">
                                    Monthly Financial Trends
                                </h2>
                            </div>

                            {/* Metrics Rows: Income/Expense in above row, Net in below row */}
                            {(() => {
                                const curData = allMonthlyBreakdown.find(m => m.month === selectedMonth)
                                if (!curData) return null
                                return (
                                    <div className="space-y-1 text-[11px] sm:text-[12px] font-semibold pt-0.5">
                                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                            <span className="text-[#2563EB]">Inc: ₹{formatCurrency(curData.income)}</span>
                                            <span className="text-gray-300">|</span>
                                            <span className="text-[#EF4444]">Exp: ₹{formatCurrency(curData.expense)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[#16A34A]">Net: ₹{formatCurrency(curData.net)}</span>
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>

                        {/* Full-Width Line Chart Area */}
                        {(() => {
                            if (allMonthlyBreakdown.length === 0) return null

                            const maxVal = Math.max(...allMonthlyBreakdown.flatMap(m => [m.income, m.expense, Math.abs(m.net)]), 100000)
                            const chartMax = Math.ceil(maxVal / 500000) * 500000 || 500000
                            const colWidth = 68
                            const padLeft = 24
                            const padRight = 24
                            const padTop = 20
                            const padBottom = 40
                            const chartH = 140
                            const svgHeight = 210
                            const totalMonths = allMonthlyBreakdown.length
                            const svgWidth = Math.max(340, padLeft + padRight + (totalMonths - 1) * colWidth)
                            const baselineY = padTop + chartH

                            // Calculate coordinate points
                            const incomePoints = allMonthlyBreakdown.map((m, i) => {
                                const x = padLeft + i * colWidth
                                const y = padTop + (chartH - (m.income / chartMax) * chartH)
                                return { x, y, month: m.month, income: m.income, expense: m.expense, net: m.net }
                            })

                            const expensePoints = allMonthlyBreakdown.map((m, i) => {
                                const x = padLeft + i * colWidth
                                const y = padTop + (chartH - (m.expense / chartMax) * chartH)
                                return { x, y, month: m.month, income: m.income, expense: m.expense, net: m.net }
                            })

                            const netPoints = allMonthlyBreakdown.map((m, i) => {
                                const x = padLeft + i * colWidth
                                const clampedNet = Math.max(0, m.net)
                                const y = padTop + (chartH - (clampedNet / chartMax) * chartH)
                                return { x, y, month: m.month, income: m.income, expense: m.expense, net: m.net }
                            })

                            // Straight line generator (point to point)
                            const getStraightPath = (pts: { x: number; y: number }[]) => {
                                if (pts.length === 0) return ''
                                return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                            }

                            const incomePathD = getStraightPath(incomePoints)
                            const expensePathD = getStraightPath(expensePoints)
                            const netPathD = getStraightPath(netPoints)

                            const incomeAreaD = incomePoints.length > 1
                                ? `${incomePathD} L ${incomePoints[incomePoints.length - 1].x} ${baselineY} L ${incomePoints[0].x} ${baselineY} Z`
                                : ''

                            const expenseAreaD = expensePoints.length > 1
                                ? `${expensePathD} L ${expensePoints[expensePoints.length - 1].x} ${baselineY} L ${expensePoints[0].x} ${baselineY} Z`
                                : ''

                            const netAreaD = netPoints.length > 1
                                ? `${netPathD} L ${netPoints[netPoints.length - 1].x} ${baselineY} L ${netPoints[0].x} ${baselineY} Z`
                                : ''

                            // Grid steps
                            const gridLevels = [0.25, 0.5, 0.75, 1.0]

                            return (
                                <div className="space-y-3">
                                    <div className="relative overflow-x-auto ios-scroll pb-1">
                                        <div style={{ minWidth: `${svgWidth}px` }} className="relative h-[210px] select-none">
                                            <svg 
                                                width={svgWidth} 
                                                height={svgHeight} 
                                                className="overflow-visible"
                                            >
                                                <defs>
                                                    {/* Income Gradient (Blue) */}
                                                    <linearGradient id="incomeLineGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
                                                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                                                    </linearGradient>

                                                    {/* Expense Gradient (Red) */}
                                                    <linearGradient id="expenseLineGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#EF4444" stopOpacity="0.15" />
                                                        <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                                                    </linearGradient>

                                                    {/* Net Gradient (Green) */}
                                                    <linearGradient id="netLineGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#16A34A" stopOpacity="0.15" />
                                                        <stop offset="100%" stopColor="#16A34A" stopOpacity="0.0" />
                                                    </linearGradient>
                                                </defs>

                                                {/* Background Grid Lines */}
                                                {gridLevels.map((lvl, idx) => {
                                                    const yPos = padTop + chartH * (1 - lvl)
                                                    return (
                                                        <line
                                                            key={idx}
                                                            x1={padLeft - 10}
                                                            y1={yPos}
                                                            x2={svgWidth - padRight + 10}
                                                            y2={yPos}
                                                            stroke="#F1F5F9"
                                                            strokeDasharray="4 4"
                                                            strokeWidth="1"
                                                        />
                                                    )
                                                })}

                                                {/* Baseline */}
                                                <line
                                                    x1={padLeft - 10}
                                                    y1={baselineY}
                                                    x2={svgWidth - padRight + 10}
                                                    y2={baselineY}
                                                    stroke="#E2E8F0"
                                                    strokeWidth="1"
                                                />

                                                {/* Area Fills */}
                                                {incomeAreaD && (
                                                    <path d={incomeAreaD} fill="url(#incomeLineGrad)" />
                                                )}
                                                {expenseAreaD && (
                                                    <path d={expenseAreaD} fill="url(#expenseLineGrad)" />
                                                )}
                                                {netAreaD && (
                                                    <path d={netAreaD} fill="url(#netLineGrad)" />
                                                )}

                                                {/* Lines: Income (Blue), Expense (Red), Net (Green) */}
                                                <path
                                                    d={incomePathD}
                                                    fill="none"
                                                    stroke="#2563EB"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                                <path
                                                    d={expensePathD}
                                                    fill="none"
                                                    stroke="#EF4444"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                                <path
                                                    d={netPathD}
                                                    fill="none"
                                                    stroke="#16A34A"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />

                                                {/* Active Selected Month Guide Line & Dots */}
                                                {incomePoints.map((p, i) => {
                                                    const isSelected = p.month === selectedMonth
                                                    const expP = expensePoints[i]
                                                    const netP = netPoints[i]
                                                    if (!isSelected) return null

                                                    return (
                                                        <g key={`active-${p.month}`}>
                                                            {/* Vertical Guide Line */}
                                                            <line
                                                                x1={p.x}
                                                                y1={padTop}
                                                                x2={p.x}
                                                                y2={baselineY}
                                                                stroke="#94A3B8"
                                                                strokeDasharray="3 3"
                                                                strokeWidth="1.5"
                                                            />

                                                            {/* Active Income Outer Ring & Dot */}
                                                            <circle cx={p.x} cy={p.y} r="8" fill="#2563EB" fillOpacity="0.2" />
                                                            <circle cx={p.x} cy={p.y} r="5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />

                                                            {/* Active Expense Outer Ring & Dot */}
                                                            <circle cx={expP.x} cy={expP.y} r="8" fill="#EF4444" fillOpacity="0.2" />
                                                            <circle cx={expP.x} cy={expP.y} r="5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />

                                                            {/* Active Net Outer Ring & Dot */}
                                                            <circle cx={netP.x} cy={netP.y} r="8" fill="#16A34A" fillOpacity="0.2" />
                                                            <circle cx={netP.x} cy={netP.y} r="5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
                                                        </g>
                                                    )
                                                })}

                                                {/* Inactive Points & Month Labels */}
                                                {incomePoints.map((p, i) => {
                                                    const isSelected = p.month === selectedMonth
                                                    const expP = expensePoints[i]
                                                    const netP = netPoints[i]

                                                    return (
                                                        <g key={p.month} className="cursor-pointer" onClick={() => setSelectedMonth(p.month)}>
                                                            {/* Standard Income Dot (Blue) */}
                                                            {!isSelected && (
                                                                <circle cx={p.x} cy={p.y} r="3.5" fill="#2563EB" />
                                                            )}

                                                            {/* Standard Expense Dot (Red) */}
                                                            {!isSelected && (
                                                                <circle cx={expP.x} cy={expP.y} r="3.5" fill="#EF4444" />
                                                            )}

                                                            {/* Standard Net Dot (Green) */}
                                                            {!isSelected && (
                                                                <circle cx={netP.x} cy={netP.y} r="3.5" fill="#16A34A" />
                                                            )}

                                                            {/* Month Label */}
                                                            <text
                                                                x={p.x}
                                                                y={baselineY + 22}
                                                                textAnchor="middle"
                                                                fill={isSelected ? '#2563EB' : '#64748B'}
                                                                fontWeight={isSelected ? '700' : '500'}
                                                                fontSize="11"
                                                                className="select-none transition-colors"
                                                            >
                                                                {shortMonthLabel(p.month)}
                                                            </text>

                                                            {/* Invisible Clickable Hitbox for column */}
                                                            <rect
                                                                x={p.x - colWidth / 2}
                                                                y={padTop}
                                                                width={colWidth}
                                                                height={chartH + padBottom}
                                                                fill="transparent"
                                                            />
                                                        </g>
                                                    )
                                                })}
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Chart Legend */}
                                    <div className="flex items-center justify-center gap-5 pt-2 border-t border-gray-100 flex-wrap">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3.5 h-1.5 rounded-full bg-[#2563EB]" />
                                            <span className="text-[12px] font-semibold text-gray-700">Income</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3.5 h-1.5 rounded-full bg-[#EF4444]" />
                                            <span className="text-[12px] font-semibold text-gray-700">Expense</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3.5 h-1.5 rounded-full bg-[#16A34A]" />
                                            <span className="text-[12px] font-semibold text-gray-700">Net</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>

                    <p className="text-center text-[12px] text-gray-400 font-medium pb-2">
                        {totals.entryCount} entries this month
                    </p>
                </div>
            )}

            {/* Floating Action Button - + New Entry */}
            <div 
                className="fixed left-0 right-0 mx-auto w-full max-w-md lg:max-w-lg xl:max-w-xl flex justify-center pointer-events-none z-40 px-4"
                style={{ bottom: 'calc(56px + max(8px, env(safe-area-inset-bottom, 8px)) + 12px)' }}
            >
                <Link
                    href="/transactions"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D68F2] hover:bg-[#1557D0] text-white text-[14px] font-semibold rounded-full pointer-events-auto active:scale-95 transition-all shadow-[0_6px_20px_rgba(29,104,242,0.38)]"
                >
                    <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                    <span>New Entry</span>
                </Link>
            </div>
        </div>
    )
}
