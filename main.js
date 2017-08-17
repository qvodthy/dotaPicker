const cheerio = require('cheerio');
const superAgent = require('superagent');
const _ = require('lodash');

const c = {
    name: 'spectre',
    comb: ['lion', 'necrolyte', 'rubick', 'silencer'],
    anti: ['viper', 'monkey_king', 'lich', 'pudge', 'slark'],
};

function getAntiRate(hero, antis) {
    return superAgent
        .get(`dotamax.com/hero/detail/match_up_anti/${hero}/?ladder=n&skill=n`)
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36')
        .then(x => {
            const $ = cheerio.load(x.text);
            return $('.main-shadow-box').find('table').find('tbody').find('tr')
                .filter((i, el) => {
                    return antis.some(antiName => $(el).find('td').first().find('a').attr('href').includes(antiName));
                }).map((i, el) => $(el).find('td').eq(2).find('div').first().text())
                .toArray();
        });
}

function getCombRate(hero, combs) {
    return superAgent
        .get(`dotamax.com/hero/detail/match_up_comb/${hero}/?ladder=n&skill=n`)
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36')
        .then(x => {
            const $ = cheerio.load(x.text);
            return $('.main-shadow-box').find('table').find('tbody').find('tr')
                .filter((i, el) => {
                    return combs.some(combName => $(el).find('td').first().find('a').attr('href').includes(combName));
                }).map((i, el) => $(el).find('td').eq(2).find('div').first().text())
                .toArray();
        });
}

function calc(o) {
    return Promise.all([
        getCombRate(o.name, o.comb),
        getAntiRate(o.name, o.anti),
    ]).then(([combs, antis]) => {
        return antis.concat(combs).map(s => parseFloat(s) / 100).reduce((a, b) => a * b / (a * b + (1 - a) * (1 - b)));
    }).catch(err => console.log('[ERROR]:', o.name, err.status));
}

superAgent
    .get('http://dotamax.com/hero/rate/')
    .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36')
    .then(x => {
        const $ = cheerio.load(x.text);
        return $('.main-shadow-box').find('table').find('tbody').find('tr')
            .map((i, el) => (/DoNav\('\/hero\/detail\/(\w+)'\)/.exec($(el).attr('onclick'))[1]))
            .toArray();
    })
    .then(x => _.xor(c.comb.concat(c.anti), x))
    .then(x => x.map(s => ({
        name: s,
        comb: c.comb,
        anti: c.anti,
    })))
    .then(x => Promise.all(
        x.map(s => calc(s).then(rate => ({name: s.name, rate})))
    ))
    .then(x => console.log(x.sort((a, b) => a.rate-b.rate).reverse()));