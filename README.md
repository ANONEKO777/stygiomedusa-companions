# Stygiomedusa 夥伴包

[Stygiomedusa](https://github.com/seanmars/stygiomedusa-release) 的夥伴包, 以及製作夥伴包的工具包.

## 內容

| 路徑 | 內容 |
|---|---|
| `companion-tool/` | 製作工具包: 範本, 驗證, 打包與預覽. 說明見 [`companion-tool/README.md`](companion-tool/README.md) |
| `companionk/` | 夥伴K: `companionk.companion` 是夥伴包, `generate.mjs` 是產生腳本 |

## 使用夥伴包

1. 下載 `.companion` 檔.
2. 在 Stygiomedusa 的 popup 史萊姆分頁按「匯入夥伴包」.
3. 從「夥伴」選單選擇.

## 製作夥伴包

需要 Node.js 20.6 以上與 [uv](https://docs.astral.sh/uv/).

1. clone 這個 repo.
2. 在 `companion-tool/` 執行 `npm install`.
3. 執行 `npm run selftest`. 輸出「selftest 通過」即完成.
4. 依照 [`companion-tool/README.md`](companion-tool/README.md) 的「製作流程」製作.

## 版本

- `companion-tool/package.json` 的 `version` 是工具包對應的 Stygiomedusa 版本.
- `companion-tool/` 從 Stygiomedusa 的 repo 同步, 每次同步是一個 `companion-tool: 同步 Stygiomedusa <版本>` 的 commit. 不要直接修改 `companion-tool/`: 下次同步會覆寫.
