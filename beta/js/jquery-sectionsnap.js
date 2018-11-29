(function($) {
	$.fn.sectionsnap = function( options ) {
		var settings = $.extend({
			'delay'				: 100 // time dilay (ms)
			, 'selector'		: ".section" // selector
			, 'reference'		: .9 // % of window height from which we start
			, 'animationTime'	: 400 // animation time (snap scrolling)
		}, options);		
		
		var $wrapper = this
		, direction = 'down'
		, currentScrollTop = $(window).scrollTop()
		, scrollTimer;

		// check the direction
		var updateDirection = function() {
			if ($(window).scrollTop() >= currentScrollTop)
				direction = 'down';
			else
				direction = 'up';
			currentScrollTop = $(window).scrollTop();
		}

		// return the closest element (depending on direction)
		var getClosestElement = function() {			
			var $list = $wrapper.find(settings.selector)
			, wt = $(window).scrollTop()
			, wh = $(window).height()
			, refY = wh * settings.reference
			, wtd = wt + refY - 1
			, $target;

			if (direction == 'down') {
				$list.each(function() {
					var st = $(this).position().top;					
					if ((st > wt) && (st <= wtd)) {
						$target = $(this);
						return false; // just to break the each loop
					}
				});
			} else {
				wtd = wt - refY + 1;
				$list.each(function() {
					var st = $(this).position().top;					
					if ((st < wt) && (st >= wtd)) {
						$target = $(this);
						return false; // just to break the each loop
					}
				});
			}
			return $target;
		}

		// snap
		var snap = function() {
			var $target = getClosestElement();
			if ($target) {
				$('html, body').animate({
						scrollTop: ($target.offset().top)
					}, settings.animationTime, function() {
						window.clearTimeout(scrollTimer);
					});
			}
		}
		// on window scroll
		var windowScroll = function() {
			updateDirection();
			window.clearTimeout(scrollTimer);
			scrollTimer = window.setTimeout(snap, settings.delay);
		}
		$(window).scroll(windowScroll);
		return this;
	};
})(jQuery);