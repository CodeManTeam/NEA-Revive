const FISH_CONFIG = {
    QUALITIES: {
        COMMON: {
            weight: 55,
            basePrice: 30,
            dailyDemand: 300,
            fish: ['鲑鱼', '鳕鱼']
        },
        UNCOMMON: {
            weight: 33,
            basePrice: 80,
            dailyDemand: 200,
            fish: ['热带鱼', '河豚']
        },
        RARE: {
            weight: 8,
            basePrice: 200,
            dailyDemand: 50,
            fish: ['美西螈', '幼年鱿鱼', '小海龟', '蝌蚪']
        },
        EPIC: {
            weight: 3,
            basePrice: 500,
            dailyDemand: 27,
            fish: ['幼年发光鱿鱼', '幼年鹦鹉螺', '小海豚']
        },
        LEGENDARY: {
            weight: 0.9,
            basePrice: 1200,
            dailyDemand: null,
            fish: ['幼年末影龙', '幼年凋零', '幼年监守者', '幼年远古守卫者', '幼年僵尸鹦鹉螺']
        },
        MYTHIC: {
            weight: 0.1,
            basePrice: 2500,
            dailyDemand: null,
            fish: ['下界之星', '龙蛋', '潮涌核心', '鞘翅', '沉重核心']
        }
    },

    FISHING_PARAMS: {
        BITE_TIME_MIN: 7,
        BITE_TIME_MAX: 20,
        REEL_TIME: 1.5
    }
};

const QualityNames = {
    COMMON: '寻常',
    UNCOMMON: '罕见',
    RARE: '超常',
    EPIC: '珍稀',
    LEGENDARY: '奇迹',
    MYTHIC: '绝伦'
}

global.FISH_MARKET = {
    prices: {
        COMMON: 30,
        UNCOMMON: 80,
        RARE: 200,
        EPIC: 500,
        LEGENDARY: 1200,
        MYTHIC: 2500
    },
    dailySales: {
        COMMON: 0,
        UNCOMMON: 0,
        RARE: 0,
        EPIC: 0,
        LEGENDARY: 0,
        MYTHIC: 0
    },
};

async function initFishMarket() {
    const marketData = await GroupStorage.get('FishMarket');
    if (marketData && marketData.value) {
        for (const quality in FISH_MARKET.prices) {
            FISH_MARKET.prices[quality] = marketData.value.prices[quality]
        };
        for (const quality in FISH_MARKET.dailySales) {
            FISH_MARKET.dailySales[quality] = marketData.value.dailySales[quality]
        }
    } else {
        await saveFishMarket();
    }
}

async function saveFishMarket() {
    await GroupStorage.set('FishMarket', FISH_MARKET);
}

async function resetDailyMarket() {

    for (const [quality, config] of Object.entries(FISH_CONFIG.QUALITIES)) {
        if (config.dailyDemand) {
            const yesterdaySold = FISH_MARKET.dailySales[quality] || 0;
            const demand = config.dailyDemand;
            const changeRate = (demand - yesterdaySold) / demand;
            const currentPrice = FISH_MARKET.prices[quality]

            const newPrice = Math.round(config.basePrice * (Math.max(Math.min((currentPrice / config.basePrice + changeRate), 1.5), 0.5)));
            FISH_MARKET.prices[quality] = newPrice;
            FISH_MARKET.dailySales[quality] = 0;
        }
    }

    await saveFishMarket();
}

async function recordSale(quality, amount = 1) {
    if (FISH_CONFIG.QUALITIES[quality]) {
        FISH_MARKET.dailySales[quality] = (FISH_MARKET.dailySales[quality] || 0) + amount;
        await saveFishMarket();
    }
}

function getRandomFishQuality() {
    const qualities = Object.entries(FISH_CONFIG.QUALITIES);
    const totalWeight = qualities.reduce((sum, [_, config]) => sum + config.weight, 0);

    let random = Math.random() * totalWeight;
    for (const [quality, config] of qualities) {
        random -= config.weight;
        if (random <= 0) {
            return quality;
        }
    }

    return 'COMMON';
}

function getRandomFish() {
    const quality = getRandomFishQuality();
    const config = FISH_CONFIG.QUALITIES[quality];
    const fishIndex = Math.floor(Math.random() * config.fish.length);
    return {
        name: config.fish[fishIndex],
        quality: quality,
        price: FISH_MARKET.prices[quality] || config.basePrice
    };
}

function getFishQuality(fish) {
    const qualities = Object.entries(FISH_CONFIG.QUALITIES);

    for (const [quality, config] of qualities) {
        if (config.fish.includes(fish)) {
            return {
                quality: quality,
                price: FISH_MARKET.prices[quality],
                dailySale: FISH_MARKET.dailySales[quality]
            }
        }
    }

    return {
        quality: 'COMMON',
        price: FISH_MARKET.prices['COMMON'],
        dailySale: FISH_MARKET.dailySales['COMMON']
    };
};

module.exports = {
    FISH_CONFIG,
    QualityNames,
    initFishMarket,
    saveFishMarket,
    resetDailyMarket,
    recordSale,
    getRandomFishQuality,
    getRandomFish,
    getFishQuality
};

