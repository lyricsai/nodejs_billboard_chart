const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');

//billboard charts urls 
const urls = [
    'https://www.billboard.com/charts/south-korea-songs-hotw/',
    'https://www.billboard.com/charts/japan-hot-100/'
];

const saveChartsToJSON = async (results) => {

    try {
        const thisWeek = {
            id: String(Date.parse(new Date(results[0].date))),
            data: results
        };

        //reading existing data from local file
        fs.readFile('./dbChart.json', (err, data) => {

            if(err) throw new Error(err);

            let dataContent = JSON.parse(data) || [];

            //checking if this week data is already in data file
            if(dataContent.find((e) => +e.id === +thisWeek.id)) return;

            dataContent.push(thisWeek);

            console.log(dataContent);
            //rewriting data to local file
            fs.writeFile('./dbChart.json', JSON.stringify(dataContent), err => console.error('err', err));
        });


    } catch(error) {
        console.error(error);
    }
};

const fetchChartList = async (url) => {

    try {

        const dateSelector = 'div.chart-results p.c-tagline.a-font-primary-medium-xs';
        const listingRowSelector = '.o-chart-results-list-row';
        const listingTitleSelector = 'h3#title-of-a-story';
        const listingMetaSelector = 'li.o-chart-results-list__item span';
        const listingImageSrcSelector = 'div.lrv-a-crop-1x1 img.c-lazy-image__img.lrv-u-height-auto';

        const response = await axios.get(url);
        const html = response.data;

        const $ = cheerio.load(html);

        const listings = [];

        const country = $('h1').text().trim();
        const date = $(dateSelector).text();

        //scraping data from a single url, removing empty spaces
        $(listingRowSelector).each((i, el) => {
            if(i > 10) return;
            const listing = $(el);
            const title = listing.find(listingTitleSelector).text().trim();
            const meta = listing.find(listingMetaSelector)
                .text()
                .trim()
                .split('\n')
                .join('')
                .split('\t')
                .filter(a => a && a !== 'RE-ENTRY').filter(s => s && s !== 'NEW');

            const [currentWeek, artist, lastWeek, peek, weeksOn] = meta;

            const src = listing.find(listingImageSrcSelector).attr('data-lazy-src');

            listings.push({title, artist, currentWeek, src, lastWeek, peek, weeksOn});
        });

        return {title: country, date, listings};

    } catch(error) {
        console.error('err catch', error);
    }
};

const fetchingURLs = (urls) => {
    //scraping data from all charts 
    Promise.all(urls.map(fetchChartList)).then(res => saveChartsToJSON(res));
};

fetchingURLs(urls);