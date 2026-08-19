# cn-holiday-mcp

中国法定节假日与调休查询的 **MCP（Model Context Protocol）服务器**，零依赖、离线可用、开箱即用。

数据来源：国务院办公厅《关于 2025 年部分节假日安排的通知》《关于 2026 年部分节假日安排的通知》（国办发明电）。

## 特性

- ✅ 零依赖：纯 Node.js 标准库，`node >= 18` 直接跑
- ✅ stdio 传输，符合 MCP `2024-11-05` 协议
- ✅ 收录 2025、2026 两年完整数据（含全部调休上班日）
- ✅ 两个工具：`query_holiday`（查某天）、`list_holidays`（列全年）

## 快速开始

```sh
node src/server.mjs          # 直接运行
npm start                    # 或通过 npm script
node tests/smoke.mjs         # 冒烟测试
```

### 接入 Claude Desktop

编辑 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "cn-holiday": {
      "command": "node",
      "args": ["C:\\path\\to\\cn-holiday-mcp\\src\\server.mjs"]
    }
  }
}
```

## 工具

| 工具 | 参数 | 示例 |
|---|---|---|
| `query_holiday` | `date`：`YYYY-MM-DD` | `2026-02-17` → 春节假期 |
| `list_holidays` | `year`：年份（可省） | `2026` → 全年安排 |

## 示例问答

- `2026-02-14` → 「春节的调休上班日，需要上班」
- `2026-10-05` → 「国庆节假期，共 7 天」
- `2026-03-10` → 「普通工作日」

## 路线图（Pro 版）

- [ ] 农历/黄历/节气（万年历）
- [ ] 2027 年及以后数据（官方发布即更新）
- [ ] 企业排班 API、订阅制（HTTP + token）
- [ ] 多国节假日

## English

`cn-holiday-mcp` is a **zero-dependency MCP server** for Chinese public holidays and makeup workdays (调休), covering 2025–2026 per official State Council notices. No API keys, no network calls, fully offline.

**Tools**

- `query_holiday` — is a given date (`YYYY-MM-DD`) a public holiday, a makeup workday, or a regular working day?
- `list_holidays` — full yearly schedule including makeup workdays.

**Run**

```sh
node src/server.mjs   # Node.js >= 18, nothing to install
```

**Install** — Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cn-holiday": {
      "command": "node",
      "args": ["C:\\path\\to\\cn-holiday-mcp\\src\\server.mjs"]
    }
  }
}
```

**Roadmap** — lunar calendar / solar terms; 2027+ schedules; enterprise scheduling API (subscription); more countries.

## License

MIT
