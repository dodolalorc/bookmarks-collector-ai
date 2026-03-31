import { useEffect, useMemo, useState } from "react"

import { SmartFavoritesSDK } from "~/src/sdk/client"
import type {
  BookmarkMutationResult,
  CapturePageResponse,
  RecommendationInput,
  RecommendationResult,
  SmartFavoritesSettings
} from "~/src/sdk/types"

const sdk = new SmartFavoritesSDK()

const panelStyle: React.CSSProperties = {
  width: 420,
  minHeight: 640,
  padding: 18,
  background:
    "radial-gradient(circle at top left, #fff6df 0%, #fffdf7 35%, #f4f7fb 100%)",
  color: "#172033",
  fontFamily:
    '"SF Pro Text", "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif'
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(23, 32, 51, 0.08)",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 12px 30px rgba(23, 32, 51, 0.08)"
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #cfd8e3",
  background: "#ffffff",
  boxSizing: "border-box",
  fontSize: 13,
  color: "#172033"
}

const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer"
}

const mutedStyle: React.CSSProperties = {
  color: "#627089",
  fontSize: 12,
  lineHeight: 1.5
}

function IndexPopup() {
  const [capture, setCapture] = useState<CapturePageResponse | null>(null)
  const [settings, setSettings] = useState<SmartFavoritesSettings | null>(null)
  const [notes, setNotes] = useState("")
  const [manualTags, setManualTags] = useState("")
  const [newFolderTitle, setNewFolderTitle] = useState("")
  const [recommendation, setRecommendation] =
    useState<RecommendationResult | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string>("")
  const [status, setStatus] = useState("正在读取当前页面…")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<BookmarkMutationResult | null>(null)

  const canRecommend = Boolean(capture?.page.url)
  const selectedSuggestion = recommendation?.suggestions.find(
    (item) => item.key === selectedTarget
  )

  useEffect(() => {
    void bootstrap()
  }, [])

  const pageSummary = useMemo(() => {
    if (!capture?.page) {
      return "没有可分析的页面信息。"
    }

    const selection = capture.selectionText?.trim()
    if (selection) {
      return selection
    }

    return capture.page.summary || "未抓取到足够正文，建议手动选择页面文字后再次抓取。"
  }, [capture])

  async function bootstrap() {
    setIsLoading(true)
    setStatus("正在读取插件配置和当前页面…")

    try {
      const [loadedSettings, loadedCapture] = await Promise.all([
        sdk.getSettings(),
        sdk.captureActivePage()
      ])

      setSettings(loadedSettings)
      setCapture(loadedCapture)
      setStatus(
        loadedCapture.page.url
          ? "页面上下文已就绪，可以直接推荐收藏夹。"
          : "当前标签页不可抓取，可手动输入备注后继续。"
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "无法初始化当前页面信息。"
      setStatus(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function refreshCapture() {
    setIsLoading(true)
    setStatus("正在重新抓取当前页内容…")

    try {
      const nextCapture = await sdk.captureActivePage()
      setCapture(nextCapture)
      setStatus("已更新页面内容，可以重新生成推荐。")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "抓取失败，请刷新页面后重试。"
      setStatus(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function runRecommendation() {
    if (!capture?.page.url) {
      setStatus("当前没有可用于分析的网址。")
      return
    }

    setIsLoading(true)
    setStatus("正在分析页面和现有收藏夹结构…")

    try {
      const payload: RecommendationInput = {
        page: capture.page,
        notes,
        selectedText: capture.selectionText,
        tags: manualTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      }

      const nextRecommendation = await sdk.recommendFolders(payload)
      setRecommendation(nextRecommendation)
      setSelectedTarget(nextRecommendation.suggestions[0]?.key ?? "")

      const createdSuggestion = nextRecommendation.suggestions.find(
        (item) => item.type === "create"
      )
      if (createdSuggestion?.title) {
        setNewFolderTitle(createdSuggestion.title)
      }

      setStatus(
        nextRecommendation.source === "ai"
          ? "已完成 AI 推荐，请确认后执行。"
          : "已完成本地推荐。配置模型后可获得更强的分类建议。"
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "推荐失败，请稍后再试。"
      setStatus(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function applyRecommendation() {
    if (!capture?.page.url || !selectedSuggestion) {
      setStatus("请先完成推荐并选择目标收藏夹。")
      return
    }

    setIsLoading(true)
    setStatus("正在写入浏览器书签…")

    try {
      const mutation = await sdk.applyBookmarkRecommendation({
        page: capture.page,
        input: {
          page: capture.page,
          notes,
          selectedText: capture.selectionText,
          tags: manualTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        },
        recommendation: {
          ...selectedSuggestion,
          title:
            selectedSuggestion.type === "create"
              ? newFolderTitle.trim() || selectedSuggestion.title
              : selectedSuggestion.title
        }
      })

      setResult(mutation)
      setStatus(mutation.message)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "写入书签失败，请稍后再试。"
      setStatus(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main style={panelStyle}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14
        }}>
        <section style={{ ...cardStyle, paddingBottom: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12
            }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#b26a00",
                  fontWeight: 800
                }}>
                Smart Favorites AI
              </div>
              <h1
                style={{
                  margin: "6px 0 8px",
                  fontSize: 22,
                  lineHeight: 1.1
                }}>
                AI 智能书签分类助手
              </h1>
              <p style={{ ...mutedStyle, margin: 0 }}>
                优先推荐，不自动替你改结构。你确认后，插件才会移动或创建书签。
              </p>
            </div>
            <button
              onClick={refreshCapture}
              style={{
                ...buttonStyle,
                background: "#172033",
                color: "#ffffff"
              }}
              type="button">
              重新抓取
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8
            }}>
            <strong>当前页面</strong>
            <span style={mutedStyle}>
              {settings?.provider.model
                ? `模型：${settings.provider.model}`
                : "未配置 AI 模型"}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
            {capture?.page.title || "未识别标题"}
          </div>
          <div
            style={{
              ...mutedStyle,
              wordBreak: "break-all",
              marginBottom: 10
            }}>
            {capture?.page.url || "当前标签页没有标准网页地址。"}
          </div>
          <textarea
            readOnly
            rows={6}
            style={{ ...fieldStyle, resize: "vertical", marginBottom: 10 }}
            value={pageSummary}
          />
          <div style={mutedStyle}>
            已选中内容会优先作为标签知识输入。若内容不足，先回到页面手动选中文本，再点“重新抓取”。
          </div>
        </section>

        <section style={cardStyle}>
          <strong style={{ display: "block", marginBottom: 10 }}>增强信息</strong>
          <label style={{ display: "block", marginBottom: 8 }}>
            <div style={{ ...mutedStyle, marginBottom: 6 }}>
              手动标签，使用英文逗号分隔
            </div>
            <input
              onChange={(event) => setManualTags(event.target.value)}
              placeholder="例如：AI, 插件开发, 浏览器"
              style={fieldStyle}
              value={manualTags}
            />
          </label>
          <label style={{ display: "block" }}>
            <div style={{ ...mutedStyle, marginBottom: 6 }}>补充备注</div>
            <textarea
              onChange={(event) => setNotes(event.target.value)}
              placeholder="这条书签为什么重要，后续会怎么用"
              rows={4}
              style={{ ...fieldStyle, resize: "vertical" }}
              value={notes}
            />
          </label>
        </section>

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12
            }}>
            <strong>分类推荐</strong>
            <button
              disabled={!canRecommend || isLoading}
              onClick={runRecommendation}
              style={{
                ...buttonStyle,
                background: canRecommend ? "#ffb84d" : "#e4e7eb",
                color: "#172033",
                opacity: isLoading ? 0.6 : 1
              }}
              type="button">
              开始推荐
            </button>
          </div>

          {recommendation ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recommendation.suggestions.map((item) => {
                const checked = item.key === selectedTarget

                return (
                  <label
                    key={item.key}
                    style={{
                      border: checked
                        ? "1px solid #ffb84d"
                        : "1px solid rgba(23, 32, 51, 0.08)",
                      background: checked ? "#fff6df" : "#ffffff",
                      borderRadius: 14,
                      padding: 12,
                      cursor: "pointer"
                    }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10
                      }}>
                      <input
                        checked={checked}
                        name="suggestion"
                        onChange={() => setSelectedTarget(item.key)}
                        type="radio"
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8
                          }}>
                          <strong>{item.title}</strong>
                          <span style={mutedStyle}>
                            {item.type === "create" ? "建议新建" : "现有文件夹"}
                          </span>
                        </div>
                        <div style={{ ...mutedStyle, marginTop: 6 }}>
                          {item.path}
                        </div>
                        <div style={{ fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
                          {item.reason}
                        </div>
                      </div>
                    </div>
                  </label>
                )
              })}

              {selectedSuggestion?.type === "create" ? (
                <label style={{ display: "block" }}>
                  <div style={{ ...mutedStyle, marginBottom: 6 }}>
                    新建文件夹名称
                  </div>
                  <input
                    onChange={(event) => setNewFolderTitle(event.target.value)}
                    style={fieldStyle}
                    value={newFolderTitle}
                  />
                </label>
              ) : null}

              <button
                disabled={isLoading || !selectedSuggestion}
                onClick={applyRecommendation}
                style={{
                  ...buttonStyle,
                  marginTop: 4,
                  background: "#172033",
                  color: "#ffffff",
                  opacity: isLoading ? 0.6 : 1
                }}
                type="button">
                确认并写入书签
              </button>
            </div>
          ) : (
            <div style={mutedStyle}>
              点击“开始推荐”后，系统会结合当前页面、你的备注和现有书签结构生成候选文件夹。
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <strong style={{ display: "block", marginBottom: 8 }}>运行状态</strong>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{status}</div>
          {result ? (
            <div style={{ ...mutedStyle, marginTop: 8 }}>
              已处理书签：{result.bookmark.title} → {result.folderPath}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

export default IndexPopup
