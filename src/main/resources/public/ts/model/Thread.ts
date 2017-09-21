import { Collection, Model, model } from 'entcore';
import http from 'axios';
import { ACTUALITES_CONFIGURATION } from '../configuration';

import { Info } from './index';

export class Thread extends Model {
    _id: number;
    infos: Collection<Info>;
    myRights: any;
    display_title: string;
    title: string;
    mode: any;
    icon: string;
    data: any;

    constructor (data?) {
        super();
        if (data) {
            for (let key in data) {
                this[key] = data[key];
            }
        }
        (this as any).collection(Info, {
            thisWeekInfos : [],
            beforeThisWeekInfos : [],
            drafts : [],
            pendings : [],
            headlines : []
        });
    }

    setDisplayName () {
        return this.display_title = this.title.length > 40
            ? (this.title.substring(0, 40) + '...')
            : this.title
    }

    load (data) {
        var resourceUrl = '/actualites/thread/' + this._id;
        if (data !== undefined) {
            resourceUrl = '/actualites/thread/' + data._id;
        }

        http.get(resourceUrl).then(function (response) {
            let content = response.data;
            this.updateData({
                title: content.title,
                icon: content.icon,
                order: content.order,
                mode: content.mode,
                loaded: true,
                modified: content.modified || this.modified,
                owner: content.owner || this.owner,
                ownerName: content.ownerName || this.ownerName,
                _id: content._id || this._id
            });

            this.trigger('change');
        }.bind(this));
    }

    createThread () {
        this.mode = this.mode || ACTUALITES_CONFIGURATION.threadMode.SUBMIT;

        http.post('/actualites/thread', this).then(function () {
            model.syncAll();
        }.bind(this));
    }

    toJSON () {
        if (this.icon){
            return {
                mode: this.mode,
                title: this.title,
                icon: this.icon
            };
        } else {
            return {
                mode: this.mode,
                title: this.title
            };
        }
    }

    saveModifications () {
        this.mode = this.mode || ACTUALITES_CONFIGURATION.threadMode.SUBMIT;
        http.put('/actualites/thread/' + this._id, this).then(function () {
            model.infos.sync();
            this.setDisplayName();
        }.bind(this));
    }

    save () {
        if (this._id) {
            if (this.title && this.title.length > 0) {
                this.saveModifications();
            } else {
                this.title = this.data.title;
            }
        }
        else {
            this.createThread();
        }
    }

    remove (callback) {
        http.delete('/actualites/thread/' + this._id).then(function(){
            if (typeof callback === 'function'){
                callback();
            } else {
                model.infos.sync();
            }
        });
    }

    canPublish () {
        return this.myRights.publish !== undefined;
    }
}