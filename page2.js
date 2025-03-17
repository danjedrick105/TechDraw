const videos = document.querySelectorAll("video");

// Track which videos have been manually played
const playedVideos = new Set();

videos.forEach(video => {
    // Listen for user-initiated play events
    video.addEventListener("play", () => {
        playedVideos.add(video);
    });

    // Observe visibility changes
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                video.pause(); // Pause when out of view
            }
            // Do NOT auto-play when it comes back into view
        });
    }, { threshold: 0 });

    observer.observe(video);
});