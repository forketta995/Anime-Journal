const { createApp } = Vue;

const app = createApp({
    components: {
        'navbar-component': NavbarComponent
    },
    data() {
        return {
            animeRaw: {},
            searchQuery: '',
            sortBy: 'media',
            selectedYearFilter: 'all', 
            availableYears: [],        
            year: '',
            season: ''
        }
    },
    computed: {
        filteredGlobalAnime() {
            let entries = Object.entries(this.animeRaw).map(([id, info]) => {
                let totalSum = 0;
                let totalCount = 0;
                
                let userSums = { Forketta: 0, pigna: 0 };
                let userCounts = { Forketta: 0, pigna: 0 };
                let userScores = { Forketta: 0, pigna: 0 };

                if (info.voti) {
                    Object.entries(info.voti).forEach(([user, listaVoti]) => {
                        listaVoti.forEach(v => {
                            if (typeof v === 'number') {
                                totalSum += v;
                                totalCount++;
                                
                                if (userSums[user] === undefined) {
                                    userSums[user] = 0;
                                    userCounts[user] = 0;
                                }
                                userSums[user] += v;
                                userCounts[user]++;
                            }
                        });
                    });
                }

                Object.keys(userSums).forEach(user => {
                    userScores[user] = userCounts[user] > 0 ? parseFloat((userSums[user] / userCounts[user]).toFixed(1)) : 0;
                });

                const votiTesto = Object.entries(userScores)
                    .filter(([u, v]) => v > 0)
                    .map(([u, v]) => `${u}: ${v}`)
                    .join(' | ');

                return {
                    id,
                    info,
                    globalMedia: totalCount > 0 ? parseFloat((totalSum / totalCount).toFixed(1)) : 0,
                    userScores,
                    votiTesto
                };
            });

            if (this.selectedYearFilter !== 'all') {
                const yrStr = this.selectedYearFilter; 
                const yrShort = yrStr.slice(-2);      
                
                const nextYrShort = (parseInt(yrStr) + 1).toString().slice(-2); 

                const validTargets = [
                    `SPRING${yrShort}`, 
                    `SUMMER${yrShort}`, 
                    `FALL${yrShort}`, 
                    `WINTER${nextYrShort}`
                ];

                entries = entries.filter(item => {
                    if (!item.info.season) return false;
                    const parts = item.info.season.split('/');
                    return parts.some(p => validTargets.includes(p));
                });
            }

            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                entries = entries.filter(item => item.info.title.toLowerCase().includes(q));
            }

            return entries.sort((a, b) => {
                if (this.sortBy === 'media') return b.globalMedia - a.globalMedia;
                
                const scoreB = b.userScores[this.sortBy] || 0;
                const scoreA = a.userScores[this.sortBy] || 0;
                return scoreB - scoreA;
            });
        },
        
        titleSeason() { 
            return this.season ? `${AnimeUtils.translateSeason(this.season)} ${this.year}` : 'Caricamento...'; 
        },
        sortedSeasonAnime() {
            if (!this.season || !this.year) return [];
            const target = this.season + this.year.slice(-2);
            let list = Object.entries(this.animeRaw)
                .filter(([id, info]) => info.season && info.season.includes(target))
                .map(([id, info]) => AnimeUtils.processAnimeForSeason(id, info, target));

            return list.sort((a, b) => {
                if (this.sortBy === 'media') return b.media - a.media;
                return b.scores[this.sortBy] - a.scores[this.sortBy];
            });
        }
    },
    methods: {
        formatSeasonNames(seasonStr) {
            if (!seasonStr) return 'N/A';
            return seasonStr.split('/').map(s => {
                const name = s.replace(/[0-9]/g, '');
                const yr = s.replace(/[^0-9]/g, '');
                return `${AnimeUtils.translateSeason(name)} ${yr}`;
            }).join(', ');
        }
    },
    async mounted() {
        const params = new URLSearchParams(window.location.search);
        this.year = params.get('year') || '';
        this.season = params.get('season') || '';
        
        try {
            const resAnime = await fetch('data/anime.json');
            this.animeRaw = await resAnime.json();
            const resSeasons = await fetch('data/seasons.json');
            const dataSeasons = await resSeasons.json();
            this.availableYears = dataSeasons.lista.map(obj => Object.keys(obj)[0]);

        } catch (e) {
            console.error("Errore nel caricamento dei dati:", e);
        }
    }
});

app.mount('#app');