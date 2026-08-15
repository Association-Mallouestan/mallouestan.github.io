import { register } from "./serviceWorkerRegistration.js";
import { bootstrap } from "./standalone.js"

// Register the service worker managing the cache
register();

// Check if the site is running in standalone mode (PWA) 
if (window.matchMedia("(display-mode: standalone)").matches) {
    bootstrap();
}



document.addEventListener("DOMContentLoaded", async () => {

    // TABS v ================== v

    const { matches: motionOK } = window.matchMedia(
        '(prefers-reduced-motion: no-preference)'
    )

    // grab and stash elements
    const tabgroups = [...document.querySelectorAll('.c-tab-section')];

    tabgroups.forEach(tabgroup => {
        const tabsection = tabgroup.querySelector(':scope > section')
        const tabnav = tabgroup.querySelector(':scope nav')
        const tabheader = tabgroup.querySelector(':scope header')
        const tabnavitems = tabnav.querySelectorAll(':scope a')
        const tabindicator = tabgroup.querySelector(':scope .c-tab-section--indicator')

        /* 
          shared timeline for .indicator 
          and nav > a colors */
        const sectionScrollTimeline = new ScrollTimeline({
            scrollSource: tabsection,
            orientation: 'inline',
            fill: 'both',
        })

        /*
          for each nav link
          - animate color based on the scroll timeline
          - color is active when its the current index*/
        tabnavitems.forEach(navitem => {
            navitem.animate({
                color: [...tabnavitems].map(item =>
                    item === navitem
                        ? `var(--text-active-color)`
                        : `var(--text-color)`)
            }, {
                duration: 1000,
                fill: 'both',
                timeline: sectionScrollTimeline,
            }
            )
        })

        if (motionOK) {
            tabindicator.animate({
                transform: [...tabnavitems].map(({ offsetLeft }) =>
                    `translateX(${offsetLeft}px)`),
                width: [...tabnavitems].map(({ offsetWidth }) =>
                    `${offsetWidth}px`)
            }, {
                duration: 1000,
                fill: 'both',
                timeline: sectionScrollTimeline,
            }
            )
        }

        const setActiveTab = tabbtn => {
            tabnav
                .querySelector(':scope a[active]')?.removeAttribute('active')

            tabbtn.setAttribute('active', '')
            window.scrollTo({
                top: tabbtn.getBoundingClientRect().top + window.pageYOffset - 90,
                behavior: "smooth"
            });
        }

        const determineActiveTabSection = () => {
            const i = tabsection.scrollLeft / tabsection.clientWidth
            const matchingNavItem = tabnavitems[i]

            matchingNavItem && setActiveTab(matchingNavItem)
        }

        tabnav.addEventListener('click', e => {
            if (e.target.nodeName !== "A") return

            history.replaceState(null, "", e.target.href);

            const ttab = document
                .querySelector(location.hash)
                .offsetLeft;
            
            tabsection.scrollLeft = ttab;
            tabheader.scrollLeft = ttab;

            setActiveTab(e.target)
            return e.preventDefault();
        })

        tabsection.addEventListener('scroll', () => {
            clearTimeout(tabsection.scrollEndTimer)
            tabsection.scrollEndTimer = setTimeout(
                determineActiveTabSection
                , 100)
        })

        if (location.hash) {
            const pottab = tabsection.querySelector(":scope " + location.hash)
            if(pottab){
                tabsection.scrollLeft = pottab.offsetLeft
                tabsection.scrollLeft = pottab.offsetLeft             
                determineActiveTabSection();
            }
        }

    })

    // END TABS ^ ================== ^


    let playlistToggle = document.getElementById("playlist__toggle");
    if (playlistToggle) {
        playlistToggle.addEventListener("click", () => {
            document.querySelector(".playlist").classList.toggle("out");
        });
    }

    // Manage visited folders and local cache storage 
    var visitedFolders = JSON.parse(localStorage.getItem("visited-folders")) || {};
    window.vf = visitedFolders;

    if (/mallouestan.org\/[ft]/.test(window.location.href)) {
        let fav = visitedFolders.hasOwnProperty(window.location.href);

        const tagheader = document.querySelector(".c-page-heading .tagheader > p");

        if (tagheader) {
            tagheader.style.background = fav ? "linear-gradient(90deg, #6D719F 0%, #010053 100%)" : "linear-gradient(90deg, #6D9F71 0%, #015300 100%)";

            tagheader.addEventListener("click", () => {
                fav = !fav;

                if (fav) {
                    visitedFolders[window.location.href] = document.title;
                    localStorage.setItem("visited-folders", JSON.stringify(visitedFolders));
                } else {
                    delete visitedFolders[window.location.href];
                    localStorage.setItem("visited-folders", JSON.stringify(visitedFolders));
                }
                tagheader.style.background = fav ? "linear-gradient(90deg, #6D719F 0%, #010053 100%)" : "linear-gradient(90deg, #6D9F71 0%, #015300 100%)";
            });
        }

        if (Object.keys(visitedFolders).length > 0) {
            var ressourceMenu = [...document.querySelectorAll(".c-header__inner .nav__item.dropdown > span")]
                .filter(n => /Ressources/.test(n.innerText))[0]
                .parentElement
                .querySelector(".dropdown-menu");

            const hr = document.createElement("hr");
            hr.style.margin = "8px 8px 8px 8px"
            ressourceMenu.appendChild(hr);

            for (let f in visitedFolders) {
                const link = document.createElement("a");
                link.classList.add("nav__link");
                link.href = f;
                link.textContent = visitedFolders[f];
                ressourceMenu.appendChild(link);
            }
        }
    }
});


