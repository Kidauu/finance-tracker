/**
 * Shrinks a camera photo before it reaches the model. Raw 12MP files would blow
 * the image-token budget and iOS memory limits. Image stays in memory only.
 */

export const MAX_RECEIPT_EDGE = 1024

export async function prepareReceiptImage(
  file: Blob,
  maxEdge = MAX_RECEIPT_EDGE,
): Promise<{ dataUrl: string; width: number; height: number; bytes: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D tidak tersedia.')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    canvas.width = 0
    canvas.height = 0
    return { dataUrl, width, height, bytes: Math.round((dataUrl.length * 3) / 4) }
  } finally {
    bitmap.close()
  }
}
