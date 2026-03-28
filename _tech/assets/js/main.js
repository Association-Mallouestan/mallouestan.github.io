import { register } from "./serviceWorkerRegistration.js";
import { bootstrap } from "./standalone.js"

// Register the service worker managing the cache
register();

// Check if the site is running in standalone mode (PWA) 
if (window.matchMedia("(display-mode: standalone)").matches) {
    bootstrap();
} 


document.addEventListener("DOMContentLoaded", async () => {
  var visitedFolders = JSON.parse(localStorage.getItem("visited-folders")) || {};
  window.vf = visitedFolders;

    if(/mallouestan.org\/[ft]/.test(window.location.href)){
        let fav = visitedFolders.hasOwnProperty(window.location.href);
        
        const tagheader = document.querySelector(".c-page-heading .tagheader > p");

        if(tagheader){
            tagheader.style.background = fav ? "linear-gradient(90deg, #6D719F 0%, #010053 100%)" : "linear-gradient(90deg, #6D9F71 0%, #015300 100%)";
            
            tagheader.addEventListener("click", () => {
                fav = !fav;
    
                if(fav){
                    visitedFolders[window.location.href] = document.title;
                    localStorage.setItem("visited-folders", JSON.stringify(visitedFolders));
                } else {
                    delete visitedFolders[window.location.href];
                    localStorage.setItem("visited-folders", JSON.stringify(visitedFolders));
                }
                tagheader.style.background = fav ? "linear-gradient(90deg, #6D719F 0%, #010053 100%)" : "linear-gradient(90deg, #6D9F71 0%, #015300 100%)";
            });
        }
    
        if(Object.keys(visitedFolders).length > 0){
            var ressourceMenu = [...document.querySelectorAll(".c-header__inner .nav__item.dropdown > span")]
            .filter(n => /Ressources/.test(n.innerText))[0]
            .parentElement
            .querySelector(".dropdown-menu");
    
            const hr = document.createElement("hr");
            hr.style.margin = "8px 8px 8px 8px"
            ressourceMenu.appendChild(hr);
        
            for(let f in visitedFolders){
                const link = document.createElement("a");
                link.classList.add("nav__link");
                link.href = f;
                link.textContent = visitedFolders[f];
                ressourceMenu.appendChild(link);
            }
        }
    }
});


