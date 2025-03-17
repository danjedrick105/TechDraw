let lastScrollTop = 0;
const video = document.querySelector("video");

window.addEventListener("scroll", () => {
    let scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (scrollTop > lastScrollTop) {
        // Scrolling down, pause the video
        video.pause();
    } 

    lastScrollTop = scrollTop;
});