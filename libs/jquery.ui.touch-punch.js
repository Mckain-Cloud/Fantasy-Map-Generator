/*!
 * jQuery UI Touch Punch 0.2.3 - Modernized
 *
 * Original Copyright 2011–2014, Dave Furfero
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Modernized to use .on()/.off() instead of deprecated .bind()/.unbind()
 *
 * Depends:
 *  jquery.ui.widget.js
 *  jquery.ui.mouse.js
 */
(function($) {
  // Detect touch support
  $.support.touch = 'ontouchend' in document;

  // Ignore browsers without touch support
  if (!$.support.touch) {
    return;
  }

  var mouseProto = $.ui.mouse.prototype,
      _mouseInit = mouseProto._mouseInit,
      _mouseDestroy = mouseProto._mouseDestroy,
      touchHandled;

  // Simulate a mouse event based on a touch event
  function simulateMouseEvent(event, simulatedType) {
    // Ignore multi-touch events
    if (event.originalEvent.touches.length > 1) {
      return;
    }

    event.preventDefault();

    var touch = event.originalEvent.changedTouches[0],
        simulatedEvent = document.createEvent('MouseEvents');

    // Initialize the simulated mouse event
    simulatedEvent.initMouseEvent(
      simulatedType,    // type
      true,             // bubbles
      true,             // cancelable
      window,           // view
      1,                // detail
      touch.screenX,    // screenX
      touch.screenY,    // screenY
      touch.clientX,    // clientX
      touch.clientY,    // clientY
      false,            // ctrlKey
      false,            // altKey
      false,            // shiftKey
      false,            // metaKey
      0,                // button
      null              // relatedTarget
    );

    // Dispatch the simulated event to the target element
    event.target.dispatchEvent(simulatedEvent);
  }

  // Handle the touch start event
  mouseProto._touchStart = function(event) {
    var self = this;

    // Ignore the event if another widget is already being handled
    if (touchHandled || !self._mouseCapture(event.originalEvent.changedTouches[0])) {
      return;
    }

    // Set the flag to prevent other widgets from inheriting the touch event
    touchHandled = true;

    // Track movement to determine if it's a click
    self._touchMoved = false;

    // Simulate the mouseover, mousemove, and mousedown events
    simulateMouseEvent(event, 'mouseover');
    simulateMouseEvent(event, 'mousemove');
    simulateMouseEvent(event, 'mousedown');
  };

  // Handle the touch move event
  mouseProto._touchMove = function(event) {
    // Ignore event if not handled
    if (!touchHandled) {
      return;
    }

    // Interaction was not a click
    this._touchMoved = true;

    // Simulate the mousemove event
    simulateMouseEvent(event, 'mousemove');
  };

  // Handle the touch end event
  mouseProto._touchEnd = function(event) {
    // Ignore event if not handled
    if (!touchHandled) {
      return;
    }

    // Simulate the mouseup and mouseout events
    simulateMouseEvent(event, 'mouseup');
    simulateMouseEvent(event, 'mouseout');

    // If the touch interaction did not move, it's a click
    if (!this._touchMoved) {
      simulateMouseEvent(event, 'click');
    }

    // Unset the flag to allow other widgets to inherit the touch event
    touchHandled = false;
  };

  // Override _mouseInit to add touch event handlers
  mouseProto._mouseInit = function() {
    var self = this;

    // Use .on() instead of deprecated .bind()
    self.element.on({
      'touchstart': $.proxy(self, '_touchStart'),
      'touchmove': $.proxy(self, '_touchMove'),
      'touchend': $.proxy(self, '_touchEnd')
    });

    // Call the original _mouseInit
    _mouseInit.call(self);
  };

  // Override _mouseDestroy to remove touch event handlers
  mouseProto._mouseDestroy = function() {
    var self = this;

    // Use .off() instead of deprecated .unbind()
    self.element.off({
      'touchstart': $.proxy(self, '_touchStart'),
      'touchmove': $.proxy(self, '_touchMove'),
      'touchend': $.proxy(self, '_touchEnd')
    });

    // Call the original _mouseDestroy
    _mouseDestroy.call(self);
  };

})(jQuery);
