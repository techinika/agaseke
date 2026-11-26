import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MediaPlaybackProvider } from "@/components/media/MediaPlaybackContext";
import { CustomVideoPlayer } from "@/components/media/CustomVideoPlayer";

function mockMobileViewport(isMobile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("max-width: 767px") ? isMobile : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function setVideoDimensions(video: HTMLVideoElement, width: number, height: number, duration = 120) {
  Object.defineProperty(video, "videoWidth", { value: width, configurable: true });
  Object.defineProperty(video, "videoHeight", { value: height, configurable: true });
  Object.defineProperty(video, "duration", { value: duration, configurable: true });
}

describe("Global media playback state & CustomVideoPlayer", () => {
  beforeEach(() => {
    mockMobileViewport(false);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      Object.defineProperty(this, "paused", { value: false, configurable: true });
      Object.defineProperty(this, "ended", { value: false, configurable: true });
      this.dispatchEvent(new Event("play"));
      this.dispatchEvent(new Event("playing"));
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
      Object.defineProperty(this, "paused", { value: true, configurable: true });
      this.dispatchEvent(new Event("pause"));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pauses the currently playing video ref globally whenever a new feed video starts playing", async () => {
    const { container } = render(
      <MediaPlaybackProvider>
        <CustomVideoPlayer src="https://cdn.example.com/one.mp4" title="Video One" />
        <CustomVideoPlayer src="https://cdn.example.com/two.mp4" title="Video Two" />
      </MediaPlaybackProvider>,
    );

    const regions = container.querySelectorAll('[role="region"]');
    const videos = container.querySelectorAll("video");
    expect(videos).toHaveLength(2);

    const [videoOne] = Array.from(videos);
    const pauseOneSpy = vi.spyOn(videoOne, "pause");

    await act(async () => {
      fireEvent.click(within(regions[0] as HTMLElement).getAllByRole("button", { name: "Play video" })[0]);
    });

    expect(regions[0].getAttribute("data-player-active")).toBe("true");
    expect(regions[1].getAttribute("data-player-active")).toBe("false");

    await act(async () => {
      fireEvent.click(within(regions[1] as HTMLElement).getAllByRole("button", { name: "Play video" })[0]);
    });

    await waitFor(() => {
      expect(pauseOneSpy).toHaveBeenCalled();
      expect(regions[1].getAttribute("data-player-active")).toBe("true");
      expect(regions[0].getAttribute("data-player-active")).toBe("false");
    });
  });

  it("plays vertical reel-sized videos in Reel mode on mobile and transitions to fullscreen reel without remounting", () => {
    mockMobileViewport(true);

    const { container } = render(
      <MediaPlaybackProvider>
        <CustomVideoPlayer
          src="https://cdn.example.com/reel.mp4"
          title="Kigali Sunset Reel"
          creatorName="Aline Uwase"
          creatorHandle="aline"
        />
      </MediaPlaybackProvider>,
    );

    const region = container.querySelector('[role="region"]') as HTMLElement;
    const video = container.querySelector("video") as HTMLVideoElement;
    setVideoDimensions(video, 1080, 1920, 45);
    fireEvent.loadedMetadata(video);

    expect(region.getAttribute("data-player-mode")).toBe("reel");
    expect(screen.getByText("Reel")).toBeInTheDocument();
    expect(screen.getByText("Aline Uwase")).toBeInTheDocument();

    const expandBtn = screen.getByRole("button", { name: "Open fullscreen reel" });
    fireEvent.click(expandBtn);

    expect(region.getAttribute("data-player-mode")).toBe("reel-fullscreen");
    // Same <video> node remains mounted seamlessly
    expect(container.querySelector("video")).toBe(video);

    const closeBtn = screen.getByRole("button", { name: "Close fullscreen reel" });
    fireEvent.click(closeBtn);
    expect(region.getAttribute("data-player-mode")).toBe("reel");
  });

  it("plays vertical reel-sized videos as a normal standard video player on big screens", () => {
    mockMobileViewport(false);

    const { container } = render(
      <MediaPlaybackProvider>
        <CustomVideoPlayer
          src="https://cdn.example.com/reel.mp4"
          title="Studio Session"
        />
      </MediaPlaybackProvider>,
    );

    const region = container.querySelector('[role="region"]') as HTMLElement;
    const video = container.querySelector("video") as HTMLVideoElement;
    setVideoDimensions(video, 1080, 1920, 90);
    fireEvent.loadedMetadata(video);

    expect(region.getAttribute("data-player-mode")).toBe("standard");
    expect(screen.getByRole("button", { name: "Rewind 10 seconds" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Forward 10 seconds" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Playback speed" })).toBeInTheDocument();
  });

  it("supports playback speed changes, global mute sync, seeking, and error retry", () => {
    const { container } = render(
      <MediaPlaybackProvider>
        <CustomVideoPlayer src="https://cdn.example.com/video.mp4" title="Tutorial" />
      </MediaPlaybackProvider>,
    );

    const video = container.querySelector("video") as HTMLVideoElement;
    setVideoDimensions(video, 1920, 1080, 120);
    fireEvent.loadedMetadata(video);

    // Speed popover selection
    fireEvent.click(screen.getByRole("button", { name: "Playback speed" }));
    fireEvent.click(screen.getByRole("button", { name: "1.5x" }));
    expect(video.playbackRate).toBe(1.5);

    // Mute toggle
    fireEvent.click(screen.getByRole("button", { name: "Mute video" }));
    expect(video.muted).toBe(true);
    expect(screen.getByRole("button", { name: "Unmute video" })).toBeInTheDocument();

    // Seek forward 10s
    fireEvent.click(screen.getByRole("button", { name: "Forward 10 seconds" }));
    expect(video.currentTime).toBe(10);

    // Error state & retry
    const loadSpy = vi.spyOn(video, "load").mockImplementation(() => {});
    fireEvent.error(video);
    expect(screen.getByText("Unable to play this video")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry playback" }));
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });
});
