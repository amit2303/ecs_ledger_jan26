'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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
    const abs = Math.abs(n)
    const hasDecimals = abs % 1 !== 0
    return abs.toLocaleString('en-IN', { 
        minimumFractionDigits: hasDecimals ? 2 : 0, 
        maximumFractionDigits: 2 
    })
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

        // Ensure current month is always present
        const cur = getMonthKey(new Date())
        if (!map.has(cur)) {
            map.set(cur, { month: cur, income: 0, expense: 0, net: 0, count: 0 })
        }

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

    const chartScrollRef = useRef<HTMLDivElement>(null)

    // Automatically scroll financial trends bar to current month (or selected month) by default
    useEffect(() => {
        if (!loading && chartScrollRef.current && allMonthlyBreakdown.length > 0) {
            const curMonth = selectedMonth || getMonthKey(new Date())
            const targetIndex = allMonthlyBreakdown.findIndex(m => m.month === curMonth)
            const indexToScroll = targetIndex >= 0 ? targetIndex : allMonthlyBreakdown.length - 1
            
            const colWidth = 68
            const padLeft = 24
            const targetX = padLeft + indexToScroll * colWidth
            const containerWidth = chartScrollRef.current.clientWidth || 360
            
            const scrollTo = Math.max(0, targetX - containerWidth / 2)
            
            const t = setTimeout(() => {
                if (chartScrollRef.current) {
                    chartScrollRef.current.scrollTo({
                        left: scrollTo,
                        behavior: 'smooth'
                    })
                }
            }, 60)
            return () => clearTimeout(t)
        }
    }, [loading, selectedMonth, allMonthlyBreakdown])

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto ios-scroll pb-44" style={{ backgroundColor: '#F2F2F7' }}>
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-gray-500 text-[14px] bg-white px-5 py-3 rounded-full shadow-sm border border-black/5 font-medium animate-pulse">Loading...</div>
                </div>
            ) : (
                <div className="px-4 space-y-3.5 pt-3 ios-fade-in">
                    {/* 1. Monthly Overview Card (Single outer card for Net, Income & Expense) */}
                    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/5 space-y-4">
                        {/* Net on Top with Integrated Month Selector */}
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 pr-3 flex-1">
                                <p className="text-[12px] font-medium text-gray-500">
                                    Net Balance • {shortMonthLabel(selectedMonth)}
                                </p>
                                <p className={`text-[24px] sm:text-[26px] font-bold tracking-tight mt-0.5 tabular-nums ${totals.net >= 0 ? 'text-gray-950' : 'text-[#EF4444]'}`}>
                                    {totals.net < 0 ? `- ₹${formatCurrency(totals.net)}` : `₹${formatCurrency(totals.net)}`}
                                </p>
                            </div>
                            
                            {/* Month Selector Dropdown */}
                            <div className="relative shrink-0">
                                <select 
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="appearance-none bg-[#F2F2F7] hover:bg-gray-200/80 border border-black/5 rounded-xl pl-3 pr-7 py-2 text-[13px] font-semibold text-gray-800 shadow-xs focus:outline-none cursor-pointer active:scale-95 transition-all"
                                >
                                    {availableMonths.map((mKey) => (
                                        <option key={mKey} value={mKey}>
                                            {shortMonthLabel(mKey)}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Income & Expenses Row (Spacious columns, no inner cards) */}
                        <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-gray-100">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
                                    <span className="text-[12px] font-medium text-gray-500">Income</span>
                                </div>
                                <p className="text-[19px] sm:text-[21px] font-bold text-[#16A34A] tracking-tight tabular-nums">
                                    ₹{formatCurrency(totals.received)}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                                    <span className="text-[12px] font-medium text-gray-500">Expenses</span>
                                </div>
                                <p className="text-[19px] sm:text-[21px] font-bold text-[#EF4444] tracking-tight tabular-nums">
                                    ₹{formatCurrency(totals.spent)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Monthly Share Distribution Card */}
                    <div className="bg-white rounded-2xl p-5 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/5">
                        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-xl bg-[#EBF3FE] flex items-center justify-center shrink-0">
                                <Users className="w-4 h-4 text-[#007AFF] stroke-[2.2]" />
                            </div>
                            <div>
                                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">
                                    Monthly Share Distribution
                                </h2>
                                <p className="text-[12px] text-gray-400 font-medium">Partner profit allocations</p>
                            </div>
                        </div>

                        {/* 2 Partner Share columns (clean, spacious, divide-x, NO inner cards) */}
                        <div className="grid grid-cols-2 divide-x divide-gray-100 py-1">
                            {/* Mr. Shyam Sunder Mishra */}
                            <div className="pr-4 space-y-1">
                                <p className="text-[13px] font-semibold text-gray-800">
                                    Shyam Sunder Mishra
                                </p>
                                <p className="text-[20px] sm:text-[22px] font-bold text-[#007AFF] tracking-tight tabular-nums">
                                    ₹{formatCurrency(settlement.ssmExpected)}
                                </p>
                                <p className="text-[11.5px] text-gray-400 font-medium">
                                    {selectedMonth < '2025-11' ? '67%' : '75%'} Share of Net
                                </p>
                            </div>

                            {/* Mr. Pankaj Sharma */}
                            <div className="pl-4 space-y-1">
                                <p className="text-[13px] font-semibold text-gray-800">
                                    Pankaj Sharma
                                </p>
                                <p className="text-[20px] sm:text-[22px] font-bold text-[#007AFF] tracking-tight tabular-nums">
                                    ₹{formatCurrency(settlement.pankajExpected)}
                                </p>
                                <p className="text-[11.5px] text-gray-400 font-medium">
                                    {selectedMonth < '2025-11' ? '33%' : '25%'} Share of Net
                                </p>
                            </div>
                        </div>

                        {/* Monthly Settlement Status (clean row, NO colored alert container) */}
                        <div className="pt-3.5 border-t border-gray-100 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    Monthly Settlement Status
                                </p>
                                <p className="text-[20px] sm:text-[22px] font-bold text-[#007AFF] tracking-tight mt-0.5 tabular-nums">
                                    ₹{formatCurrency(settlement.amount)}
                                </p>
                                <p className="text-[12.5px] text-gray-600 font-medium mt-0.5 leading-snug">
                                    {settlement.isSettled 
                                        ? settlement.message 
                                        : `${settlement.payer} to give to ${settlement.payee}.`}
                                </p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200/60 flex items-center justify-center shrink-0">
                                <ArrowRightLeft className="w-4.5 h-4.5 text-[#007AFF] stroke-[2.2]" />
                            </div>
                        </div>
                    </div>

                    {/* 3. Cash in Hand Section (Single outer card, NO inner colored boxes) */}
                    <div className="bg-white rounded-2xl p-5 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/5">
                        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-xl bg-[#EBF3FE] flex items-center justify-center shrink-0">
                                <IndianRupee className="w-4 h-4 text-[#007AFF] stroke-[2.2]" />
                            </div>
                            <div>
                                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">
                                    Cash in Hand • {shortMonthLabel(selectedMonth)}
                                </h2>
                                <p className="text-[12px] text-gray-400 font-medium">Individual collections & expenses</p>
                            </div>
                        </div>

                        {/* Two spacious columns with vertical divider, ZERO inner cards */}
                        <div className="grid grid-cols-2 divide-x divide-gray-100 py-1">
                            {/* Mr. Shyam Sunder Mishra */}
                            <div className="pr-4 space-y-3">
                                <div>
                                    <p className="text-[13px] font-semibold text-gray-800">
                                        Shyam Sunder Mishra
                                    </p>
                                    <p className="text-[20px] sm:text-[22px] font-bold text-gray-950 tracking-tight mt-1 tabular-nums">
                                        ₹{formatCurrency(ssmStats.net)}
                                    </p>
                                    <p className="text-[11px] text-gray-400 font-medium">
                                        Net Cash in Hand
                                    </p>
                                </div>
                                <div className="space-y-1.5 pt-2 text-[12px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 font-medium">Income</span>
                                        <span className="font-semibold text-[#16A34A] tabular-nums">
                                            ₹{formatCurrency(ssmStats.received)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 font-medium">Expense</span>
                                        <span className="font-semibold text-[#EF4444] tabular-nums">
                                            ₹{formatCurrency(ssmStats.spent)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Mr. Pankaj Sharma */}
                            <div className="pl-4 space-y-3">
                                <div>
                                    <p className="text-[13px] font-semibold text-gray-800">
                                        Pankaj Sharma
                                    </p>
                                    <p className="text-[20px] sm:text-[22px] font-bold text-gray-950 tracking-tight mt-1 tabular-nums">
                                        ₹{formatCurrency(pankajStats.net)}
                                    </p>
                                    <p className="text-[11px] text-gray-400 font-medium">
                                        Net Cash in Hand
                                    </p>
                                </div>
                                <div className="space-y-1.5 pt-2 text-[12px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 font-medium">Income</span>
                                        <span className="font-semibold text-[#16A34A] tabular-nums">
                                            ₹{formatCurrency(pankajStats.received)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 font-medium">Expense</span>
                                        <span className="font-semibold text-[#EF4444] tabular-nums">
                                            ₹{formatCurrency(pankajStats.spent)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Financial Year Summary Card (Single outer card, NO nested boxes) */}
                    <div className="bg-white rounded-2xl p-5 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/5">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[#E8F1FD] flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-4 h-4 text-[#2563EB] stroke-[2.2]" />
                                </div>
                                <div>
                                    <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">
                                        Financial Year ({financialYearStats.label})
                                    </h2>
                                    <p className="text-[12px] text-gray-400 font-medium">Cumulative yearly figures</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#007AFF]">
                                {financialYearStats.label}
                            </span>
                        </div>

                        {/* Top: FY Net (Spacious typography, NO inner blue card!) */}
                        <div className="py-1">
                            <p className="text-[12px] font-medium text-gray-500">FY Total Net Profit</p>
                            <p className="text-[26px] sm:text-[28px] font-bold text-[#2563EB] tracking-tight mt-0.5 tabular-nums">
                                ₹{formatCurrency(financialYearStats.net)}
                            </p>
                        </div>

                        {/* Below: FY Income | FY Expenses (Spacious 2 columns, NO inner red/green cards!) */}
                        <div className="grid grid-cols-2 gap-4 py-3.5 border-y border-gray-100">
                            <div>
                                <p className="text-[12px] font-medium text-gray-500">FY Income</p>
                                <p className="text-[19px] sm:text-[21px] font-bold text-[#16A34A] tracking-tight mt-0.5 tabular-nums">
                                    ₹{formatCurrency(financialYearStats.income)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[12px] font-medium text-gray-500">FY Expenses</p>
                                <p className="text-[19px] sm:text-[21px] font-bold text-[#EF4444] tracking-tight mt-0.5 tabular-nums">
                                    ₹{formatCurrency(financialYearStats.expense)}
                                </p>
                            </div>
                        </div>

                        {/* Monthly Averages (Clean 3 columns directly on the card, NO inner gray box or white cards!) */}
                        <div className="pt-1 space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Monthly Averages</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <p className="text-[11px] text-gray-500 font-medium">Avg Income</p>
                                    <p className="text-[14px] sm:text-[15px] font-bold text-[#16A34A] tracking-tight mt-0.5 tabular-nums">
                                        ₹{formatCurrency(financialYearStats.avgIncome)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-500 font-medium">Avg Expense</p>
                                    <p className="text-[14px] sm:text-[15px] font-bold text-[#EF4444] tracking-tight mt-0.5 tabular-nums">
                                        ₹{formatCurrency(financialYearStats.avgExpense)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-500 font-medium">Avg Net</p>
                                    <p className="text-[14px] sm:text-[15px] font-bold text-gray-900 tracking-tight mt-0.5 tabular-nums">
                                        ₹{formatCurrency(financialYearStats.avgNet)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5. Monthly Income vs Expense Line Graph Card */}
                    <div className="bg-white rounded-2xl p-5 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/5">
                        {/* Header */}
                        <div className="space-y-2 pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[#E8F1FD] flex items-center justify-center shrink-0">
                                    <LineChart className="w-4 h-4 text-[#2563EB] stroke-[2.2]" />
                                </div>
                                <div>
                                    <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">
                                        Monthly Financial Trends
                                    </h2>
                                    <p className="text-[12px] text-gray-400 font-medium">Timeline of income, expenses & net profit</p>
                                </div>
                            </div>

                            {/* Metrics Row */}
                            {(() => {
                                const curData = allMonthlyBreakdown.find(m => m.month === selectedMonth)
                                if (!curData) return null
                                return (
                                    <div className="flex items-center gap-3 text-[12px] font-semibold pt-1 flex-wrap">
                                        <span className="text-[#2563EB]">Inc: ₹{formatCurrency(curData.income)}</span>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-[#EF4444]">Exp: ₹{formatCurrency(curData.expense)}</span>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-[#16A34A]">Net: ₹{formatCurrency(curData.net)}</span>
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
                                    <div ref={chartScrollRef} className="relative overflow-x-auto ios-scroll pb-1">
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
