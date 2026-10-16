// Phone photos are often 4000px and several MB. Square serves product images
// exactly as uploaded, so every product grid would download them at full size
// to draw a ~200px card. Scale anything bigger than MAX_SIDE down to a JPEG
// before upload. GIFs (may be animated) and files that don't get smaller are
// left as they are.
const MAX_SIDE = 1200
const QUALITY = 0.85

export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png)$/.test(file.type) || typeof createImageBitmap !== 'function') {
    return file
  }
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 500_000) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return file
    // JPEG has no transparency: put a transparent PNG on white, like the cards.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY)
    )
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    // Anything the browser can't decode goes up untouched; Square decides.
    return file
  }
}
