/**
 * Transaction Message Parser
 * 
 * Parses shorthand transaction messages like:
 *   "+ 50000 BOOSTER Bis fee"
 *   "- 12000 RELIANCE Annual maintenance"
 * 
 * Format: [+/-] <amount> <company name> [description]
 */

export const PERSON_ALIASES: { pattern: RegExp; canonical: string }[] = [
    { pattern: /@\s*(amit\s*mishra|amit)/i, canonical: 'Amit Mishra' },
    { pattern: /@\s*(sumit\s*mishra|sumit)/i, canonical: 'Sumit Mishra' },
    { pattern: /@\s*(shyam\s*sunder\s*mishra|shyam\s*sunder|ssm|papa|mamaji)/i, canonical: 'Shyam Sunder Mishra' },
    { pattern: /@\s*(pankaj\s*sharma|pankaj\s*bhaiya|pankaj|bhaiya)/i, canonical: 'Pankaj Sharma' },
]

export function extractPerson(text: string): string | null {
    for (const item of PERSON_ALIASES) {
        if (item.pattern.test(text)) {
            return item.canonical
        }
    }
    return null
}

export interface ParsedTransaction {
    type: 'PAYMENT' | 'CHARGE'
    amount: number
    companyQuery: string
    description: string
    targetPackageQuery?: string
    person?: string | null
    raw: string
}

export interface ParseError {
    error: string
    raw: string
}

export type ParseResult = ParsedTransaction | ParseError

export function isParseError(result: ParseResult): result is ParseError {
    return 'error' in result
}

export function stripPersonMention(text: string | null | undefined): string {
    if (!text) return ''
    return text
        .replace(/@\s*(amit\s*mishra|amit|sumit\s*mishra|sumit|shyam\s*sunder\s*mishra|shyam\s*sunder|ssm|papa|mamaji|pankaj\s*sharma|pankaj\s*bhaiya|pankaj|bhaiya)\b/gi, '')
        .replace(/@\s*[A-Za-z0-9_]+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

export function extractMiscDescription(text: string | null | undefined): string {
    if (!text) return ''
    const raw = text.trim()
    if (!raw || (raw[0] !== '+' && raw[0] !== '-')) return ''
    
    // Remove sign and find amount
    const afterSign = raw.substring(1).trim()
    const amountMatch = afterSign.match(/^(\d*\.?\d+)/)
    if (!amountMatch) return ''
    
    const rest = afterSign.substring(amountMatch[0].length).trim()
    const withoutPerson = stripPersonMention(rest)
    // Strip explicit ECS MISC / ECS MSC / MISC keywords if typed
    const clean = withoutPerson.replace(/\b(ECS\s*MISC|ECS\s*MSC|MISC)\b/gi, '').trim()
    return clean
}

export function parseTransactionMessage(text: string): ParseResult {
    const raw = text.trim()
    if (!raw) {
        return { error: 'Empty message', raw }
    }

    // Extract the sign (+/-)
    const sign = raw[0]
    if (sign !== '+' && sign !== '-') {
        return { error: 'Message must start with + (payment) or - (charge)', raw }
    }

    const type: 'PAYMENT' | 'CHARGE' = sign === '+' ? 'PAYMENT' : 'CHARGE'

    // Remove the sign and trim
    let rest = raw.substring(1).trim()
    if (!rest) {
        return { error: 'Missing amount after sign', raw }
    }

    const detectedPerson = extractPerson(raw)

    // Check if there is a @ package specification at the end (only if NOT a person mention)
    let targetPackageQuery: string | undefined = undefined
    if (!detectedPerson) {
        const atIndex = rest.indexOf('@')
        if (atIndex !== -1) {
            targetPackageQuery = rest.substring(atIndex + 1).trim()
            rest = rest.substring(0, atIndex).trim()
        }
    }

    // Extract the amount (first token that looks like a number)
    const amountMatch = rest.match(/^(\d*\.?\d+)/)
    if (!amountMatch) {
        return { error: 'Invalid amount. Expected a number after +/-', raw }
    }

    const amount = parseFloat(amountMatch[1])
    if (isNaN(amount) || amount <= 0) {
        return { error: 'Amount must be a positive number', raw }
    }

    // Everything after the amount
    const afterAmount = rest.substring(amountMatch[0].length).trim()

    // For CHARGE / expense: no company required
    if (type === 'CHARGE') {
        const description = stripPersonMention(afterAmount)
        return {
            type,
            amount,
            companyQuery: '',
            description,
            person: detectedPerson,
            raw
        }
    }

    if (!afterAmount) {
        return { error: 'Missing company name after amount', raw }
    }

    const tokens = afterAmount.split(/\s+/)
    
    // First token = company query (or multi-word if handles)
    const companyQuery = tokens[0]
    // Entry description should only have the actual description, not @ or person
    const rawDescription = tokens.slice(1).join(' ')
    const description = stripPersonMention(rawDescription)

    return {
        type,
        amount,
        companyQuery,
        description,
        targetPackageQuery,
        person: detectedPerson,
        raw
    }
}

/**
 * Finds the best matching company from a list of companies.
 * Uses case-insensitive partial matching on the company name.
 * 
 * @param query - The company query string (e.g., "BOOSTER")
 * @param companies - Array of companies with id and name
 * @returns The best matching company or null
 */
export function findBestCompanyMatch(
    query: string,
    companies: { id: number; name: string }[]
): { id: number; name: string } | null {
    const q = query.toLowerCase().trim()
    if (!q) return null

    // 1. Exact match (ignoring diary number prefix like "1.  BOOSTER")
    const exactMatch = companies.find(c => {
        const cleanName = c.name.replace(/^\d+\.?\s*/, '').trim().toLowerCase()
        return cleanName === q
    })
    if (exactMatch) return exactMatch

    // 2. Starts-with match
    const startsWithMatches = companies.filter(c => {
        const cleanName = c.name.replace(/^\d+\.?\s*/, '').trim().toLowerCase()
        return cleanName.startsWith(q)
    })
    if (startsWithMatches.length === 1) return startsWithMatches[0]

    // 3. Contains match
    const containsMatches = companies.filter(c => {
        const cleanName = c.name.replace(/^\d+\.?\s*/, '').trim().toLowerCase()
        return cleanName.includes(q)
    })
    if (containsMatches.length === 1) return containsMatches[0]

    // 4. If multiple matches, return the shortest name (most specific match)
    if (containsMatches.length > 1) {
        return containsMatches.sort((a, b) => a.name.length - b.name.length)[0]
    }

    return null
}
