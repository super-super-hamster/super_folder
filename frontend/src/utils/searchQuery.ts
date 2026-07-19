export interface ParsedSearchQuery {
  tags: string[]
  remarks: string[]
  keyword: string
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const tokens: { type: 'tag' | 'remark'; raw: string; start: number; end: number }[] = []
  const regex = /(^|[\s&])(tag|标签|备注|note)[:：]([^\s&]+)(?=\s)/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(query)) !== null) {
    const separator = match[1]
    const prefix = match[2].toLowerCase()
    const type = prefix === 'tag' || prefix === '标签' ? 'tag' : 'remark'
    tokens.push({ type, raw: match[0].slice(separator.length).replace(/：/g, ':'), start: match.index + separator.length, end: match.index + match[0].length })
  }
  tokens.sort((a, b) => a.start - b.start)

  let keyword = ''
  let last = 0
  tokens.forEach((t) => {
    keyword += query.slice(last, t.start)
    last = t.end
  })
  keyword += query.slice(last)
  keyword = keyword.replace(/&/g, ' ').replace(/\s+/g, ' ').trim()

  return {
    tags: tokens.filter((t) => t.type === 'tag').map((t) => t.raw),
    remarks: tokens.filter((t) => t.type === 'remark').map((t) => t.raw),
    keyword
  }
}

export function buildSearchQuery(parts: { tags?: string[]; remarks?: string[]; keyword?: string }): string {
  const { tags = [], remarks = [], keyword = '' } = parts
  const chips = [...tags, ...remarks]
  const chipPart = chips.join(' & ')
  if (!keyword) return chipPart ? `${chipPart} ` : ''
  if (!chipPart) return keyword
  return `${chipPart} ${keyword}`
}
