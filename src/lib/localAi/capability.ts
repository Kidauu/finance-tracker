/**
 * Capability checks for the on-device receipt AI. Everything here is cheap and
 * does NOT import the WebLLM runtime, so it is safe to call from any page.
 */

export const LOCAL_AI_ENABLED = import.meta.env.VITE_LOCAL_RECEIPT_AI_ENABLED === 'true'

export const MODEL_F16 = 'gemma-4-E2B-it-q4f16_1-MLC'
export const MODEL_F32 = 'gemma-4-E2B-it-q4f32_1-MLC'

export interface AiCapability {
  webgpu: boolean
  shaderF16: boolean
  /** model id that should be used on this device, or null if WebGPU is missing */
  modelId: string | null
  storageUsedMB: number | null
  storageQuotaMB: number | null
  maxBufferMB: number | null
  reason: string | null
}

const mb = (bytes: number) => Math.round(bytes / 1024 / 1024)

export async function checkCapability(): Promise<AiCapability> {
  const result: AiCapability = {
    webgpu: false,
    shaderF16: false,
    modelId: null,
    storageUsedMB: null,
    storageQuotaMB: null,
    maxBufferMB: null,
    reason: null,
  }

  try {
    const est = await navigator.storage?.estimate?.()
    if (est?.usage != null) result.storageUsedMB = mb(est.usage)
    if (est?.quota != null) result.storageQuotaMB = mb(est.quota)
  } catch {
    // storage estimate is best effort
  }

  const gpu = (navigator as Navigator & { gpu?: GpuLike }).gpu
  if (!gpu) {
    result.reason = 'WebGPU tidak tersedia di browser ini.'
    return result
  }

  try {
    const adapter = await gpu.requestAdapter()
    if (!adapter) {
      result.reason = 'WebGPU tersedia tapi tidak ada adapter GPU.'
      return result
    }
    result.webgpu = true
    result.shaderF16 = adapter.features.has('shader-f16')
    result.maxBufferMB = mb(adapter.limits.maxBufferSize)
    result.modelId = result.shaderF16 ? MODEL_F16 : MODEL_F32
  } catch (err) {
    result.reason = 'Gagal meminta adapter WebGPU: ' + (err instanceof Error ? err.message : String(err))
  }
  return result
}

// minimal structural types so we don't need @webgpu/types for a PoC
interface GpuLike {
  requestAdapter(): Promise<{
    features: { has(name: string): boolean }
    limits: { maxBufferSize: number }
  } | null>
}
