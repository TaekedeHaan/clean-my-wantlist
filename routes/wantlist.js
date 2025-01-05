const express = require('express');
const debug = require('debug')('app:wantlist')

class Routes {
    constructor(wantlist) {
        this.router = express.Router();
        this.wantlist = wantlist;

        this.router.get('/', this.getWantlistHandler.bind(this));
        this.router.get('/ids', this.getWantlistIdsHandler.bind(this));
        this.router.get('/:id', this.getWantlistItemHandler.bind(this));
    }

    async getWantlistHandler(req, res) {
        try {
            debug("Handling get wantlist");
            res.send(this.wantlist.releases);
        }
        catch (error) {
            res.status(400).send(`Failed to get the wantlist: ${error}`)
        }
    }

    async getWantlistIdsHandler(req, res) {
        try {
            debug("Handling get wantlist IDs");
            const ids = this.wantlist.releases.map(item => item.id);
            res.send(ids);
        }
        catch (error) {
            res.status(400).send(`Failed to get the wantlist IDs: ${error}`)
        }
    }

    async getWantlistItemHandler(req, res) {
        try {
            debug(`Handling get wantlist item ${req.params.id}`);
            const release = this.wantlist.releases.find(rel => rel.id === parseInt(req.params.id))
            if (!release) return res.status(404).send(`The release with ID ${req.params.id} was not found`)
            res.send(release);
        }
        catch (error) {
            res.status(400).send(`Failed to get the wantlist item: ${error}`)
        }
    }
}

module.exports = Routes