import { useEffect, useState } from "react"

import { SmartFavoritesSDK } from "~/src/sdk/client"
import {
  DEFAULT_PROMPT_TEMPLATE,
  DEFAULT_SYSTEM_PROMPT
} from "~/src/sdk/constants"
import type { ExportSnapshot, SmartFavoritesSettings } from "~/src/sdk/types"

const sdk = new SmartFavoritesSDK()

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: 32,
  background:
    "linear-gradient(135deg, #f3f7ff 0%, #fff8e8 45%, #ffffff 100%)",
  color: "#172033",
  fontFamily:
    '"SF Pro Display", "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif'
}

const cardStyle: React.CSSProperties = {
  maxWidth: 920,
  margin: "0 auto 20px",
  padding: 24,
  borderRadius: 20,
  background: "rgba(255, 255, 255, 0.9)",
  border: "1px solid rgba(23, 32, 51, 0.08)",
  boxShadow: "0 20px 60px rgba(23, 32, 51, 0.08)"
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #d7deea",
  boxSizing: "border-box",
  fontSize: 14,
  background: "#ffffff"
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 16
}

function downloadJson(snapshot: ExportSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json"
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `smart-favorites-backup-${Date.now()}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function SettingsPage() {
  const [settings, setSettings] = useState<SmartFavoritesSettings | null>(null)
  const [status, setStatus] = useState("正在加载设置…")

  useEffect(() => {
    void loadSettings()
  }, [])

  async function loadSettings() {
    const nextSettings = await sdk.getSettings()
    setSettings(nextSettings)
    setStatus("已读取当前配置。")
  }

  async function saveSettings() {
    if (!settings) {
      return
    }

    await sdk.saveSettings(settings)
    setStatus("配置已保存。")
  }

  async function exportBackup() {
    const snapshot = await sdk.exportSnapshot()
    downloadJson(snapshot)
    setStatus("已导出本地备份。")
  }

  if (!settings) {
    return <main style={pageStyle}>{status}</main>
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            alignItems: "flex-start"
          }}>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#0f7b6c"
              }}>
              Smart Favorites AI SDK
            </div>
            <h1 style={{ margin: "8px 0 10px", fontSize: 34 }}>
              模型与策略配置
            </h1>
            <p style={{ margin: 0, color: "#627089", lineHeight: 1.7 }}>
              插件默认提供本地启发式推荐，不依赖云端即可工作。配置 OpenAI
              兼容接口后，会在本地推荐基础上增加 AI 文件夹建议。
            </p>
          </div>
          <div
            style={{
              minWidth: 220,
              padding: 14,
              borderRadius: 16,
              background: "#172033",
              color: "#ffffff",
              fontSize: 13,
              lineHeight: 1.6
            }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>隐私原则</div>
            <div>只有当你配置 API Key 并触发推荐时，页面摘要才会发送到模型接口。</div>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>AI Provider</h2>
        <label style={labelStyle}>
          <div style={{ marginBottom: 8, color: "#627089" }}>接口基地址</div>
          <input
            onChange={(event) =>
              setSettings({
                ...settings,
                provider: {
                  ...settings.provider,
                  baseUrl: event.target.value
                }
              })
            }
            placeholder="https://api.openai.com/v1"
            style={inputStyle}
            value={settings.provider.baseUrl}
          />
        </label>
        <label style={labelStyle}>
          <div style={{ marginBottom: 8, color: "#627089" }}>模型名称</div>
          <input
            onChange={(event) =>
              setSettings({
                ...settings,
                provider: {
                  ...settings.provider,
                  model: event.target.value
                }
              })
            }
            placeholder="gpt-4.1-mini"
            style={inputStyle}
            value={settings.provider.model}
          />
        </label>
        <label style={labelStyle}>
          <div style={{ marginBottom: 8, color: "#627089" }}>API Key</div>
          <input
            onChange={(event) =>
              setSettings({
                ...settings,
                provider: {
                  ...settings.provider,
                  apiKey: event.target.value
                }
              })
            }
            placeholder="sk-..."
            style={inputStyle}
            type="password"
            value={settings.provider.apiKey}
          />
        </label>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Prompt 模板</h2>
        <label style={labelStyle}>
          <div style={{ marginBottom: 8, color: "#627089" }}>System Prompt</div>
          <textarea
            onChange={(event) =>
              setSettings({
                ...settings,
                prompts: {
                  ...settings.prompts,
                  system: event.target.value
                }
              })
            }
            rows={6}
            style={{ ...inputStyle, resize: "vertical" }}
            value={settings.prompts.system}
          />
        </label>
        <label style={labelStyle}>
          <div style={{ marginBottom: 8, color: "#627089" }}>
            User Prompt Template
          </div>
          <textarea
            onChange={(event) =>
              setSettings({
                ...settings,
                prompts: {
                  ...settings.prompts,
                  template: event.target.value
                }
              })
            }
            rows={12}
            style={{ ...inputStyle, resize: "vertical" }}
            value={settings.prompts.template}
          />
        </label>
        <button
          onClick={() =>
            setSettings({
              ...settings,
              prompts: {
                system: DEFAULT_SYSTEM_PROMPT,
                template: DEFAULT_PROMPT_TEMPLATE
              }
            })
          }
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: 0,
            background: "#eef3ff",
            color: "#172033",
            cursor: "pointer",
            fontWeight: 700
          }}
          type="button">
          恢复默认模板
        </button>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>策略开关</h2>
        <label style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input
            checked={settings.behavior.allowCreateFolder}
            onChange={(event) =>
              setSettings({
                ...settings,
                behavior: {
                  ...settings.behavior,
                  allowCreateFolder: event.target.checked
                }
              })
            }
            type="checkbox"
          />
          <span>允许推荐创建新文件夹</span>
        </label>
        <label style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input
            checked={settings.behavior.preferExistingFolder}
            onChange={(event) =>
              setSettings({
                ...settings,
                behavior: {
                  ...settings.behavior,
                  preferExistingFolder: event.target.checked
                }
              })
            }
            type="checkbox"
          />
          <span>优先推荐已有结构，降低新建文件夹频率</span>
        </label>
        <label style={{ display: "flex", gap: 10 }}>
          <input
            checked={settings.behavior.storeKnowledge}
            onChange={(event) =>
              setSettings({
                ...settings,
                behavior: {
                  ...settings.behavior,
                  storeKnowledge: event.target.checked
                }
              })
            }
            type="checkbox"
          />
          <span>保存页面摘要、标签和推荐结果到本地知识库</span>
        </label>
      </section>

      <section style={{ ...cardStyle, marginBottom: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap"
          }}>
          <div style={{ color: "#627089" }}>{status}</div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={exportBackup}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #d7deea",
                background: "#ffffff",
                cursor: "pointer",
                fontWeight: 700
              }}
              type="button">
              导出备份
            </button>
            <button
              onClick={saveSettings}
              style={{
                padding: "12px 18px",
                borderRadius: 14,
                border: 0,
                background: "#172033",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 700
              }}
              type="button">
              保存配置
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default SettingsPage
