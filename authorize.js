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
        try {
            debug('Trying to connect...')

            const authorizeUrl = await new Promise((resolve, reject) => {
                const callback = (err, requestData) => {
                    if (err) return reject(err);
                    resolve(requestData.authorizeUrl);
                }

                this.oAuth.getRequestToken(
                    this.oAuth.auth.consumerKey,
                    this.oAuth.auth.consumerSecret,
                    callbackUrl,
                    callback
                );
            })

            debug(`Authorize the app here: ${this.oAuth.auth.authorizeUrl} `);
        }

        catch (error) { debug(`Failed to get request token: ${error}`); }
    }

    async callback(req, res) {
        try {
            const verifierCode = req.query.oauth_verifier;

            const accessData = await new Promise((resolve, reject) => {
                const callback = (err, accessData) => {
                    if (err) return reject(err);
                    resolve(accessData);
                }

                this.oAuth.getAccessToken(verifierCode, callback);
            });


            this.oAuth.auth = accessData;
            res.send('Authorization successful! You can now use the app.');
            this.isConnected()

        }
        catch (error) {
            debug(`Failed to get access token: ${error}`);
        }
    }

    async isConnected() {
        try {
            const discogsClient = new Discogs(this.oAuth.auth);

            const userProfile = await new Promise((resolve, reject) => {
                const callback = (err, profile) => {
                    if (err) return reject(err);
                    resolve(profile);
                };

                discogsClient.getIdentity(callback);
            });

            debug(`You are connected ${userProfile.username}!`);
            return true;
        }
        catch (error) {
            debug(`Failed to get identity: ${error}`);
        }


    }
}

module.exports = Authorize;