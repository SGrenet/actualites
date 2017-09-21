import { ng, angular } from 'entcore';

export const preview = ng.directive('preview', function () {
    return {
        restrict: 'A',
        link: function ($scope, $element) {
            var $elem = $element[0];
            var animationTimer;
            angular.element($element).on('click', function () {
                var setHeight = function() {
                    animationTimer = setTimeout(function() {
                        angular.element(this).css({
                            'max-height': this.scrollHeight
                        });
                        setHeight();
                    }.bind($elem), 50);
                }.bind($elem);
                if ($elem.className.indexOf('expanded') !== -1) {
                    clearTimeout(animationTimer);
                    if ((parseInt(angular.element($elem).css('height')) + parseInt(angular.element($elem).css('padding-top')) + parseInt(angular.element($elem).css('padding-bottom'))) === $elem.scrollHeight) {
                        angular.element($elem).css({
                            transition: 'none',
                            height: 'auto'
                        });
                    }
                    setHeight();
                } else {
                    clearTimeout(animationTimer);
                    angular.element($elem).removeAttr('style');
                }
            });
        }
    };
});