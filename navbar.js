async function loadNavbar() {
    try {
        const response = await fetch('data/seasons.json');
        const data = await response.json();
        
        // Parte fissa iniziale
        let menuHTML = `
            <nav class="navbar">
                <a href="index.html">TO-DO</a>
                <a href="anime.html">Lista Anime</a>
        `;

        data.lista.forEach(annoObj => {
            const anno = Object.keys(annoObj)[0];
            const stagioni = annoObj[anno];

            menuHTML += `
                <div class="dropdown">
                    <button class="dropbtn">${anno} ▼</button>
                    <div class="dropdown-content">
                        ${stagioni.map(s => `
                            <a href="season.html?year=${anno}&season=${s}">
                                ${s}
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        menuHTML += `</nav>`;
        document.body.insertAdjacentHTML('afterbegin', menuHTML);

    } catch (e) {
        console.error("Errore caricamento navbar:", e);
    }
}

loadNavbar();