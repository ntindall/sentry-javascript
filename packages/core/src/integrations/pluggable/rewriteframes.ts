import { getCurrentHub, Scope } from '@sentry/hub';
import { Integration, SentryEvent, StackFrame } from '@sentry/types';
import { basename, relative } from 'path';

type StackFrameIteratee = (frame: StackFrame) => Promise<StackFrame>;

/** Rewrite event frames paths */
export class RewriteFrames implements Integration {
  /**
   * @inheritDoc
   */
  public name: string = 'RewriteFrames';

  /**
   * @inheritDoc
   */
  private readonly root?: string;

  /**
   * @inheritDoc
   */
  private readonly iteratee: StackFrameIteratee = async (frame: StackFrame) => {
    if (frame.filename && frame.filename.startsWith('/')) {
      const base = this.root ? relative(this.root, frame.filename) : basename(frame.filename);
      frame.filename = `app:///${base}`;
    }
    return frame;
  };

  /**
   * @inheritDoc
   */
  public constructor(options: { root?: string; iteratee?: StackFrameIteratee } = {}) {
    if (options.root) {
      this.root = options.root;
    }
    if (options.iteratee) {
      this.iteratee = options.iteratee;
    }
  }

  /**
   * @inheritDoc
   */
  public install(): void {
    getCurrentHub().configureScope((scope: Scope) => {
      scope.addEventProcessor(async event => this.process(event));
    });
  }

  /** JSDoc */
  public async process(event: SentryEvent): Promise<SentryEvent> {
    const frames = this.getFramesFromEvent(event);
    if (frames) {
      for (const i in frames) {
        // tslint:disable-next-line
        frames[i] = await this.iteratee(frames[i]);
      }
    }
    return event;
  }

  /** JSDoc */
  private getFramesFromEvent(event: SentryEvent): StackFrame[] | undefined {
    const exception = event.exception;

    if (exception) {
      try {
        // tslint:disable-next-line:no-unsafe-any
        return (exception as any).values[0].stacktrace.frames;
      } catch (_oO) {
        return undefined;
      }
    } else if (event.stacktrace) {
      return event.stacktrace.frames;
    } else {
      return undefined;
    }
  }
}
