require('dotenv').config();
const Discogs = require('disconnect').Client;

// Discogs credentials from your .env file
const consumerKey = process.env.DISCOGS_CONSUMER_KEY;
const consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;


async function authenticate() {
    // Initialize the Discogs client

    var oAuth = new Discogs().oauth();

    const requestData = await new Promise((resolve, reject) => {
        oAuth.getRequestToken(
            consumerKey,
            consumerSecret,
            "http://localhost/callback",
            (err, requestData) => {
                if (err) return reject(err);
                resolve(requestData);
            }
        );
    });

    console.log(`Authorize the app here: ${requestData.authorizeUrl}`);


    // Step 2: Get the verifier code from the user
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const verifierCode = await new Promise((resolve) => {
        rl.question('Enter the verification code (oauth_verifier) from Discogs: ', (code) => {
            rl.close();
            resolve(code);
        });
    });

    // Step 3: Exchange the request token for an access token
    const accessData = await new Promise((resolve, reject) => {
        oAuth.getAccessToken(
            verifierCode,
            (err, accessData) => {
                if (err) return reject(err);
                resolve(accessData);
            }
        );
    });

    console.log('Access Token:', accessData);

    // Step 4: Use the access token to authenticate
    const authenticatedClient = new Discogs(accessData);

}

authenticate()