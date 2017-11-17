import { ng, template, idiom as lang, moment, _, $, model } from 'entcore';
import { ACTUALITES_CONFIGURATION } from './configuration';

import { Info, Thread, Comment, Utils } from './model';

export const actualiteController = ng.controller('ActualitesController',
    ['$scope', 'route', '$location',
        ($scope, route, $location) => {

            template.open('info-read', 'info-read');

            this.initialize = function(){
                $scope.notFound = false;
                $scope.$location = $location;
                $scope.ACTUALITES_CONFIGURATION = ACTUALITES_CONFIGURATION;
                $scope.displayedInfos = null;
                $scope.infoTimeline = null;

                model.infos.on('sync', function () {
                    model.infos.deselectAll();
                    $scope.$apply();
                });

                route({
                    // Routes viewThread, viewInfo adn viewComment are used by notifications
                    viewThread: function(params){
                        var initThreadView = function () {
                            var aThread = model.threads.findWhere({_id : parseInt(params.threadId)});
                            if (aThread !== undefined) {
                                $scope.notFound = false;
                                $scope.displayedInfos = aThread.infos;
                                model.infos.deselectAll();
                            } else {
                                $scope.notFound = true;
                                template.open('error', '404');
                            }
                            $scope.$apply();
                        };
                        model.infos.one('sync', function () {
                            model.threads.mapInfos();
                        });
                        model.threads.one('sync', function(){
                            initThreadView();
                        });
                        if (model.threads.all.length === 0) {
                            model.threads.sync();
                            model.infos.sync();
                        } else {
                            initThreadView();
                        }
                    },
                    viewInfo: function(params){
                        var initInfoSync = function () {
                            model.threads.mapInfos();
                            $scope.info = undefined;
                            $scope.info = model.infos.find(function(info){
                                return info._id === parseInt(params.infoId);
                            });
                            if ($scope.info !== undefined) {
                                if ($scope.info.allow('view')) {
                                    $scope.notFound = false;
                                    $scope.display.infoRead = true;
                                }
                                else {
                                    $scope.display.infoRead = true;
                                    $scope.notFound = true;
                                    template.open('error', '401');
                                }
                            }
                            else {
                                $scope.display.infoRead = true;
                                $scope.notFound = true;
                                template.open('error', '404');
                            }
                            if (params.threadId !== undefined) {
                                var thread = model.threads.findWhere({id : params.threadId});
                                if (thread !== undefined) {
                                    $location.path('/view/thread/' + params.threadId);
                                } else {
                                    $location.path('/default');
                                }
                            } else {
                                $location.path('/default');
                            }
                            $location.replace();
                            $scope.$apply();
                        };
                        var initThreadSync = function () {
                            if (params.threadId !== undefined) {
                                var aThread = model.threads.findWhere({_id : parseInt(params.threadId)});
                                if (aThread !== undefined) {
                                    $scope.notFound = false;
                                    $scope.displayedInfos = aThread.infos;
                                    model.infos.deselectAll();
                                } else {
                                    $scope.notFound = true;
                                    template.open('error', '404');
                                }
                            }
                        };
                        model.infos.one('sync', function () {
                            initInfoSync();
                        });
                        model.threads.one('sync', function(){
                            model.infos.sync();
                            initThreadSync();
                        });
                        if (model.threads.all.length === 0) {
                            model.threads.sync();
                        } else {
                            initThreadSync();
                            initInfoSync();
                        }
                    },
                    main: function(){
                        model.infos.unbind('sync');
                        model.threads.unbind('sync');
                        $scope.currentInfo = new Info();
                        template.open('main', 'main');
                        model.infos.one('sync', function(){
                            model.threads.mapInfos();
                            $scope.$apply();
                        });
                        $scope.displayedInfos = model.infos;
                        model.infos.deselectAll();
                    },
                    admin: function(){
                        model.infos.unbind('sync');
                        model.threads.unbind('sync');
                        template.open('main', 'threads-view');
                        model.on('counter:sync', function () {
                            if (model.threads.all.length > 0 && model.infos.all.length > 0) {
                                model.threads.map(function (thread) {
                                    return thread.counterInfo = $scope.countInfoByThread(thread._id);
                                });
                                $scope.$apply();
                            }
                        });
                    },
                    viewTimeline : function (param) {
                        var initTimeline = function () {
                            $scope.infoTimeline = model.infos.findWhere({_id : parseInt(param.infoId)});
                            if ($scope.infoTimeline === undefined) {
                                $scope.notFound = true;
                                template.open('error', '404');
                            } else {
                                $scope.infoTimeline.events.sync();
                                $scope.infoTimeline.events.deselectAll();
                            }
                            template.open('main', 'info-timeline');
                            $scope.$apply();
                        };
                        if (model.infos.all.length === 0) {
                            model.infos.one('sync', function () {
                                model.threads.mapInfos();
                                initTimeline();
                            });
                        } else {
                            initTimeline();
                        }
                    }
                });

                // Model
                $scope.template = template;
                $scope.me = model.me;
                $scope.threads = model.threads;

                // Variables
                $scope.infos = model.infos;
                $scope.currentInfo = new Info();
                $scope.display = {
                    emptyThread: false,
                    showCommentsPanel: false,
                    showComments: false,
                    limit: 8
                };

                $scope.startDate = new Date();
                $scope.appPrefix = 'actualites';
                $scope.currentThread = {};

                // View initialization
                template.open('threadsView', 'threads-view');
                template.open('comments', 'info-comments');
                template.open('infoEdit', 'info-edit');
                template.open('infoView', 'info-view');
                template.open('main', 'main');
            };

            $scope.checkMinExpirationDate = function(info) {
                if (!info.publication_date || !info.expiration_date)
                    return;
                var publicationDateMin = moment(info.publication_date).add('day', 1);
                var expirationDate = moment(info.expiration_date);
                if (expirationDate.isBefore(publicationDateMin)){
                    info.expiration_date = publicationDateMin.toISOString();
                }
            };

            $scope.increaseLimit = function(){
                $scope.display.limit += 5;
            };

            $scope.openMainPage = function(){
                $location.path('/default');
            };

            $scope.allowForSelection = function(action){
                return _.filter(model.infos.selection(), function(info){
                    return !info.allow(action);
                }).length === 0;
            };

            $scope.editInfo = function(info){
                model.infos.deselectAll();
                info.edit = true;
                info.expanded = true;
            };

            $scope.createInfo = function(){
                $scope.currentInfo = new Info();
                if ($scope.currentThread !== undefined
                    && !_.isEmpty($scope.currentThread)) {
                    $scope.currentInfo.thread = $scope.currentThread;
                }
                template.open('createInfo', 'info-create');
            };

            $scope.showShareInfo = function() {
                $scope.display.showInfoSharePanel = true;
            };

            $scope.cancelShareInfo = function() {
                $scope.display.showInfoSharePanel = false;
            };

            $scope.saveDraft = function(){
                if ($scope.currentInfo.save()){
                    template.close('createInfo');
                    $scope.currentInfo = new Info();
                }
            };

            $scope.saveSubmitted = function(){
                if ($scope.currentInfo.createPending()){
                    template.close('createInfo');
                    $scope.currentInfo = new Info();
                }
            };

            var displaySharePopUp = function (data) {
                model.infos.one('sync', function () {
                    var info = model.infos.findWhere({ _id : data.id });
                    if (info !== undefined){
                        info.selected = true;
                    }
                    $scope.display.showInfoSharePanel = true;
                    $scope.$apply();
                });
            };

            $scope.savePublished = function(){
                if ($scope.currentInfo.createPublished(displaySharePopUp)){
                    template.close('createInfo');
                    $scope.currentInfo = new Info();
                }
            };

            $scope.cancelCreateInfo = function(){
                template.close('createInfo');
                $scope.currentInfo = new Info();
            };

            $scope.getState = function(info){
                if (info === undefined) return;
                if (info.status === ACTUALITES_CONFIGURATION.infoStatus.PUBLISHED){
                    if (info.hasPublicationDate && moment().isBefore(Utils.getDateAsMoment(info.publication_date)) ){
                        // label (A venir)
                        return 'actualites.edition.status.4' ;
                    }
                    if (info.hasExpirationDate && moment().isAfter(Utils.getDateAsMoment(info.expiration_date).add(1, 'days')) ){
                        // label (Expiree)
                        return 'actualites.edition.status.5' ;
                    }
                    if (info.owner !== model.me.userId){
                        return 'actualites.edition.status.empty';
                    }
                }
                return 'actualites.edition.status.' + info.status;
            };

            /* Comments */
            $scope.hasInfoComments = function(info){
                return (info.comments !== undefined && info.comments.length > 0);
            };

            $scope.postInfoComment = function(info){
                if ((!_.isString(info.newComment.comment)) || (info.newComment.comment.trim() === '')) {
                    return;
                }
                info.comment(info.newComment.comment);
                info.newComment = new Comment();
            };

            // Threads
            $scope.threadsView = function(){
                $location.path('/admin');
            };

            $scope.newThreadView = function(){
                $scope.currentThread = new Thread();
                template.open('main', 'thread-edit');
            };

            $scope.editSelectedThread = function(){
                $scope.currentThread = model.threads.selection()[0];
                template.open('main', 'thread-edit');
            };

            $scope.saveThread = function(){
                $scope.currentThread.save();
                template.open('main', 'threads-view');
                $scope.currentThread = undefined;
            };

            $scope.cancelEditThread = function(){
                $scope.currentThread = undefined;
                template.open('main', 'threads-view');
            };

            /* Util */
            $scope.formatDate = function(date){
                var momentDate = Utils.getDateAsMoment(date);
                return moment(momentDate).calendar();
            };

            $scope.formatDateLocale = function(date){
                if (moment(date) > moment().add(-1, 'days').startOf('day') && moment(date) < moment().endOf('day'))
                    return moment(date).calendar();

                if (moment(date) > moment().add(-7, 'days').startOf('day') && moment(date) < moment().endOf('day'))
                    return moment(date).fromNow(); //this week

                return moment(date).format('L');
            };

            $scope.hasParam = function (param) {
                return Object.prototype.hasOwnProperty.call($location.search(), param);
            };

            $scope.findParam = function (key) {
                if ($scope.hasParam(key)) {
                    return ($location.search())[key];
                } else {
                    return false;
                }
            };

            $scope.oneRight = function(right) {
                return model.threads.find(function(thread){
                    return thread.myRights[right];
                });
            };

            $scope.filterByThreads = function(unpublished){
                return function(info){
                    var _b = false;
                    switch ($scope.findParam('filter')) {
                        case ACTUALITES_CONFIGURATION.infoFilter.PUBLISHED :
                            _b = info.status > $scope.getStatusNumber(ACTUALITES_CONFIGURATION.infoFilter.PENDING);
                            break;
                        case ACTUALITES_CONFIGURATION.infoFilter.HEADLINE :
                            _b = (info.status > $scope.getStatusNumber(ACTUALITES_CONFIGURATION.infoFilter.PENDING)) && info.is_headline;
                            break;
                        case ACTUALITES_CONFIGURATION.infoFilter.DRAFT :
                            _b = (info.status === $scope.getStatusNumber(ACTUALITES_CONFIGURATION.infoFilter.DRAFT));
                            break;
                        case ACTUALITES_CONFIGURATION.infoFilter.PENDING :
                            _b = (info.status === $scope.getStatusNumber(ACTUALITES_CONFIGURATION.infoFilter.PENDING));
                            break;
                        default :
                            _b = (unpublished && info.status <= $scope.getStatusNumber(ACTUALITES_CONFIGURATION.infoFilter.PENDING))
                                || (!unpublished && info.status > $scope.getStatusNumber(ACTUALITES_CONFIGURATION.infoFilter.PENDING));
                    }
                    return _b;
                };
            };

            $scope.getInfoDate = function(info){
                if (info.publication_date !== undefined && info.publication_date !== null && typeof info.publication_date === 'string') {
                    return $scope.formatDate(info.publication_date);
                } else {
                    return $scope.formatDateLocale(info.modified);
                }
            };

            $scope.getInfosThreadsSelected = function () {
                if (model.threads.selection().length > 0) {
                    var nb = 0;
                    for (var i = 0; i < model.threads.selection().length; i++) {
                        nb += model.threads.selection()[i].infos.all.length;
                    }
                    return nb;
                }
            };

            $scope.getStatusNumber = function (status) {
                return ACTUALITES_CONFIGURATION.infoStatus[status];
            };

            $scope.countByStatus = function (datas) {
                if (datas === undefined || datas === null) return;
                var state = $scope.findParam('filter');
                var _number = 0;
                switch (state) {
                    case ACTUALITES_CONFIGURATION.infoFilter.HEADLINE :
                        _number = _.where(datas, {is_headline : true}).length;
                        break;
                    case false :
                        _number = datas.length;
                        break;
                    default :
                        _number = _.where(datas, {status : $scope.getStatusNumber(state)}).length;
                }
                return _number;
            };

            $scope.countInfoByThread = function (threadId) {
                return model.infos.where({thread_id : threadId}).length;
            };

            $scope.canDeleteComment = function (info, comment) {
                let canDeleteComment = false ;

                if (model.me.userId === comment.owner) {
                    // The owner of the comment has the right to delete it.
                    canDeleteComment = true ;
                } else if (model.me.userId === info.owner){
                    // The owner of the news has the right to delete it.
                    canDeleteComment = true ;
                } else if (info.thread.myRights.publish !== undefined){
                    // A person who can contribute to the thread can delete the comment.
                    canDeleteComment = true ;
                }
                return canDeleteComment;
            };

            $scope.redirect = function(path) {
                $location.path(path);
            };

            $scope.translate = function (key) {
                return lang.translate(key);
            };

            $scope.getColorByEvent = function (event) {
                var color;
                switch (event) {
                    case 'PENDING' : {
                        color = 'yellow';
                    }
                        break;
                    case 'SUBMIT' : {
                        color = 'pink';
                    }
                        break;
                    case 'CREATE_AND_PENDING' : {
                        color = 'cyan';
                    }
                        break;
                    case 'CREATE_AND_PUBLISH' : {
                        color = 'indigo';
                    }
                        break;
                    case 'UPDATE' : {
                        color = 'green';
                    }
                        break;
                    case 'PUBLISH' : {
                        color = 'purple';
                    }
                        break;
                    case 'UNPUBLISH' : {
                        color = 'red';
                    }
                        break;
                    case 'DRAFT' :
                    default : {
                        color = 'orange';
                    }
                }
                return color;
            };

            $scope.restoreRevision = function (revision) {
                if (revision !== undefined) {
                    $scope.infoTimeline.title = revision.title;
                    $scope.infoTimeline.content = revision.content;
                    $scope.infoTimeline.save();
                    model.infos.sync();
                }
            };

            $scope.compareRevisions = function () {
                if ($scope.infoTimeline.events.selection().length === 2) {
                    var versions = $scope.infoTimeline.events.selection();
                    $scope.comparedVersions = {
                        originals : {
                            left : versions[1],
                            right : versions[0]
                        },
                        compared : $scope.comparison(versions[1], versions[0])
                    };
                    template.open('main', 'compare-info');
                }
            };

            $scope.goBackToTimeline = function () {
                $scope.infoTimeline.events.deselectAll();
                template.open('main', 'info-timeline');
            };

            /**
             * When selecting a thread, change the currentThread and
             * the currentInfo.thread to the one selected
             * @param thread selected
             */
            $scope.switchSelectThread = function (thread) {
              if (thread !== undefined) {
                  $scope.currentThread = thread;
                  $scope.currentInfo.thread = thread;
              }
            };

            function findSequence(x, y){
                var c = [],
                    diag,
                    i,
                    j,
                    latch,
                    lcs = [],
                    left,
                    row = [],
                    s;

                if (x.length < y.length){
                    s = x;
                    x = y;
                    y = s;
                }

                for (j = 0; j < y.length; row[j++] = 0);
                for (i = 0; i < x.length; i++) {
                    c[i] = row = row.slice();
                    for (diag = 0, j = 0; j < y.length; j++, diag = latch) {
                        latch = row[j];
                        if ((x[i].innerText || x[i].textContent) === (y[j].innerText || y[j].textContent)) {
                            row[j] = diag + 1;
                        } else {
                            left = row[j - 1] || 0;
                            if (left > row[j]) {
                                row[j] = left;
                            }
                        }
                    }
                }
                i--;
                j--;

                while (i > -1 && j > -1) {
                    switch (c[i][j]) {
                        default: j--;
                            lcs.unshift(x[i]);
                        case (i && c[i - 1][j]): i--;
                            continue;
                        case (j && c[i][j - 1]): j--;
                    }
                }
                return lcs;
            }

            function findTextSequence(x, y){
                var c = [],
                    diag,
                    i,
                    j,
                    latch,
                    lcs = [],
                    left,
                    row = [],
                    s;

                if (x.length < y.length) {
                    s = x;
                    x = y;
                    y = s;
                }

                for (j = 0; j < y.length; row[j++] = 0);
                for (i = 0; i < x.length; i++) {
                    c[i] = row = row.slice();
                    for (diag = 0, j = 0; j < y.length; j++, diag = latch){
                        latch = row[j];
                        if (x[i] === y[j]) {
                            row[j] = diag + 1;
                        } else {
                            left = row[j - 1] || 0;
                            if (left > row[j]) {
                                row[j] = left;
                            }
                        }
                    }
                }
                i--;
                j--;

                while (i > -1 && j > -1) {
                    switch (c[i][j]) {
                        default: j--;
                            lcs.unshift(x[i]);
                        case (i && c[i - 1][j]): i--;
                            continue;
                        case (j && c[i][j - 1]): j--;
                    }
                }
                return lcs;
            }

            function similar(a, b){
                var aText = a.innerText || a.textContent;
                var bText = b.innerText || b.textContent;
                var textSequence = findTextSequence(aText.split(' '), bText.split(' '));
                return textSequence.length > aText.split(' ').length / 4 || textSequence.length > bText.split(' ').length / 4;
            }

            function compare(a, b){
                var aIndex = 0;
                var bIndex = 0;
                var bVariations = {};
                var sequence = findSequence(a, b);
                sequence.forEach(function(child, index){
                    bVariations[index] = [];
                    while (bIndex < b.length && (child.innerText || child.textContent) !== (b[bIndex].innerText || b[bIndex].textContent)) {
                        bVariations[index].push(b[bIndex]);
                        bIndex ++;
                    }
                    bIndex ++;
                });
                bVariations[sequence.length - 1] = [];
                var i;
                for (i = bIndex; i < b.length; i++) {
                    bVariations[sequence.length - 1].push(b[i]);
                }

                sequence.forEach(function(child, index){
                    var aVariations = 0;
                    var noEquivalent = true;
                    while (aIndex < a.length && (child.innerText || child.textContent) !== (a[aIndex].innerText || a[aIndex].textContent)) {
                        for (var n = 0; n < bVariations[index].length; n++) {
                            if (similar(a[aIndex], bVariations[index][n])) {
                                if ($(a[aIndex]).children().length) {
                                    compare($(bVariations[index][n]).children(), $(a[aIndex]).children());
                                    compare($(a[aIndex]).children(), $(bVariations[index][n]).children());
                                } else {
                                    $(a[aIndex]).addClass('diff');
                                }

                                noEquivalent = false;
                            }
                        }

                        if (noEquivalent) {
                            $(a[aIndex]).addClass('added');
                        }
                        aIndex ++;
                        aVariations ++;
                    }
                    if (aVariations === 1 && bVariations[index].length === 1) {
                        if ($(a[aIndex]).children().length){
                            compare($(bVariations[index][bVariations[index].length - 1]).children(), $(a[aIndex]).children());
                            compare($(a[aIndex]).children(), $(bVariations[index][bVariations[index].length - 1]).children());
                        } else {
                            $(a[aIndex]).removeClass('added').addClass('diff');
                        }
                    }
                    aIndex ++;
                });

                var noEquivalent = true;
                var j;
                for (j = aIndex; j < a.length; j++){
                    for (var n = 0; n < bVariations[sequence.length - 1].length; n++){
                        if (similar(a[j], bVariations[sequence.length - 1][n])){
                            if ($(a[j]).children().length){
                                compare($(bVariations[sequence.length - 1][bVariations[sequence.length - 1].length - 1]).children(), $(a[j]).children());
                                compare($(a[j]).children(), $(bVariations[sequence.length - 1][bVariations[sequence.length - 1].length - 1]).children());
                            } else {
                                $(a[j]).addClass('diff');
                            }
                            noEquivalent = false;
                        }
                    }

                    if (noEquivalent) {
                        $(a[j]).addClass('added');
                    }
                }
                if (j === aIndex + 1 && bVariations[sequence.length - 1].length === 1){
                    if (!a[j]) {
                        return;
                    }
                    if ($(a[j]).children().length) {
                        compare($(bVariations[sequence.length - 1][bVariations[sequence.length - 1].length - 1]).children(), $(a[j]).children());
                        compare($(a[j]).children(), $(bVariations[sequence.length - 1][bVariations[sequence.length - 1].length - 1]).children());
                    } else {
                        $(a[j]).removeClass('added').addClass('diff');
                    }
                }
            }

            $scope.comparison = function(left, right){
                var leftRoot = $(left.content);
                var rightRoot = $(right.content);
                //fix for empty div content
                while (leftRoot.length === 1 && leftRoot.children().length > 0 && leftRoot[0].nodeName === 'DIV'){
                    leftRoot = leftRoot.children();
                }
                while (rightRoot.length === 1 && rightRoot.children().length > 0 && rightRoot[0].nodeName === 'DIV'){
                    rightRoot = rightRoot.children();
                }

                compare(leftRoot, rightRoot);
                compare(rightRoot, leftRoot);

                var added = 0;
                leftRoot.each(function(index, item){
                    if ($(item).hasClass('added')){
                        rightRoot.splice(index + added, 0, $(item.outerHTML).removeClass('added').addClass('removed')[0]);
                    }
                    if ($(rightRoot[index]).hasClass('added')){
                        added++;
                    }
                });

                rightRoot.each(function(index, item){
                    if ($(item).hasClass('added')){
                        leftRoot.splice(index, 0, $(item.outerHTML).removeClass('added').addClass('removed')[0]);
                    }
                });

                return {
                    left: _.map(leftRoot, function(el){ return el.outerHTML; }).join(''),
                    right: _.map(rightRoot, function(el){ return el.outerHTML; }).join('')
                };
            };

            $scope.getPreviewEditStyle = function (info) {
                if (info.edit) {
                    return 'max-height: auto !important';
                }
            };

            this.initialize();
        }
    ]);
