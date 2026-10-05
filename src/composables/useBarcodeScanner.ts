import { ref, onBeforeUnmount } from 'vue'

type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'error'

interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
interface DetectorConstructor {
  new (options: { formats: string[] }): Detector
  getSupportedFormats(): Promise<string[]>
}

// Product boxes (UPC/EAN), Square-printed SKU labels (Code 128), and the
// other linear symbologies distributors put on cases.
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'] as const

// The browser's own BarcodeDetector when it reads these formats (Chrome on
// Android); otherwise the zxing-wasm ponyfill (iPhone Safari has no native
// one). The ponyfill and its ~1 MB .wasm load only when a scanner first opens,
// and the .wasm is served from this site rather than the package's default
// third-party CDN, so the CSP stays 'self'-only.
let detectorPromise: Promise<Detector> | null = null
const getDetector = () =>
  (detectorPromise ??= (async () => {
    const Native = (globalThis as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector
    if (Native) {
      try {
        const supported: string[] = await Native.getSupportedFormats()
        const formats = FORMATS.filter(format => supported.includes(format))
        if (formats.includes('ean_13') && formats.includes('code_128')) {
          return new Native({ formats })
        }
      } catch {
        // fall through to the ponyfill
      }
    }
    const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
      import('barcode-detector/ponyfill'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ])
    prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith('.wasm') ? wasmUrl : prefix + path,
      },
    })
    return new BarcodeDetector({ formats: [...FORMATS] }) as unknown as Detector
  })().catch(error => {
    detectorPromise = null // let the next attempt retry instead of caching the failure
    throw error
  }))

const SCAN_INTERVAL_MS = 200
// A barcode held in view is reported on every frame. The same code only fires
// again after it has been out of view this long — so holding a box counts it
// once, while taking it away and scanning a second copy counts two.
const REARM_MS = 900

export function useBarcodeScanner(onDetect: (code: string) => void) {
  const status = ref<ScannerStatus>('idle')
  const error = ref<string | null>(null)
  // While paused the camera stays live but nothing is reported (e.g. while a
  // result is on screen), so resuming is instant.
  const paused = ref(false)

  let stream: MediaStream | null = null
  let video: HTMLVideoElement | null = null
  let timer: number | null = null
  let lastCode = ''
  let lastSeenAt = 0

  const stop = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    if (video) video.srcObject = null
    status.value = 'idle'
  }

  const loop = (detector: Detector) => {
    timer = window.setTimeout(async () => {
      if (status.value !== 'scanning' || !video) return
      if (!paused.value && video.readyState >= 2) {
        try {
          const code = (await detector.detect(video))[0]?.rawValue?.trim()
          if (code) {
            const now = Date.now()
            const sameAsHeld = code === lastCode && now - lastSeenAt < REARM_MS
            lastCode = code
            lastSeenAt = now
            if (!sameAsHeld) {
              // Browsers refuse vibration before the user has touched the page.
              if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(60)
              onDetect(code)
            }
          }
        } catch {
          // a dropped frame — keep going
        }
      }
      if (status.value === 'scanning') loop(detector)
    }, SCAN_INTERVAL_MS)
  }

  const start = async (element: HTMLVideoElement) => {
    stop()
    video = element
    error.value = null
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      status.value = 'error'
      error.value = 'The camera needs a secure (https) page. Type the barcode below instead.'
      return
    }
    status.value = 'starting'
    try {
      const [detector, media] = await Promise.all([
        getDetector(),
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        }),
      ])
      if (status.value !== 'starting') {
        // stopped (or unmounted) while the camera was opening
        media.getTracks().forEach(track => track.stop())
        return
      }
      stream = media
      element.srcObject = media
      await element.play()
      status.value = 'scanning'
      loop(detector)
    } catch (cause) {
      stop()
      status.value = 'error'
      const name = cause instanceof DOMException ? cause.name : ''
      error.value =
        name === 'NotAllowedError'
          ? 'Camera access was blocked — allow it in your browser settings, or type the barcode below.'
          : name === 'NotFoundError'
            ? 'No camera found — type the barcode below.'
            : 'The camera could not start — type the barcode below.'
    }
  }

  onBeforeUnmount(stop)
  return { status, error, paused, start, stop }
}
