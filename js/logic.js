const AnimeUtils = {
    translateSeason(s) {
        const t = { "WINTER": "Inverno", "SPRING": "Primavera", "SUMMER": "Estate", "FALL": "Autunno" };
        return t[s] || s;
    },
    processAnimeForSeason(id, info, matchTarget) {
        const seasonParts = info.season ? info.season.split('/') : [];
        const seasonIndex = seasonParts.indexOf(matchTarget);
        
        let scores = { Forketta: 0, pigna: 0 };
        let sum = 0, count = 0, votiArray = [];

        if (info.voti && seasonIndex !== -1) {
            Object.entries(info.voti).forEach(([user, list]) => {
                const val = list[seasonIndex];
                if (val !== undefined) {
                    scores[user] = val;
                    votiArray.push(`${user}: ${val}`);
                    sum += val; count++;
                }
            });
        }

        return {
            id,
            info,
            media: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
            scores,
            votiTesto: votiArray.join(' | '),
            notaCour: (info["voti-note"] && info["voti-note"][seasonIndex]) || null
        };
    }
};