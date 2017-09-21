import { model, moment, _ } from 'entcore';
import { Mix } from 'entcore-toolkit';
import http from 'axios';
import { ACTUALITES_CONFIGURATION } from '../configuration';
import { Thread, Info, Event, Comment } from './index';

export const buildModel = function() {

    model.makeModels([
        Thread,
        Info,
        Event,
        Comment
    ]);

    this.latestThread = new Thread({
        type: ACTUALITES_CONFIGURATION.threadTypes.latest,
        title: ACTUALITES_CONFIGURATION.threadTypes.latest
    });

    this.thisWeek = function (datas) {
        return _.filter(datas, function (info) {
            let infoMoment = moment(
                info.publication_date || info.modified, ACTUALITES_CONFIGURATION.momentFormat
            );
            return infoMoment.week() === moment().week() && infoMoment.year() === moment().year() && info.status > ACTUALITES_CONFIGURATION.infoStatus.PENDING;
        });
    };

    this.beforeThisWeek = function (datas) {
        return _.filter(datas, function (info) {
            let infoMoment = moment(
                info.publication_date || info.modified, ACTUALITES_CONFIGURATION.momentFormat
            );
            return (infoMoment.year() !== moment().year() || infoMoment.week() !== moment().week()) && info.status > ACTUALITES_CONFIGURATION.infoStatus.PENDING;
        });
    };

    this.pending = function (datas) {
        return _.where(datas, {status : ACTUALITES_CONFIGURATION.infoStatus.PENDING});
    };

    this.draft = function (datas) {
        return _.where(datas, {status : ACTUALITES_CONFIGURATION.infoStatus.DRAFT});
    };

    this.headline = function (datas) {
        return _.where(datas, {'is_headline' : true});
    };

    this.syncAll = function(){
        this.threads.all = [];
        this.infos.all = [];
        this.threads.sync();
        this.infos.sync();
    };

    model.collection(Thread, {
        behaviours: 'actualites',
        sync: function(){
            http.get('/actualites/threads').then(function(result){
                this.load(result.data);
                this.map(function (thred) {
                    return thred.setDisplayName();
                });
                this.trigger('sync');
                model.trigger('counter:sync');
            }.bind(this));
        },
        removeSelection: function (){
            let all = this.selection().length;
            this.selection().forEach(function(thread){
                thread.remove(function(){
                    all --;
                    if (all === 0){
                        model.syncAll();
                    }
                });
            });
        },
        mapInfos : function () {
            this.each(function (thread) {
                thread.infos.all = model.infos.where({thread_id : thread._id});
                thread.infos.thisWeekInfos = model.thisWeek(thread.infos.all);
                thread.infos.beforeThisWeekInfos = model.beforeThisWeek(thread.infos.all);
                thread.infos.pendings = model.pending(thread.infos.all);
                thread.infos.drafts = model.draft(thread.infos.all);
                thread.infos.headlines = model.headline(thread.infos.all);
            });
        },
        writable: function (){
            return this.all.filter(function(thread){
                return thread.myRights.contrib;
            });
        },
        editable: function (){
            return this.all.filter(function(thread){
                return thread.myRights.editThread;
            });
        }
    });

    model.collection(Info, {
        unsubmit: function () {
            this.selection().forEach(function(info){
                info.unsubmit();
            });
            //remove drafts from other users
            this.all = this.reject(function(info){
                return info.status === ACTUALITES_CONFIGURATION.infoStatus.DRAFT && info.owner !== model.me.userId;
            });
        },
        unpublish: function () {
            this.selection().forEach(function(info){
                info.unpublish();
            });
        },
        publish: function () {
            this.selection().forEach(function(info){
                info.publish();
            });
        },
        submit: function () {
            this.selection().forEach(function(info){
                info.submit();
            });
        },
        remove: function () {
            this.selection().forEach(function(info){
                info.delete();
            });
            this.removeSelection();
        },
        thisWeekInfos: [],
        beforeThisWeekInfos: [],
        pendings : [],
        drafts : [],
        sync: function(){
            http.get('/actualites/infos').then(function(response){
                let infos = response.data;
                let that = this;
                this.all = [];
                infos.forEach(function(info){
                    let thread = model.threads.find(function(item){
                        return item._id === info.thread_id;
                    });
                    if (!thread){
                        thread = new Thread();
                        thread._id = info.thread_id;
                        thread.title = info.thread_title;
                        thread.icon = info.thread_icon;
                        thread.shared = [];
                        model.threads.push(thread, false);
                    }
                    info.thread = thread;
                    if (info.comments !== '[null]' || info.comments !== null){
                        info.comments = JSON.parse(info.comments);
                    } else {
                        info.comments = undefined;
                    }
                    if (info.publication_date) {
                        info.publication_date = info.publication_date.split('.')[0];
                        info.hasPublicationDate = true;
                    } else {
                        info.publication_date = moment();
                    }
                    if (info.expiration_date) {
                        info.expiration_date = info.expiration_date.split('.')[0];
                        info.hasExpirationDate = true;
                    } else {
                        info.expiration_date = moment();
                    }
                    info.created = info.created.split('.')[0];
                    info.modified = info.modified.split('.')[0];
                    info.expanded = false;
                    info.displayComments = false;
                    that.push(info, false);
                });
                this.thisWeekInfos = model.thisWeek(this.all);
                this.beforeThisWeekInfos = model.beforeThisWeek(this.all);
                this.pendings = model.pending(this.all);
                this.drafts = model.draft(this.all);
                this.headlines = model.headline(this.all);
                this.trigger('sync');
                model.trigger('counter:sync');
            }.bind(this));
        },
        behaviours: 'actualites'
    });
}