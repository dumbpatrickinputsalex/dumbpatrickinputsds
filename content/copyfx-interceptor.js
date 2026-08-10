(function () {
  var cache = {};
  window.__dpi_copyfx_cache = cache;

  var origFetch = window.fetch;
  window.fetch = function () {
    var url = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url) || '';
    var init = arguments[1];
    var p = origFetch.apply(this, arguments);
    if (url.indexOf('/copyfx2-api/') !== -1) {
      var key = url.split('?')[0];
      if (init && init.body) {
        try { cache[key + '::body'] = JSON.parse(init.body); } catch (e) {}
      }
      p.then(function (resp) {
        var clone = resp.clone();
        clone.json().then(function (data) {
          cache[key] = data;
        }).catch(function () {});
      }).catch(function () {});
    }
    return p;
  };

  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__dpi_url = url;
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    var xhr = this;
    var url = xhr.__dpi_url || '';
    var body = arguments[0];
    if (url.indexOf('/copyfx2-api/') !== -1) {
      var key = url.split('?')[0];
      if (body) {
        try { cache[key + '::body'] = JSON.parse(body); } catch (e) {}
      }
      xhr.addEventListener('load', function () {
        try { cache[key] = JSON.parse(xhr.responseText); } catch (e) {}
      });
    }
    return origSend.apply(this, arguments);
  };
})();
