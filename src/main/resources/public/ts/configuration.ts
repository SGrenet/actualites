export const ACTUALITES_CONFIGURATION = {
    applicationName: 'actualites',
    infosCollectionName: 'infos',
    threadsCollectionName: 'threads',
    infoStatus: {
        DRAFT: 1,
        PENDING: 2,
        PUBLISHED: 3,
        TRASH: 0
    },
    infoFilter : {
        PUBLISHED: 'PUBLISHED',
        HEADLINE: 'HEADLINE',
        DRAFT: 'DRAFT',
        PENDING: 'PENDING'
    },
    threadMode: {
        SUBMIT: 0,
        DIRECT: 1
    },
    threadStatus: {
        DRAFT: 'draft',
        PENDING: 'pending',
        PUBLISHED: 'published',
        TRASH: 'trash'
    },
    threadFilters: {
        PUBLIC: 0,
        ALL: 1,
        STATES: 2
    },
    threadTypes: {
        latest: 0
    },
    momentFormat: 'YYYY-MM-DDTHH:mm:ss',
    statusNameFromId: function(statusId) {
        if (statusId === ACTUALITES_CONFIGURATION.infoStatus.DRAFT) {
            return ACTUALITES_CONFIGURATION.threadStatus.DRAFT;
        }
        else if (statusId === ACTUALITES_CONFIGURATION.infoStatus.PENDING) {
            return ACTUALITES_CONFIGURATION.threadStatus.PENDING;
        }
        else if (statusId === ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED) {
            return ACTUALITES_CONFIGURATION.threadStatus.PUBLISHED;
        }
        else {
            return undefined;
        }
    }
};