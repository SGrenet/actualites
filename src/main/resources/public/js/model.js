/* Constants */

var getDateAsMoment = function(date){
	var momentDate;
	if(moment.isMoment(date)) {
		momentDate = date;
	}
	else if (date.$date) {
		momentDate = moment(date.$date);
	} else if (typeof date === "number"){
		momentDate = moment.unix(date);
	} else {
		momentDate = moment(date);
	}
	return momentDate;
};

var ACTUALITES_CONFIGURATION = {
	applicationName: 'actualites',
	infosCollectionName: 'infos',
	threadsCollectionName: 'threads',
	infoStatus: {
		DRAFT: 1,
		PENDING: 2,
		PUBLISHED: 3,
		TRASH: 0
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
	momentFormat: "YYYY-MM-DDTHH:mm:ss",
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

function Comment(){

}

function Info(data){
    this.collection(Comment);
    this.newComment = new Comment();
	if(data){
		this.preview = '<p>' + $('<div>' + data.content + '</div>').text().substring(0, 70) + '...' + '</p>';
	}
	else{
		this.status = ACTUALITES_CONFIGURATION.infoStatus.DRAFT;
	}

	if(data && data.comments){
		this.comments.load(data.comments);
	}
	if(!data){
		this.publication_date = new Date();
	}
}

Info.prototype.toJSON = function(){
	var pubDate = null;
	if(this.hasPublicationDate) {
		pubDate = this.publication_date;
		if(!moment.isMoment(pubDate)) {
			pubDate = moment(pubDate);
		}
        if(!pubDate.isSame(moment(), 'd'))
		      pubDate.hour(1);
		pubDate = pubDate.format();
	}

	var expDate = null;
	if(this.hasExpirationDate) {
		expDate = this.expiration_date;
		if(!moment.isMoment(expDate)) {
			expDate = moment(expDate);
		}
		expDate = expDate.toISOString();
	}

	var exportThis = {
		title: this.title,
		content: this.content,
		status: this.status,
		is_headline: this.is_headline,
		thread_id: this.thread._id
	};
	if(pubDate){
		exportThis.publication_date = pubDate;
	}
	if(expDate){
		exportThis.expiration_date = expDate;
	}
	return exportThis;
};

Info.prototype.create = function(){
	if(!this.title){
		notify.info('title.missing');
		return false;
	}
	this.status = ACTUALITES_CONFIGURATION.infoStatus.DRAFT;
	http().postJson('/actualites/thread/' + this.thread._id + '/info', this).done(function(response){
		model.infos.sync();
	}.bind(this));
	return true;
};

Info.prototype.createPending = function(){
	if(!this.title){
		notify.info('title.missing');
		return false;
	}
	this.status = ACTUALITES_CONFIGURATION.infoStatus.PENDING;
	http().postJson('/actualites/thread/' + this.thread._id + '/info/pending', this).done(function(response){
		model.infos.sync();
	}.bind(this));
	return true;
};

Info.prototype.createPublished = function(){
	if(!this.title){
		notify.info('title.missing');
		return false;
	}
	this.status = ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED;
	http().postJson('/actualites/thread/' + this.thread._id + '/info/published', this).done(function(response){
		model.infos.sync();
	}.bind(this));
	return true;
};

Info.prototype.saveModifications = function(){
	var resourceUrl = '/' + ACTUALITES_CONFIGURATION.applicationName + '/thread/' + this.thread._id + '/info/' + this._id + '/' + ACTUALITES_CONFIGURATION.statusNameFromId(this.status);
	http().putJson(resourceUrl, this).done(function(){
		model.infos.sync();
	});
};

Info.prototype.save = function(){
	if(this._id){
		this.saveModifications();
	}
	else{
		return this.create();
	}
};


Info.prototype.submit = function(){
	this.status = ACTUALITES_CONFIGURATION.infoStatus.PENDING;
	http().putJson('/actualites/thread/' + this.thread._id + '/info/' + this._id + '/submit', { title: this.title });
};

Info.prototype.unsubmit = function(){
	this.status = ACTUALITES_CONFIGURATION.infoStatus.DRAFT;
	http().putJson('/actualites/thread/' + this.thread._id + '/info/' + this._id + '/unsubmit', { title: this.title });
};

Info.prototype.publish = function(){
	this.status = ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED;
	http().putJson('/actualites/thread/' + this.thread._id + '/info/' + this._id + '/publish', { title: this.title, owner: this.owner, username: this.username });
};

Info.prototype.unpublish = function(canSkipPendingStatus){
	var that = this;
	if(!canSkipPendingStatus) {
		this.status = ACTUALITES_CONFIGURATION.infoStatus.PENDING;
		http().putJson('/actualites/thread/' + this.thread._id + '/info/' + this._id + '/unpublish', { title: this.title, owner: this.owner, username: this.username });
	}
	else {
		this.unsubmit();
	}
};

Info.prototype.trash = function(){
	var resourceUrl = '/' + ACTUALITES_CONFIGURATION.applicationName + '/thread/' + this.thread._id + '/info/' + this._id + '/trash';
	var info = this;
	http().put(resourceUrl).done(function(){
		info.load(thread);
	});
}

Info.prototype.restore = function(){
	var resourceUrl = '/' + ACTUALITES_CONFIGURATION.applicationName + '/thread/' + this.thread._id + '/info/' + this._id + '/restore';
	var info = this;
	http().put(resourceUrl).done(function(){
		info.load(thread);
	});
}

Info.prototype.delete = function(){
	http().delete('/actualites/thread/' + this.thread_id + '/info/' + this._id).done(function(){
		model.infos.unbind('sync');
		model.infos.sync();
	});
};


Info.prototype.comment = function(commentText){
	var info = this;
	http().putJson('/actualites/info/' + this._id + '/comment', { info_id: this._id, title: this.title, comment: commentText }).done(function(comment){
		info.comments.push(new Comment({
			_id: comment.id,
			owner: model.me.userId,
			username: model.me.username,
			comment: commentText,
			created: moment(),
			modified: moment()
		}));
	});
};

Info.prototype.deleteComment = function(comment, index){
	var info = this;
	http().delete('/actualites/info/' + this._id + '/comment/' + comment._id).done(function(comment){
		info.comments.splice(index, 1);
	});
};

Info.prototype.allow = function(action){
	if(action === 'view'){
		//Hide when I don't have publish rights and I'm not author if : the info was submitted or the info is outside its lifespan
		return (
				this.status === ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED &&
				!(this.hasPublicationDate && moment().isBefore(getDateAsMoment(this.publication_date))) &&
				!(this.hasExpirationDate && moment().isAfter(getDateAsMoment(this.expiration_date).add(1, 'days')))
			)
			|| this.owner === model.me.userId
			|| this.thread.myRights.publish;

	}
	if(action === 'comment'){
		return this.myRights.comment && (this.status === ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED || this.status === ACTUALITES_CONFIGURATION.infoStatus.PENDING);
	}
	if(action === 'edit' || action === 'share'){
		return this.thread.myRights.publish || (model.me.userId === this.owner && (this.status === ACTUALITES_CONFIGURATION.infoStatus.DRAFT || this.status))
	}
	if(action === 'viewShare'){
		return false;
	}
	if(action === 'unpublish'){
		return this.status === ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED && this.thread.myRights.publish && !(model.me.userId === this.owner);
	}
	if(action === 'unsubmit'){
		return (this.status === ACTUALITES_CONFIGURATION.infoStatus.PENDING && (this.thread.myRights.publish || model.me.userId === this.owner)) ||
			(this.status === ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED && this.thread.myRights.publish && model.me.userId === this.owner);
	}
	if(action === 'publish'){
		return (this.status === ACTUALITES_CONFIGURATION.infoStatus.DRAFT || this.status === ACTUALITES_CONFIGURATION.infoStatus.PENDING) && this.thread.myRights.publish;
	}
	if(action === 'submit'){
		return (this.status === ACTUALITES_CONFIGURATION.infoStatus.DRAFT) && !this.thread.myRights.publish;
	}
	if(action === 'remove'){
		return ((this.status === ACTUALITES_CONFIGURATION.infoStatus.DRAFT || this.status === ACTUALITES_CONFIGURATION.infoStatus.PENDING) && model.me.userId === this.owner) ||
			this.thread.myRights.manager || (this.thread.myRights.publish && model.me.userId === this.owner)
	}
};

function Thread(){
	// type (optionnal, for static threads)
	// title
	// icon
	// mode
	// order
	// published
}

Thread.prototype.load = function(data){
	var resourceUrl = '/actualites/thread/' + this._id;
	if (data !== undefined) {
		resourceUrl = '/actualites/thread/' + data._id;
	}

	var that = this;
	http().get(resourceUrl).done(function(content){
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

		that.trigger('change');
	}.bind(this))
};

Thread.prototype.createThread = function(){
	this.mode = this.mode || ACTUALITES_CONFIGURATION.threadMode.SUBMIT;

	http().postJson('/actualites/thread', this).done(function(e){
		model.syncAll();
	}.bind(this));
};

Thread.prototype.toJSON = function(){
	if(this.icon){
		return {
			mode: this.mode,
			title: this.title,
			icon: this.icon
		}
	}
	else{
		return {
			mode: this.mode,
			title: this.title
		}
	}
};

Thread.prototype.saveModifications = function(){
	this.mode = this.mode || ACTUALITES_CONFIGURATION.threadMode.SUBMIT;
	http().putJson('/actualites/thread/' + this._id, this).done(function(){
		model.infos.sync();
	});
};

Thread.prototype.save = function(){
	if(this._id){
		this.saveModifications();
	}
	else{
		this.createThread();
	}
};

Thread.prototype.remove = function(callback){
	http().delete('/actualites/thread/' + this._id).done(function(){
		if(typeof callback === 'function'){
			callback();
		}
		else{
			model.infos.sync();
		}
	});
};

Thread.prototype.canPublish = function(){
	return this.myRights.publish !== undefined;
};

model.build = function(){
	this.makeModels([Info, Thread, Comment]);

	this.latestThread = new Thread({
		type: ACTUALITES_CONFIGURATION.threadTypes.latest,
		title: ACTUALITES_CONFIGURATION.threadTypes.latest
	});

	this.syncAll = function(){
		this.threads.all = [];
		this.infos.all = [];
		this.threads.sync();
		this.infos.sync();
	};

	this.collection(Thread, {
		behaviours: 'actualites',
		sync: function(){
			http().get('/actualites/threads').done(function(result){
				result = _.filter(result, function(thread){
					return !model.threads.findWhere({ _id: thread._id });
				});
				this.addRange(result);
			}.bind(this));
		},
		removeSelection: function(){
			var all = this.selection().length;
			this.selection().forEach(function(thread){
				thread.remove(function(){
					all --;
					if(all === 0){
						model.syncAll();
					}
				});
			});
		},
		writable: function(){
			return this.filter(function(thread){
				return thread.myRights.contrib;
			});
		},
		editable: function(){
			return this.filter(function(thread){
				return thread.myRights.editThread;
			});
		}
	});

	this.collection(Info, {
		thisWeek: function(){
		    return model.infos.filter(function (info) {
		        var infoMoment = moment(
					info.publication_date || info.created, ACTUALITES_CONFIGURATION.momentFormat
				);
				return infoMoment.week() === moment().week() && infoMoment.year() === moment().year();
			});
		},
		beforeThisWeek: function(){
		    return model.infos.filter(function (info) {
		        var infoMoment = moment(
					info.publication_date || info.created, ACTUALITES_CONFIGURATION.momentFormat
				);
		        return infoMoment.year() !== moment().year() || infoMoment.week() !== moment().week();
			});
		},
		unsubmit: function(){
			this.selection().forEach(function(info){
				info.unsubmit();
			});
			//remove drafts from other users
			this.all = this.reject(function(info){
				return info.status === ACTUALITES_CONFIGURATION.infoStatus.DRAFT && info.owner !== model.me.userId;
			});
		},
		unpublish: function(){
			this.selection().forEach(function(info){
				info.unpublish();
			});
		},
		publish: function(){
			this.selection().forEach(function(info){
				info.publish();
			});
		},
		submit: function(){
			this.selection().forEach(function(info){
				info.submit();
			});
		},
		remove: function(){
			this.selection().forEach(function(info){
				info.delete();
			});
			this.removeSelection();
		},
		thisWeekInfos: [],
		beforeThisWeekInfos: [],
		sync: function(){
			http().get('/actualites/infos').done(function(infos){
				var that = this;
				this.all = [];
				infos.forEach(function(info){
					var thread = model.threads.find(function(item){
						return item._id === info.thread_id;
					});
					if(!thread){
						thread = new Thread();
						thread._id = info.thread_id;
						thread.title = info.thread_title;
						thread.icon = info.thread_icon;
						thread.shared = [];
						model.threads.push(thread, false);
					}
					info.thread = thread;
					if(info.comments !== "[null]"){
						info.comments = JSON.parse(info.comments);
					}
					else {
						info.comments = undefined;
					}
					if (info.publication_date) {
						info.publication_date = info.publication_date.split('.')[0];
						info.hasPublicationDate = true;
					}
					if (info.expiration_date) {
						info.expiration_date = info.expiration_date.split('.')[0];
						info.hasExpirationDate = true;
					}
					info.created = info.created.split('.')[0];
					info.modified = info.modified.split('.')[0];
					that.push(info, false);
				});
				this.thisWeekInfos = this.thisWeek();
				this.beforeThisWeekInfos = this.beforeThisWeek();
				this.trigger('sync');
			}.bind(this))
		},
		behaviours: 'actualites'
	})
};
