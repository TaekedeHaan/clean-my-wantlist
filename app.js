require('dotenv').config();
const http = require('http');
const url = require('url');
const readline = require('readline');
const Discogs = require('disconnect').Client;

const consumerKey = process.env.DISCOGS_CONSUMER_KEY;
const consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;
const token = process.env.DISCOGS_TOKEN;
const secret = process.env.DISCOGS_SECRET;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function showWantlistItem(release) {

    const title = release.basic_information.title;
    const artist = release.basic_information.artists[0].name; // Assuming the first artist
    const year = release.basic_information.year;
    const imageUrl = release.basic_information.cover_image; // Optional: Album cover image URL

    console.log(`Title: ${title}`);
    console.log(`Artist: ${artist}`);
    console.log(`Year: ${year}`);
    if (imageUrl) {
        console.log(`Cover Image: ${imageUrl}`);
    }
    console.log('-------------------');
}

function askUserToKeep(release) {
    showWantlistItem(release)
    rl.question('Would you like to keep this item? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
            console.log('Item kept.');
        } else {
            console.log('Item removed.');
        }
    });
}

async function authenticate() {
    const oAuth = new Discogs().oauth();

    const requestData = await new Promise((resolve, reject) => {
        oAuth.getRequestToken(
            consumerKey,
            consumerSecret,
            'http://localhost:3000/callback', // Local callback URL
            (err, requestData) => {
                if (err) return reject(err);
                resolve(requestData);
            }
        );
    });

    console.log(`Authorize the app here: ${requestData.authorizeUrl}`);

    const verifierCode = await new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            if (req.url.startsWith('/callback')) {
                const query = url.parse(req.url, true).query;
                const code = query.oauth_verifier;

                // Respond to the user and close the server
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Authorization successful! You can close this window.');
                server.close();

                resolve(code); // Resolve the Promise with the verifier code
            }
        });

        server.listen(3000, () => {
            console.log('Listening for the callback at http://localhost:3000/callback');
        });
    });

    const accessData = await new Promise((resolve, reject) => {
        oAuth.getAccessToken(
            verifierCode,
            (err, accessData) => {
                if (err) return reject(err);
                resolve(accessData);
            }
        );
    });

    return accessData;
}

async function loadAuthentication() {
    const oAuth = new Discogs().oauth();
    var accessData = oAuth.auth
    accessData.level = 2
    accessData.consumerKey = consumerKey
    accessData.consumerSecret = consumerSecret
    accessData.token = token
    accessData.tokenSecret = secret
    return accessData
}

async function refineWantlist(accessData) {
    console.log('Access Token:', accessData);
    const discogsClient = new Discogs(accessData);

    const userProfile = await new Promise((resolve, reject) => {
        discogsClient.getIdentity((err, profile) => {
            if (err) return reject(err);
            resolve(profile);
        });
    });

    const username = userProfile.username;
    console.log('Authenticated as:', username);


    const wantlist = await discogsClient.user().wantlist().getReleases(username);

    // Display the wantlist
    if (wantlist && wantlist.wants && wantlist.wants.length > 0) {
        var item = 0
        const release = wantlist.wants[item]
        console.log(`Item ${item}:`);
        askUserToKeep(release);

    } else {
        console.log('Your wantlist is empty or could not be retrieved.');
    }
}


// loadAuthentication().then((accessData) => refineWantlist(accessData));
authenticate().then((accessData) => refineWantlist(accessData));
// Start with the first item



// node js:
//  javascript on a server instead of a webbrowser

// npm node package manager) npm is the default package manager for the JavaScript runtime environment Node.js and is included as a recommended feature in the Node.js installer.
// npx