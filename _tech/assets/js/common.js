
var body = document.querySelector("body"),
  menuOpenIcon = document.querySelector(".nav__icon-menu"),
  menuCloseIcon = document.querySelector(".nav__icon-close"),
  menuList = document.querySelector(".main-nav");

menuOpenIcon.addEventListener("click", () => {
  menuOpen();
});

menuCloseIcon.addEventListener("click", () => {
  menuClose();
});

function menuOpen() {
  menuList.classList.add("is-open");
}

function menuClose() {
  menuList.classList.remove("is-open");
}

/* =======================
// Animation Load Page
======================= */
setTimeout(function () {
  body.classList.add("is-in");
}, 150)

/* ==================================
// Stop Animations After All Have Run
================================== */
setTimeout(function () {
  body.classList.add("stop-animations");
}, 1500)

/* ======================================
// Stop Animations During Window Resizing
====================================== */
let resizeTimer;
window.addEventListener("resize", () => {
  document.body.classList.add("resize-animation-stopper");
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    document.body.classList.remove("resize-animation-stopper");
  }, 300);
});




if (document.querySelector(".my-slider")) {
  var slider = tns({
    container: ".my-slider",
    items: 3,
    slideBy: 1,
    gutter: 20,
    nav: false,
    mouseDrag: true,
    autoplay: false,
    controlsContainer: "#customize-controls",
    responsive: {
      1024: {
        items: 3,
      },
      768: {
        items: 2,
      },
      0: {
        items: 1,
      }
    }
  });
}