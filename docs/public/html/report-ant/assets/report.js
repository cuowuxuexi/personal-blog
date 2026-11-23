(function () {
  var WIDTH_KEY = 'an-ant-r04:width';
  var DATA = window["AN_REPORT"] || {};

  // 版宽切换：只存版宽
  function applyWidth(w) {
    if (w !== 'narrow' && w !== 'medium' && w !== 'wide') w = 'medium';
    document.body.setAttribute('data-width', w);
    var btns = document.querySelectorAll('.width-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-w') === w);
    }
    try {
      localStorage.setItem(WIDTH_KEY, w);
    } catch (e) {}
  }

  var savedWidth = 'medium';
  try {
    var stored = localStorage.getItem(WIDTH_KEY);
    if (stored) savedWidth = stored;
  } catch (e) {}
  applyWidth(savedWidth);

  var widthBtns = document.querySelectorAll('.width-btn');
  for (var i = 0; i < widthBtns.length; i++) {
    widthBtns[i].addEventListener('click', function () {
      applyWidth(this.getAttribute('data-w'));
    });
  }

  // 导览滚动跟随 + 窄屏下拉同步
  var railLinks = document.querySelectorAll('.rail-link');
  var railSelect = document.querySelector('.rail-select');
  var sections = document.querySelectorAll('main section[id]');

  function setActiveSection(secId) {
    for (var j = 0; j < railLinks.length; j++) {
      var href = railLinks[j].getAttribute('href');
      railLinks[j].classList.toggle('active', href === '#' + secId);
    }
    if (railSelect && railSelect.value !== '#' + secId) {
      railSelect.value = '#' + secId;
    }
  }

  if (sections.length > 0) {
    setActiveSection(sections[0].id);
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        for (var k = 0; k < entries.length; k++) {
          if (entries[k].isIntersecting) {
            setActiveSection(entries[k].target.id);
          }
        }
      }, { rootMargin: '-18% 0px -65% 0px', threshold: 0 });
      for (var s = 0; s < sections.length; s++) {
        observer.observe(sections[s]);
      }
    }
  }

  if (railSelect) {
    railSelect.addEventListener('change', function () {
      var target = document.querySelector(this.value);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        setActiveSection(target.id);
      }
    });
  }

  // 滑块：每档的显示文字已由构建脚本算好，这里只换文字与 data 属性；不存储，打开即默认档
  var sliders = document.querySelectorAll('input[type="range"][data-slider]');
  for (var si = 0; si < sliders.length; si++) {
    (function (el) {
      var sid = el.getAttribute('data-slider');
      var conf = DATA.sliders && DATA.sliders[sid];
      if (!conf) return;
      function update() {
        var st = conf.steps[String(parseFloat(el.value))];
        if (!st) return;
        var labels = document.querySelectorAll('[data-slider-label="' + sid + '"]');
        for (var a = 0; a < labels.length; a++) labels[a].textContent = st.label;
        for (var f in st.out) {
          if (!Object.prototype.hasOwnProperty.call(st.out, f)) continue;
          var o = st.out[f];
          var holders = document.querySelectorAll('[data-slider-out="' + sid + ':' + f + '"]');
          for (var b = 0; b < holders.length; b++) {
            var sp = holders[b].querySelector('span');
            if (sp) {
              sp.textContent = o.t;
              sp.setAttribute('data-key', o.k);
              if (o.r) sp.setAttribute('data-raw', o.r);
            }
          }
        }
        var rows = document.querySelectorAll('tr[data-slider-row="' + sid + '"]');
        for (var r = 0; r < rows.length; r++) {
          rows[r].classList.toggle('row-focus', rows[r].getAttribute('data-slider-step') === String(st.row));
        }
      }
      el.addEventListener('input', update);
      el.addEventListener('change', update);
    })(sliders[si]);
  }

  // 表格 CSV 下载：CSV 文本由构建脚本预先生成
  var csvBtns = document.querySelectorAll('button[data-csv]');
  for (var ci = 0; ci < csvBtns.length; ci++) {
    csvBtns[ci].addEventListener('click', function () {
      var tid = this.getAttribute('data-csv');
      var item = DATA.csv && DATA.csv[tid];
      if (!item) return;
      var blob = new Blob(['\uFEFF' + item.text], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }
})();
