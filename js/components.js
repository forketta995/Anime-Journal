const NavbarComponent = {
    template: `
    <nav class="navbar">
        <a href="index.html">TO-DO</a>
        <a href="anime.html">Lista Completa</a>
        <div v-for="annoObj in seasons" :key="Object.keys(annoObj)[0]" class="dropdown">
            <button class="dropbtn">{{ Object.keys(annoObj)[0] }} ▼</button>
            <div class="dropdown-content">
                <a v-for="s in annoObj[Object.keys(annoObj)[0]]" 
                   :href="'season.html?year=' + Object.keys(annoObj)[0] + '&season=' + s">
                   {{ s }}
                </a>
            </div>
        </div>
    </nav>
    `,
    data() {
        return { seasons: [] }
    },
    async mounted() {
        const res = await fetch('data/seasons.json');
        const data = await res.json();
        this.seasons = data.lista;
    }
};