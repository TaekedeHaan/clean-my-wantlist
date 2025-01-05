require('dotenv').config();
const readline = require('readline');
const Discogs = require('disconnect').Client;
const morgan = require('morgan');
const Authorize = require('./authorize')
const debug = require('debug')('app:main')
const WantlistRoutes = require('./routes/wantlist')
const Wantlist = require('./lib/wantlist')
const express = require('express');

const app = express();


if (app.get('env') == 'development') {
    debug("Enabeling morgan");
    app.use(morgan('tiny'));
}

const port = process.env.PORT || 3000;
const callback = '/authenticate/callback';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var authorize = new Authorize();
let discogsClient;
let username;

function showWantlistItem(release) {

    const title = release.basic_information.title;
    const artist = release.basic_information.artists[0].name; // Assuming the first artist
    const year = release.basic_information.year;
    const imageUrl = release.basic_information.cover_image; // Optional: Album cover image URL

    debug(`Title: ${title}`);
    debug(`Artist: ${artist}`);
    debug(`Year: ${year}`);
    if (imageUrl) {
        debug(`Cover Image: ${imageUrl}`);
    }
    debug('-------------------');
}

function askUserToKeep(release) {
    showWantlistItem(release)
    rl.question('Would you like to keep this item? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
            debug('Item kept.');
        } else {
            debug('Item removed.');
        }
    });
}


app.get('/authenticate/load', async (req, res) => {
    const isConnected = authorize.isConnected()
    if (isConnected) {
        res.send('Authorization successful! You can now use the app.');
    }
    else {
        res.send(`Error while loading authentication, try to authenitcate instead`)
    }
});


app.get('/authenticate', async (req, res) => {
    try {
        const url = authorize.connect(`http://localhost:${port}${callback}`);
        res.json({ authorizeUrl: url });
    } catch (error) {
        res.send(`Error while requesting access token: ${error.message}`)
    }
});

app.get('/authenticate/callback', async (req, res) => {
    try {
        authorize.callback(req, res)
    } catch (error) {
        res.send(`Error while getting access token: ${error.message}`)
    }
});

app.get('/profile', async (req, res) => {
    if (discogsClient == undefined) {
        res.send('Login first')
        return;
    }

    const userProfile = await new Promise((resolve, reject) => {
        discogsClient.getIdentity((err, profile) => {
            if (err) return reject(err);
            resolve(profile);
        });
    });

    username = userProfile.username;
    res.send(`Authenticated as ${username}`);
});

async function main() {
    app.listen(port, () => { debug(`Listening on port ${port}`) })

    const isConnected = await authorize.isConnected();
    if (!isConnected) {
        var url = await authorize.connect(`http://localhost:${port}${callback}`)
    }


    const discogsClient = new Discogs(authorize.oAuth.auth);
    wantlist = new Wantlist(discogsClient);
    wantlist.fetch();

    wantlistRoutes = new WantlistRoutes(wantlist)
    app.use('/api/wantlist', wantlistRoutes.router)
}


main()

async function refineWantlist() {

    const wantlist = await discogsClient.user().wantlist().getReleases(username);

    // Display the wantlist
    if (wantlist && wantlist.wants && wantlist.wants.length > 0) {
        var item = 0
        const release = wantlist.wants[item]
        debug(`Item ${item}:`);
        askUserToKeep(release);

    } else {
        debug('Your wantlist is empty or could not be retrieved.');
    }
}


// node js:
//  javascript on a server instead of a webbrowser

// npm node package manager) npm is the default package manager for the JavaScript runtime environment Node.js and is included as a recommended feature in the Node.js installer.
// npx


// GET /releases

// dealing with async:
//  - calbacks
//  - promises
//  - asyn/await (wraps around promises)