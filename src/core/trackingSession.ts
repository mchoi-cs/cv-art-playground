/**
 * Webcam + MediaPipe lifecycle, shared by every demo.
 *
 * A demo supplies a factory for the MediaPipe task it cares about (Face
 * Landmarker today, Gesture Recognizer for Demo 2) and then calls `poll()`
 * from its own render loop. All the awkward bits - secure-context checks,
 * permission failures, tearing down on page hide - live here.
 */

import { startWebcam, WebcamError, type Webcam } from './webcam';
import { config } from './config';

export interface VisionTask<TFrame> {
  detect(video: HTMLVideoElement, timestampMs: number): TFrame | null;
  close(): void;
}

export type TrackingStatus =
  | { state: 'idle' }
  | { state: 'starting'; message: string }
  | { state: 'running' }
  | { state: 'stopped' }
  | { state: 'error'; message: string; kind: string };

export interface TrackingSessionOptions<TFrame> {
  createTask: () => Promise<VisionTask<TFrame>>;
  /** Preview element to attach the stream to. One is created if omitted. */
  video?: HTMLVideoElement;
}

export class TrackingSession<TFrame> {
  private readonly options: TrackingSessionOptions<TFrame>;
  private readonly listeners = new Set<(status: TrackingStatus) => void>();
  private webcam: Webcam | null = null;
  private task: VisionTask<TFrame> | null = null;
  private starting = false;
  private _status: TrackingStatus = { state: 'idle' };

  constructor(options: TrackingSessionOptions<TFrame>) {
    this.options = options;
  }

  get status(): TrackingStatus {
    return this._status;
  }

  get isRunning(): boolean {
    return this._status.state === 'running';
  }

  get video(): HTMLVideoElement | null {
    return this.webcam?.video ?? null;
  }

  onStatusChange(listener: (status: TrackingStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this._status);
    return () => this.listeners.delete(listener);
  }

  async start(): Promise<void> {
    if (this.starting || this.isRunning) return;
    this.starting = true;
    try {
      this.setStatus({ state: 'starting', message: 'Waiting for camera permission...' });
      this.webcam = await startWebcam({
        ...config.webcam,
        video: this.options.video,
      });

      this.setStatus({ state: 'starting', message: 'Loading the face model...' });
      this.task = await this.options.createTask();

      this.setStatus({ state: 'running' });
    } catch (error) {
      this.teardown();
      const { message, kind } = describe(error);
      this.setStatus({ state: 'error', message, kind });
    } finally {
      this.starting = false;
    }
  }

  /** Returns the newest frame, or null when nothing is available yet. */
  poll(timestampMs: number): TFrame | null {
    if (!this.isRunning || !this.webcam || !this.task) return null;
    return this.task.detect(this.webcam.video, timestampMs);
  }

  stop(): void {
    if (this._status.state === 'idle') return;
    this.teardown();
    this.setStatus({ state: 'stopped' });
  }

  private teardown(): void {
    this.task?.close();
    this.task = null;
    this.webcam?.stop();
    this.webcam = null;
  }

  private setStatus(status: TrackingStatus): void {
    this._status = status;
    for (const listener of this.listeners) listener(status);
  }
}

function describe(error: unknown): { message: string; kind: string } {
  if (error instanceof WebcamError) {
    return { message: error.userMessage, kind: error.kind };
  }
  console.error('[trackingSession] failed to start', error);
  return {
    message:
      'The face tracking model could not be loaded. Check your network connection and reload.',
    kind: 'model',
  };
}
