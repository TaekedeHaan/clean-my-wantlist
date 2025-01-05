require('dotenv').config();
const debug = require('debug')('app:authorize')
const Discogs = require('disconnect').Client;

const consumerKey = process.env.DISCOGS_CONSUMER_KEY;
const consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;
const token = process.env.DISCOGS_TOKEN;
const secret = process.env.DISCOGS_SECRET;

class Authorize {
    constructor() {
        var oAuth = new Discogs().oauth();
        oAuth.auth.level = 2;
        oAuth.auth.consumerKey = consumerKey;
        oAuth.auth.consumerSecret = consumerSecret;
        oAuth.auth.token = token;
        oAuth.auth.tokenSecret = secret;

        this.oAuth = oAuth;
    }

    async connect(callbackUrl) {
        debug('Will try to conennect')

        const authorizeUrl = await new Promise((resolve, reject) => {
            this.oAuth.getRequestToken(
                this.oAuth.auth.consumerKey,
                this.oAuth.auth.consumerSecret,
                callbackUrl,
                (err, requestData) => {
                    if (err) return reject(err);
                    resolve(requestData.authorizeUrl);
                }
            );
        }).catch((error) => {
            debug(`Failed to get request token: ${error}`)
        });

        if (authorizeUrl === undefined) return;


        debug(`Authorize the app here: ${authorizeUrl} `);
        return authorizeUrl;
    }

    async callback(req, res) {

        const verifierCode = req.query.oauth_verifier;

        const accessData = await new Promise((resolve, reject) => {
            this.oAuth.getAccessToken(verifierCode, (err, accessData) => {
                if (err) return reject(err);
                resolve(accessData);
            });
        }).catch((error) => {
            debug(`Failed to get access token: ${error}`)
        });

        if (accessData === undefined) return;

        this.oAuth.auth = accessData;
        res.send('Authorization successful! You can now use the app.');
    }

    async isConnected() {
        const discogsClient = new Discogs(this.oAuth.auth);

        const userProfile = await new Promise((resolve, reject) => {
            discogsClient.getIdentity((err, profile) => {
                if (err) return reject(err);
                resolve(profile);
            });
        }).catch((error) => {
            debug(`Failed to get identity: ${error}`)
        });

        if (userProfile === undefined) return false;
        debug(`You are connected ${userProfile.username}!`);
        return true;


    }
}

module.exports = Authorize;