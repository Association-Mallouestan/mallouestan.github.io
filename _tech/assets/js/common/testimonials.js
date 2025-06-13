import {tns} from "tiny-slider";

export default function () {

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
}
