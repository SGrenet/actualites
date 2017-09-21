import { Collection, $, idiom as lang, _, Model, moment, notify, model } from 'entcore';
import http from 'axios';
import { Thread, Utils, Comment } from './index';
import { ACTUALITES_CONFIGURATION } from '../configuration';

export class Info extends Model {
    _id: number;
    that: Info;
    status: number;
    comments: Collection<Comment>;
    newComment: Comment;
    preview: string;
    publication_date: any;
    hasPublicationDate: boolean;
    events: Collection<Event>;
    expiration_date: any;
    hasExpirationDate: boolean;
    title: string;
    content: string;
    thread: Thread;
    is_headline: boolean;
    owner: string;
    username: string;
    thread_id: number;
    myRights: any;
    tmpComments: any;

    constructor (data?) {
        super();
        var that = this;
        this.newComment = new Comment();
        if (data){
            for (let key in data) {
                this[key] = data[key];
            }
            this.preview = '<p>' + $('<div>' + data.content + '</div>').text().substring(0, 500);
            if ( this.preview.length > 500 ) {
                this.preview = this.preview + '... <strong class="read-more-link"><a>' + lang.translate('actualites.info.read.more') + '</a></strong>';
            }
            this.preview = this.preview + '</p>';
        } else {
            this.status = ACTUALITES_CONFIGURATION.infoStatus.DRAFT;
        }
        delete this.comments;
        (this as any).collection(Comment);


        if (data && data.comments){
            this.comments.load(data.comments);
        }
        if (!data){
            this.publication_date = new Date();
        }
        (this as any).collection(Event, {
            sync : function () {
                http.get('/actualites/info/' + that._id + '/timeline').then(function (response) {
                    var newEvents = _.filter(response.data, function (event) {
                        return !that.events.findWhere({_id : event._id});
                    });
                    this.addRange(newEvents);
                }.bind(this));
            }
        });
    }

    toJson () {
        let pubDate = null;
        if (this.hasPublicationDate) {
            pubDate = this.publication_date;
            if (!moment.isMoment(pubDate)) {
                pubDate = moment(pubDate);
            }
            if (!pubDate.isSame(moment(), 'd')) pubDate.hour(1);
            pubDate = pubDate.format();
        }

        let expDate = null;
        if (this.hasExpirationDate) {
            expDate = this.expiration_date;
            if (!moment.isMoment(expDate)) {
                expDate = moment(expDate);
            }
            expDate = expDate.format('YYYY-MM-DD[T]HH:mm:ss.SSS');
        }

        let exportThis: any = {
            title: this.title,
            content: this.content,
            status: this.status,
            is_headline: this.is_headline,
            thread_id: this.thread._id
        };
        if (pubDate){
            exportThis.publication_date = pubDate;
        }
        if (expDate){
            exportThis.expiration_date = expDate;
        }
        return exportThis;
    }

    create (): boolean {
        if (!this.title){
            notify.info('title.missing');
            return false;
        }
        this.status = ACTUALITES_CONFIGURATION.infoStatus.DRAFT;
        http.post('/actualites/thread/' + this.thread._id + '/info', this.toJson()).then(function () {
            model.infos.sync();
        }.bind(this));
        return true;
    }

    createPending (): boolean {
        if (!this.title){
            notify.info('title.missing');
            return false;
        }
        this.status = ACTUALITES_CONFIGURATION.infoStatus.PENDING;
        http.post('/actualites/thread/' + this.thread._id + '/info/pending', this.toJson()).then(function () {
            model.infos.sync();
        }.bind(this));
        return true;
    }

    createPublished (callback): boolean {
        if (!this.title){
            notify.info('title.missing');
            return false;
        }
        this.status = ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED;
        http.post('/actualites/thread/' + this.thread._id + '/info/published', this.toJson()).then(function (response) {
            if (callback && (typeof (callback) === 'function')) {
                callback(response.data);
            }
            model.infos.sync();
        }.bind(this));
        return true;
    }

    saveModifications () {
        var resourceUrl = '/' + ACTUALITES_CONFIGURATION.applicationName + '/thread/' + this.thread._id + '/info/' + this._id + '/' + ACTUALITES_CONFIGURATION.statusNameFromId(this.status);
        http.put(resourceUrl, this.toJson()).then(function () {
            model.infos.sync();
        });
    }

    save () {
        if (this._id){
            this.saveModifications();
        } else {
            return this.create();
        }
    }

    submit () {
        this.status = ACTUALITES_CONFIGURATION.infoStatus.PENDING;
        http.put('/actualites/thread/' + this.thread._id + '/info/' + this._id + '/submit', { title: this.title })
            .then(function () {
                model.infos.sync();
            });
    }

    unsubmit () {
        this.status = ACTUALITES_CONFIGURATION.infoStatus.DRAFT;
        http.put('/actualites/thread/' + this.thread._id + '/info/' + this._id + '/unsubmit', { title: this.title })
            .then(function () {
                model.infos.sync();
            });
    }

    publish () {
        this.status = ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED;
        http.put('/actualites/thread/' + this.thread._id + '/info/' + this._id + '/publish', { title: this.title, owner: this.owner, username: this.username })
            .then(function () {
                model.infos.sync();
            });
    }

    unpublish (canSkipPendingStatus) {
        if (!canSkipPendingStatus) {
            this.status = ACTUALITES_CONFIGURATION.infoStatus.PENDING;
            http.put('/actualites/thread/' + this.thread._id + '/info/' + this._id + '/unpublish', { title: this.title, owner: this.owner, username: this.username })
                .then(function () {
                    model.infos.sync();
                });
        } else {
            this.unsubmit();
        }
    }

    // @Deprecated
    // trash () {
    //     var resourceUrl = '/' + ACTUALITES_CONFIGURATION.applicationName + '/thread/' + this.thread._id + '/info/' + this._id + '/trash';
    //     var info = this;
    //     http.put(resourceUrl).then(function () {
    //         info.load(thread);
    //     });
    // }

    // @Deprecated
    // restore () {
    //     var resourceUrl = '/' + ACTUALITES_CONFIGURATION.applicationName + '/thread/' + this.thread._id + '/info/' + this._id + '/restore';
    //     var info = this;
    //     http.put(resourceUrl).then(function () {
    //         info.load(thread);
    //     });
    // }

    delete () {
        http.delete('/actualites/thread/' + this.thread_id + '/info/' + this._id).then(function () {
            model.infos.unbind('sync');
            model.infos.sync();
        });
    }

    comment (commentText) {
        var info = this;
        http.put('/actualites/info/' + this._id + '/comment', { info_id: this._id, title: this.title, comment: commentText })
            .then(function (response) {
                let comment = response.data;
                info.comments.push(new Comment({
                    _id: comment.id,
                    owner: model.me.userId,
                    username: model.me.username,
                    comment: commentText,
                    created: moment(),
                    modified: moment()
                }));
            });
    }

    deleteComment (comment, index) {
        var info = this;
        http.delete('/actualites/info/' + this._id + '/comment/' + comment._id).then(function () {
            info.comments.splice(index, 1);
        });
    }

    allow (action) {
        if (action === 'view'){
            //Hide when I don't have publish rights and I'm not author if : the info was submitted or the info is outside its lifespan
            return (
                    this.status === ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED &&
                    !(this.hasPublicationDate && moment().isBefore(Utils.getDateAsMoment(this.publication_date))) &&
                    !(this.hasExpirationDate && moment().isAfter(Utils.getDateAsMoment(this.expiration_date).add(1, 'days')))
                )
                || this.owner === model.me.userId
                || this.thread.myRights.publish;

        }
        if (action === 'comment') {
            return this.myRights.comment && (this.status === ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED || this.status === ACTUALITES_CONFIGURATION.infoStatus.PENDING);
        }
        if (action === 'edit' || action === 'share'){
            return this.thread.myRights.publish || (model.me.userId === this.owner && (this.status === ACTUALITES_CONFIGURATION.infoStatus.DRAFT || this.status));
        }
        if (action === 'viewShare') {
            return false;
        }
        if (action === 'unpublish') {
            return this.status === ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED && this.thread.myRights.publish && !(model.me.userId === this.owner);
        }
        if (action === 'unsubmit') {
            return (this.status === ACTUALITES_CONFIGURATION.infoStatus.PENDING && (this.thread.myRights.publish || model.me.userId === this.owner)) ||
                (this.status === ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED && this.thread.myRights.publish && model.me.userId === this.owner);
        }
        if (action === 'publish') {
            return (this.status === ACTUALITES_CONFIGURATION.infoStatus.DRAFT || this.status === ACTUALITES_CONFIGURATION.infoStatus.PENDING) && this.thread.myRights.publish;
        }
        if (action === 'submit') {
            return (this.status === ACTUALITES_CONFIGURATION.infoStatus.DRAFT) && !this.thread.myRights.publish;
        }
        if (action === 'remove') {
            return ((this.status === ACTUALITES_CONFIGURATION.infoStatus.DRAFT || this.status === ACTUALITES_CONFIGURATION.infoStatus.PENDING) && model.me.userId === this.owner) ||
                this.thread.myRights.manager || (this.thread.myRights.publish && model.me.userId === this.owner);
        }
    }
}