const wkhtmltoimage = require('wkhtmltoimage');
const bodyParser = require('body-parser');
const nodeURL = require('url');
const express = require('express');
const pug = require('pug');
const got = require('got');
const metascraper = require('metascraper')([
    require('metascraper-description')(),
    require('metascraper-image')(),
    require('metascraper-logo')(),
    require('metascraper-clearbit')(),
    require('metascraper-title')(),
    require('metascraper-url')()
]);

const app = express();
const port = 3000;

const stringIsAValidUrl = (s) => {
    try {
        new nodeURL.URL(s);
        return true;
    } catch (err) {
        return false;
    }
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'pug');
app.set('views', './templates');
app.use(express.static('public'));

app.all('/', async (req, res) => {
    const urlWithParams = nodeURL.parse(req.url, true);
    let targetURL = null;
    let returnMessage = null;

    if (urlWithParams.query && urlWithParams.query['url']) {
        targetURL = urlWithParams.query['url'];
    } else if (req.body && req.body.url) {
        targetURL = req.body.url;
    }

    if (stringIsAValidUrl(targetURL) && targetURL) {
        got(targetURL).then(({body: html, url}) => {
            metascraper({html, url}).then(result => {
                const imageURL = result.image;
                const subredditName = String(result.title).split(' - ')[0];
                const postTitle = String(result.title).split(' - ')[1];
                const isIcon = imageURL.includes('thumbs.redditmedia.com');
                const renderHTML = pug.compileFile('templates/generated.pug', null);

                wkhtmltoimage.generate(renderHTML({subredditName, postTitle, imageURL, isIcon}), {
                    height: 420,
                    width: 700
                })
                    .pipe(res);
            }).catch(err => {
                returnMessage = err;
                res.render('default', {returnMessage});
            })
        });

    } else {
        if (!stringIsAValidUrl(targetURL)) {
            returnMessage = `${targetURL} is not a valid URL`;
        }

        res.render('default', {returnMessage});
    }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
