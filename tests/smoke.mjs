/**
 * 冒烟测试：以子进程方式启动服务器，按 MCP 协议对话并断言关键响应。
 * 用法：node tests/smoke.mjs
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const server = spawn(process.execPath, [join(__dirname, '..', 'src', 'server.mjs')], { stdio: ['pipe', 'pipe', 'inherit'] })

const pending = new Map()
let buffer = ''
let nextId = 1

server.stdout.on('data', (chunk) => {
  buffer += chunk.toString()
  let nl
  while ((nl = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, nl)
    buffer = buffer.slice(nl + 1)
    if (!line.trim()) continue
    const msg = JSON.parse(line)
    if (pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
})

function rpc(method, params = {}) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, resolve)
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error(`timeout: ${method}`))
      }
    }, 5000)
  })
}

function assert(cond, label) {
  if (!cond) {
    console.error(`FAIL: ${label}`)
    process.exitCode = 1
  } else {
    console.log(`ok: ${label}`)
  }
}

const cases = [
  ['query_holiday', { date: '2026-02-17' }, /春节/],
  ['query_holiday', { date: '2026-02-14' }, /调休上班日/],
  ['query_holiday', { date: '2026-03-10' }, /普通工作日/],
  ['query_holiday', { date: '2025-10-01' }, /国庆节/],
  ['query_holiday', { date: '不是日期' }, /参数错误/],
  ['list_holidays', { year: '2026' }, /9 天/],
]

try {
  const init = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } })
  assert(init.result?.serverInfo?.name === 'cn-holiday-mcp', 'initialize serverInfo')
  assert(typeof init.result?.protocolVersion === 'string', 'initialize protocolVersion')

  const list = await rpc('tools/list')
  assert(Array.isArray(list.result?.tools) && list.result.tools.length === 2, 'tools/list 返回 2 个工具')

  for (const [name, args, re] of cases) {
    const res = await rpc('tools/call', { name, arguments: args })
    const text = res.result?.content?.[0]?.text ?? ''
    assert(re.test(text), `${name}(${JSON.stringify(args)}) → ${text.slice(0, 40)}...`)
  }

  const ping = await rpc('ping')
  assert(ping.result !== undefined, 'ping 响应')
} catch (error) {
  console.error('FAIL: 协议对话异常', error)
  process.exitCode = 1
} finally {
  server.kill()
  if (process.exitCode) process.exit(process.exitCode)
}
