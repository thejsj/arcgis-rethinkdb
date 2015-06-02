var EventQueue = function () {
  this._items= [];
  this._events = {
    '400': []
  };
};

EventQueue.prototype.append = function (elem) {
  this._items.push(elem);
  if (this._items.length === 400) {
    if (this._events['400'].length > 0) {
      this._events['400'].forEach(function (cb) {
        cb(this._items);
      }.bind(this));
    }
  }
};

EventQueue.prototype.clear = function () {
  var items = this._items;
  this._items = [];
  return items;
};

EventQueue.prototype.on = function (eventName, callback) {
  this._events[eventName].push(callback);
};

module.exports = EventQueue;
