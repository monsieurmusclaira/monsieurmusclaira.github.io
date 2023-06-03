'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _plugin = require('@swup/plugin');

var _plugin2 = _interopRequireDefault(_plugin);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var arrayify = function arrayify(list) {
	return Array.prototype.slice.call(list);
};

var ScriptsPlugin = function (_Plugin) {
	_inherits(ScriptsPlugin, _Plugin);

	function ScriptsPlugin(options) {
		_classCallCheck(this, ScriptsPlugin);

		var _this = _possibleConstructorReturn(this, (ScriptsPlugin.__proto__ || Object.getPrototypeOf(ScriptsPlugin)).call(this));

		_this.name = 'ScriptsPlugin';

		_this.runScripts = function () {
			var scope = _this.options.head && _this.options.body ? document : _this.options.head ? document.head : document.body;

			var selector = _this.options.optin ? 'script[data-swup-reload-script]' : 'script:not([data-swup-ignore-script])';
			var scripts = arrayify(scope.querySelectorAll(selector));

			scripts.forEach(function (script) {
				return _this.runScript(script);
			});

			_this.swup.log('Executed ' + scripts.length + ' scripts.');
		};

		_this.runScript = function (originalElement) {
			var element = document.createElement('script');

			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = arrayify(originalElement.attributes)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var _ref2 = _step.value;
					var name = _ref2.name,
					    value = _ref2.value;

					element.setAttribute(name, value);
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}

			element.textContent = originalElement.textContent;
			element.setAttribute('async', 'false');

			originalElement.replaceWith(element);
			return element;
		};

		var defaultOptions = {
			head: true,
			body: true,
			optin: false
		};

		_this.options = _extends({}, defaultOptions, options);
		return _this;
	}

	_createClass(ScriptsPlugin, [{
		key: 'mount',
		value: function mount() {
			this.swup.on('contentReplaced', this.runScripts);
		}
	}, {
		key: 'unmount',
		value: function unmount() {
			this.swup.off('contentReplaced', this.runScripts);
		}
	}]);

	return ScriptsPlugin;
}(_plugin2.default);

exports.default = ScriptsPlugin;