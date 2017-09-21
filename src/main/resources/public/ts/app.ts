import { routes, ng, model } from 'entcore';

import { actualiteController } from './controller';
ng.controllers.push(actualiteController);

import { preview } from './directives';
ng.directives.push(preview);

import { buildModel } from './model';

model.build = buildModel;

routes.define(function($routeProvider){
    $routeProvider
        .when('/view/thread/:threadId', {
            action: 'viewThread'
        })
        .when('/view/thread/:threadId/info/:infoId', {
            action: 'viewInfo'
        })
        .when('/view/info/:infoId/comment/:commentId', {
            action: 'viewInfo'
        })
        .when('/info/:infoId/timeline', {
            action : 'viewTimeline'
        })
        .when('/default', {
            action: 'main'
        })
        .when('/admin', {
            action: 'admin'
        })
        .otherwise({
            redirectTo: '/default'
        });
});
