#!/usr/bin/env node
/**
 * cn-holiday-mcp — 零依赖的中国法定节假日/调休 MCP 服务器。
 *
 * stdio 传输，新行分隔 JSON-RPC 2.0，符合 MCP 2024-11-05 协议。
 * 数据来源：国务院办公厅关于 2025/2026 年部分节假日安排的通知（国办发明电）。
 */
import { createInterface } from 'node:readline'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const holidays = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'holidays.json'), 'utf8'))

const SERVER_INFO = { name: 'cn-holiday-mcp', version: '0.1.0' }
const PROTOCOL_VERSION = '2024-11-05'

const TOOLS = [
  {
    name: 'query_holiday',
    description:
      '查询某一天（YYYY-MM-DD）是法定节假日、调休上班日还是普通工作日。返回节假日名称、放假区间和该区间内的调休上班日。',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: '日期，格式 YYYY-MM-DD，例如 2026-02-17' },
      },
      required: ['date'],
    },
  },
  {
    name: 'list_holidays',
    description:
      '列出某一年（或全部已收录年份）的法定节假日安排，包括放假区间、天数与调休上班日。',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'string', description: '年份，如 "2026"；缺省时返回全部已收录年份' },
      },
    },
  },
]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(text) {
  if (!DATE_RE.test(text)) return false
  const [y, m, d] = text.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** @returns {{ text: string, isError?: boolean }} */
function queryHoliday(date) {
  if (!isValidDate(date)) {
    return { text: `参数错误：${JSON.stringify(date)} 不是有效的 YYYY-MM-DD 日期。`, isError: true }
  }
  for (const [year, list] of Object.entries(holidays)) {
    for (const h of list) {
      if (date >= h.start && date <= h.end) {
        const work = h.workdays.length > 0 ? `\n调休上班日：${h.workdays.join('、')}` : ''
        return {
          text: `${date}（${year} 年）是【${h.name}】假期，共 ${h.days} 天（${h.start} 至 ${h.end}）。${work}`,
        }
      }
      if (h.workdays.includes(date)) {
        return {
          text: `${date} 是【${h.name}】的调休上班日，需要上班（假期为 ${h.start} 至 ${h.end}）。`,
        }
      }
    }
  }
  const year = date.slice(0, 4)
  const covered = holidays[year] ? '' : `（注：本服务器仅收录 ${Object.keys(holidays).join('、')} 年数据）`
  return { text: `${date} 是普通工作日，不在任何法定节假日或调休安排内。${covered}` }
}

function listHolidays(year) {
  const years = year ? [year] : Object.keys(holidays)
  const out = []
  for (const y of years) {
    const list = holidays[y]
    if (!list) {
      out.push(`未收录 ${y} 年的数据。`)
      continue
    }
    out.push(`【${y} 年】`)
    for (const h of list) {
      const work = h.workdays.length > 0 ? `；调休上班：${h.workdays.join('、')}` : ''
      out.push(`- ${h.name}：${h.start} 至 ${h.end}（${h.days} 天）${work}`)
    }
  }
  return { text: out.join('\n') }
}

const callHandlers = {
  query_holiday: (args) => queryHoliday(args?.date ?? ''),
  list_holidays: (args) => listHolidays(args?.year),
}

function handle(method, params) {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      }
    case 'ping':
      return {}
    case 'tools/list':
      return { tools: TOOLS }
    case 'tools/call': {
      const handler = callHandlers[params?.name]
      if (!handler) return { content: [{ type: 'text', text: `未知工具：${params?.name}` }], isError: true }
      try {
        const { text, isError } = handler(params?.arguments ?? {})
        return { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) }
      } catch (error) {
        return { content: [{ type: 'text', text: `工具执行失败：${error.message}` }], isError: true }
      }
    }
    default:
      return { content: [{ type: 'text', text: `未知方法：${method}` }], isError: true }
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })
rl.on('line', (line) => {
  if (!line.trim()) return
  let msg
  try {
    msg = JSON.parse(line)
  } catch {
    return
  }
  if (msg.id === undefined || msg.id === null) return // 通知（initialized 等），不响应
  const reply = { jsonrpc: '2.0', id: msg.id }
  if (msg.method === undefined) {
    reply.error = { code: -32600, message: 'Invalid Request' }
  } else {
    reply.result = handle(msg.method, msg.params ?? {})
  }
  process.stdout.write(JSON.stringify(reply) + '\n')
})
rl.on('close', () => process.exit(0))
