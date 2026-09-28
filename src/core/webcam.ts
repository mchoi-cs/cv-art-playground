/**
 * Shared webcam plumbing.
 *
 * Demo 1 (head lighting) and Demo 2 (hand gestures) both need "give me a
 * <video> that is playing the user's camera, and tell me clearly when you
 * can't". That is all this module does - no CV, no rendering.
 */

export type WebcamErrorKind =
  'insecure-context' | 'unsupported' | 'denied' | 'not-found' | 'in-use' | 'unknown';

export class WebcamError extends Error {
  readonly kind: WebcamErrorKind;
  /** Short sentence safe to show directly in the UI. */
  readonly userMessage: string;

  constructor(kind: WebcamErrorKind, userMessage: string, cause?: unknown) {
    super(`${kind}: ${userMessage}`, { cause });
    this.name = 'WebcamError';
    this.kind = kind;
    this.userMessage = userMessage;
  }
}

export interface WebcamOptions {
  width?: number;
  height?: number;
  frameRate?: number;
  /** Reuse an existing element (e.g. the on-page preview) instead of creating one. */
  video?: HTMLVideoElement;
}

export interface Webcam {
  readonly video: HTMLVideoElement;
  readonly stream: MediaStream;
  stop(): void;
}

function classify(error: unknown): WebcamError {
  const name = error instanceof Error ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new WebcamError(
        'denied',
        'Camera access was blocked. Allow the camera for this site in your browser, then reload.',
        error,
      );
    case 'NotFoundError':
    case 'OverconstrainedError':
      return new WebcamError(
        'not-found',
        'No camera was found. Plug one in or pick a different device, then reload.',
        error,
      );
    case 'NotReadableError':
    case 'AbortError':
      return new WebcamError(
        'in-use',
        'The camera could not be started - another app may be using it. Close it and reload.',
        error,
      );
    default:
      return new WebcamError('unknown', 'The camera could not be started.', error);
  }
}

/** True on https:// and on localhost - the only places getUserMedia is allowed. */
export function isSecureCameraContext(): boolean {
  return window.isSecureContext;
}

/**
 * Requests the camera and resolves once the video element is actually playing
 * frames. Always rejects with a {@link WebcamError} so callers can render a
 * helpful message instead of a raw DOM exception.
 */
export async function startWebcam(options: WebcamOptions = {}): Promise<Webcam> {
  if (!isSecureCameraContext()) {
    throw new WebcamError(
      'insecure-context',
      'Browsers only allow camera access over https (or localhost). Open the https version of this page.',
    );
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new WebcamError(
      'unsupported',
      'This browser does not support camera capture. Try a recent Chrome, Edge, Firefox or Safari.',
    );
  }

  const { width = 640, height = 480, frameRate = 30 } = options;

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: frameRate },
        facingMode: 'user',
      },
    });
  } catch (error) {
    throw classify(error);
  }

  const video = options.video ?? document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;

  try {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new WebcamError('unknown', 'The camera stream could not be played.'));
      };
      const cleanup = () => {
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('error', onError);
      };
      if (video.readyState >= 2) {
        resolve();
        return;
      }
      video.addEventListener('loadeddata', onReady, { once: true });
      video.addEventListener('error', onError, { once: true });
    });
    await video.play();
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error instanceof WebcamError ? error : classify(error);
  }

  return {
    video,
    stream,
    stop() {
      stream.getTracks().forEach((track) => track.stop());
      if (video.srcObject === stream) video.srcObject = null;
    },
  };
}
