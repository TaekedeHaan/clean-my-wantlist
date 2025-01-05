const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    if (username == undefined) {
        res.send('First fetch profile')
        return;
    }

    res.send(await discogsClient.user().wantlist().getReleases(username))
});

module.exports = router