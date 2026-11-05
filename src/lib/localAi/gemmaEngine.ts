/**
 * Loads Gemma 4 E2B through WebLLM inside a Web Worker. The runtime is imported
 * dynamically so none of it lands in the initial app bundle.
 */
import type { MLCEngineInterface } from '@mlc-ai/web-llm'
import { RECEIPT_SYSTEM_PROMPT, RECEIPT_USER_PROMPT } from './receiptPrompt'

export interface LoadProgress {
  progress: number // 0..1
  text: string
}

export interface AnalyzeResult {
  raw: string
  ms: number
  promptTokens: number | null
  completionTokens: number | null
}

let engine: MLCEngineInterface | null = null
let worker: Worker | null = null
let loadedModelId: string | null = null

export const isModelLoaded = () => engine !== null

export async function isModelCached(modelId: string): Promise<boolean> {
  const { hasModelInCache } = await import('@mlc-ai/web-llm')
  return hasModelInCache(modelId)
}

export async function loadModel(
  modelId: string,
  onProgress: (p: LoadProgress) => void,
): Promise<{ ms: number }> {
  if (engine && loadedModelId === modelId) return { ms: 0 }
  await unloadModel()

  const started = performance.now()
  const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm')
  worker = new Worker(new URL('./gemmaEngine.worker.ts', import.meta.url), { type: 'module' })
  try {
    engine = await CreateWebWorkerMLCEngine(worker, modelId, {
      initProgressCallback: (r) => onProgress({ progress: r.progress, text: r.text }),
    })
  } catch (err) {
    worker.terminate()
    worker = null
    engine = null
    throw err
  }
  loadedModelId = modelId
  return { ms: Math.round(performance.now() - started) }
}

export async function analyzeReceipt(imageDataUrl: string): Promise<AnalyzeResult> {
  if (!engine) throw new Error('Model belum dimuat.')
  const started = performance.now()
  const reply = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: RECEIPT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: RECEIPT_USER_PROMPT },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 400,
  })
  // reset so one receipt never leaks into the next one's context
  await engine.resetChat()
  return {
    raw: reply.choices[0]?.message?.content ?? '',
    ms: Math.round(performance.now() - started),
    promptTokens: reply.usage?.prompt_tokens ?? null,
    completionTokens: reply.usage?.completion_tokens ?? null,
  }
}

export async function unloadModel(): Promise<void> {
  try {
    await engine?.unload()
  } catch {
    // ignore: we are discarding the worker anyway
  }
  worker?.terminate()
  engine = null
  worker = null
  loadedModelId = null
}

/** Deletes downloaded weights + wasm so the next test starts from a cold cache. */
export async function clearModelCache(modelId: string): Promise<void> {
  await unloadModel()
  const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm')
  await deleteModelAllInfoInCache(modelId)
}
