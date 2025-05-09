export function bootstrap() {
    // Selector list to add standalone class to
    const selectorList =  [
        "body",
        ".main-nav"
    ]
    selectorList.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add("standalone");
        }
    });
}