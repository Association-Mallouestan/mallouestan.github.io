export default function () {
    const btnScrollToTop = document.querySelector(".top");
    
    window.addEventListener("scroll", function () {
        window.scrollY > window.innerHeight ? btnScrollToTop.classList.add("is-active") : btnScrollToTop.classList.remove("is-active");
    });
    
    btnScrollToTop.addEventListener("click", function () {
        if (window.scrollY != 0) {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth"
            })
        }
    });
}