import { afterEach, describe, expect, it, vi } from "vitest";
import { attachHeroVideo } from "../src/lib/hero-video";

class MediaQuery extends EventTarget {
  constructor(public matches = false) { super(); }
  change(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(new Event("change"));
  }
}

function harness(policy: { reduced?: boolean; mobile?: boolean; saver?: boolean } = {}) {
  const motion = new MediaQuery(policy.reduced);
  const narrow = new MediaQuery(policy.mobile);
  const connection = Object.assign(new EventTarget(), { saveData: policy.saver ?? false });
  const document = Object.assign(new EventTarget(), { hidden: false });
  const sources = [{ dataset: { src: "/loop.webm" }, src: "" }, { dataset: { src: "/loop.mp4" }, src: "" }];
  const video = Object.assign(new EventTarget(), {
    paused: true,
    dataset: {} as Record<string, string>,
    getBoundingClientRect: () => ({ top: 0, bottom: 800 }),
    querySelectorAll: () => sources,
    load: vi.fn(),
    play: vi.fn(async () => {
      video.paused = false;
      video.dispatchEvent(new Event("play"));
    }),
    pause: vi.fn(() => {
      video.paused = true;
      video.dispatchEvent(new Event("pause"));
    }),
  });
  let intersect!: (entries: { target: unknown; isIntersecting: boolean }[]) => void;
  const disconnect = vi.fn();
  vi.stubGlobal("window", {
    innerHeight: 900,
    matchMedia: (query: string) => query.includes("reduced-motion") ? motion : narrow,
  });
  vi.stubGlobal("document", document);
  vi.stubGlobal("navigator", { connection });
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {}
    disconnect = disconnect;
  });
  return {
    video, sources, motion, narrow, connection, document, disconnect,
    attach: () => attachHeroVideo(
      video as unknown as HTMLVideoElement,
    ),
    visibility(hidden: boolean) {
      document.hidden = hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    viewport(inView: boolean) { intersect([{ target: video, isIntersecting: inView }]); },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("hero animation playback policy", () => {
  it.each([{ reduced: true }, { mobile: true }, { saver: true }])(
    "does not download animation under device policy %j",
    (policy) => {
      const h = harness(policy);
      h.attach();
      expect(h.sources.map((source) => source.src)).toEqual(["", ""]);
      expect(h.video.load).not.toHaveBeenCalled();
      expect(h.video.play).not.toHaveBeenCalled();
    },
  );

  it("starts eligible playback and loads sources only once when re-entering view", async () => {
    const h = harness();
    h.attach();
    await Promise.resolve();
    expect(h.sources.map((source) => source.src)).toEqual(["/loop.webm", "/loop.mp4"]);
    expect(h.video.paused).toBe(false);
    h.viewport(false);
    expect(h.video.paused).toBe(true);
    h.viewport(true);
    await Promise.resolve();
    expect(h.video.paused).toBe(false);
    expect(h.video.load).toHaveBeenCalledTimes(1);
  });

  it("pauses offscreen or in a hidden document and resumes only when both are visible", async () => {
    const h = harness();
    h.attach();
    await Promise.resolve();
    h.viewport(false);
    expect(h.video.paused).toBe(true);
    h.visibility(true);
    h.viewport(true);
    expect(h.video.play).toHaveBeenCalledTimes(1);
    h.visibility(false);
    await Promise.resolve();
    expect(h.video.paused).toBe(false);
    expect(h.video.play).toHaveBeenCalledTimes(2);
  });

  it("handles rejected autoplay and can retry when the video re-enters view", async () => {
    const h = harness();
    h.video.play.mockRejectedValueOnce(new Error("Autoplay blocked"));
    h.attach();
    await Promise.resolve();
    await Promise.resolve();
    expect(h.video.paused).toBe(true);
    h.viewport(false);
    h.viewport(true);
    await Promise.resolve();
    expect(h.video.paused).toBe(false);
  });

  it("stops a pending play request after policy changes and removes listeners on cleanup", async () => {
    const h = harness();
    let finish!: () => void;
    h.video.play.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finish = () => { h.video.paused = false; resolve(); };
    }));
    const cleanup = h.attach();
    h.motion.change(true);
    finish();
    await Promise.resolve();
    expect(h.video.paused).toBe(true);
    cleanup();
    h.motion.change(false);
    h.visibility(false);
    expect(h.disconnect).toHaveBeenCalledTimes(1);
    expect(h.video.play).toHaveBeenCalledTimes(1);
  });
});
