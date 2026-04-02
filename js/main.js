const { createApp } = Vue;

const app = createApp({
    components: {
        'navbar-component': NavbarComponent
    },
    data() {
        return {
            animeRaw: {},
            sortBy: 'media',
            year: '',
            season: '',
            
            searchQuery: '',
            selectedYearFilter: 'all',
            availableYears: [],
            
            weeklyDataRaw: null,
            availableWeeks: [],
            selectedNav: 'voti', 
            defaultF1Points: [25, 18, 15, 10, 8, 6, 4, 2],
            noveF1Points: [25, 18, 15, 12, 10, 8, 6, 4, 2],
            seiF1Points: [25, 18, 15, 12, 10, 8],
        }
    },
    computed: {
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
        },

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

            // Ordinamento
            return entries.sort((a, b) => {
                if (this.sortBy === 'media') return b.globalMedia - a.globalMedia;
                const scoreB = b.userScores[this.sortBy] || 0;
                const scoreA = a.userScores[this.sortBy] || 0;
                return scoreB - scoreA;
            });
        },

        isWeeklyMode() {
            return this.selectedNav !== 'voti';
        },
        maxWeek() {
            return this.availableWeeks.length > 0 ? Math.max(...this.availableWeeks) : 0;
        },
        weeklyForketta() { return this.getWeeklyRanking('forketta'); },
        weeklyPigna() { return this.getWeeklyRanking('pigna'); },
        cumulativeForketta() { return this.getCumulativeF1('forketta'); },
        cumulativePigna() { return this.getCumulativeF1('pigna'); }
    },
    methods: {
        formatSeasonNames(seasonStr) {
            if (!seasonStr) return 'N/A';
            return seasonStr.split('/').map(s => {
                const name = s.replace(/[0-9]/g, '');
                const yr = s.replace(/[^0-9]/g, '');
                return `${AnimeUtils.translateSeason(name)} ${yr}`;
            }).join(', ');
        },

        getAnimeTitle(id) {
            return this.animeRaw[id] ? this.animeRaw[id].title : `Sconosciuto #${id}`;
        },

        navigateWeek(direction) {
            if (this.selectedNav === 'voti') {
                if (direction === 1 && this.availableWeeks.length > 0) this.selectedNav = 1;
            } else {
                const newVal = parseInt(this.selectedNav) + direction;
                if (newVal < 1) this.selectedNav = 'voti';
                else if (newVal <= this.maxWeek) this.selectedNav = newVal;
            }
            this.updateUrl();
        },

        handleNavChange() {
            this.updateUrl();
        },

        updateUrl() {
            const url = new URL(window.location);
            if (this.selectedNav === 'voti') {
                url.searchParams.delete('week');
            } else {
                url.searchParams.set('week', this.selectedNav);
            }
            window.history.pushState({}, '', url);
        },

        getWeeklyRanking(user) {
            if (!this.isWeeklyMode || !this.weeklyDataRaw || !this.weeklyDataRaw[this.selectedNav]) return [];
            
            const currentRankList = this.weeklyDataRaw[this.selectedNav][user]?.classifica || [];
            
            return currentRankList.map((id, index) => {
                let trend = null; 
                const currentWeekNum = parseInt(this.selectedNav);
                
                if (currentWeekNum > 1 && this.weeklyDataRaw[currentWeekNum - 1]) {
                    const prevRankList = this.weeklyDataRaw[currentWeekNum - 1][user]?.classifica || [];
                    const prevIndex = prevRankList.indexOf(id);
                    
                    if (prevIndex !== -1) {
                        trend = prevIndex - index; 
                    } else {
                        trend = 'NEW';
                    }
                } else if (currentWeekNum === 1) {
                    trend = '-';
                }

                return { id, trend };
            });
        },

        formatTrend(trend) {
            if (trend === 'NEW') return 'NEW';
            if (trend === '-') return '-';
            if (trend > 0) return `+${trend}`;
            if (trend < 0) return `${trend}`; 
            return '=';
        },

        getTrendClass(trend) {
            if (trend === 'NEW') return 'trend-new';
            if (trend === '=') return 'trend-flat';
            if (trend > 0) return 'trend-up';
            if (trend < 0) return 'trend-down';
            return '';
        },

        getCumulativeF1(user) {
            if (!this.isWeeklyMode || !this.weeklyDataRaw) return [];
            
            const pointsMap = {};
            const endWeek = parseInt(this.selectedNav);

            let basePointsScale = this.defaultF1Points;
            
            if (this.year === '2025') {
                if (this.season === 'SUMMER') {
                    basePointsScale = this.noveF1Points;
                } else if (this.season === 'FALL') {
                    basePointsScale = this.seiF1Points;
                }
            }

            for (let w = 1; w <= endWeek; w++) {
                const wData = this.weeklyDataRaw[w];
                if (!wData || !wData.calcola_f1) continue; 

                const ranking = wData[user]?.classifica || [];
                
                const pointsScale = wData.override_punti || basePointsScale; 

                ranking.forEach((id, index) => {
                    if (!pointsMap[id]) pointsMap[id] = 0;
                    pointsMap[id] += (pointsScale[index] || 0); 
                });
            }

            return Object.entries(pointsMap)
                .map(([id, points]) => ({ id, points }))
                .sort((a, b) => b.points - a.points);
        }
    },
    async mounted() {
        const params = new URLSearchParams(window.location.search);
        this.year = params.get('year') || '';
        this.season = params.get('season') || '';
        
        const urlWeek = params.get('week');
        this.selectedNav = urlWeek ? parseInt(urlWeek) : 'voti';
        
        try {
            const resAnime = await fetch('data/anime.json');
            this.animeRaw = await resAnime.json();
            
            const resSeasons = await fetch('data/seasons.json');
            if (resSeasons.ok) {
                const dataSeasons = await resSeasons.json();
                this.availableYears = dataSeasons.lista.map(obj => Object.keys(obj)[0]);
            }

            if (this.year && this.season) {
                const seasonLower = this.season.toLowerCase();
                const resWeek = await fetch(`data/${this.year}/${seasonLower}.json`);
                if (resWeek.ok) {
                    this.weeklyDataRaw = await resWeek.json();
                    this.availableWeeks = Object.keys(this.weeklyDataRaw).map(Number).sort((a,b) => a - b);
                }
            }
        } catch (e) {
            console.log("Errore nel caricamento dei file JSON o file settimanali non trovati.", e);
        }
    }
});

app.mount('#app');