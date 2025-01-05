const debug = require('debug')('app:wantlist')

class Wantlist {
    constructor(discogsClient) {
        this.username = 'Taeke'
        this.discogsClient = discogsClient;

        this.releases = []
        this.pages = 1
        this.items = undefined
        this.maxPages = 1
    }

    async fetch() {
        var page = 1
        while (page <= this.pages) {
            debug(`Fetching page ${page}/${this.pages}`)
            const wantlist = await this.discogsClient.user().wantlist().getReleases(this.username, { page: page })
            const releases = wantlist["wants"];

            const existingIds = new Set(this.releases.map(item => item.id));
            const releasesToAdd = releases.filter(item => !existingIds.has(item.id));
            this.releases.push(...releasesToAdd);

            const pagination = wantlist["pagination"];
            this.pages = Math.min(pagination["pages"], this.maxPages)
            this.items = pagination["items"]
            page = page + 1
        }
    }

    get itemsFetched() {
        return this.releases.length;
    }
}

module.exports = Wantlist