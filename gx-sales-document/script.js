/* ==========================================================================
   GX営業コンテンツ 商品理解・営業実践マニュアル ― script.js
   実装する機能：
   1. 目次の開閉（モバイル）
   2. 現在位置の表示（目次のハイライト）
   3. ページ上部へ戻る
   4. 反論処理・営業台本の開閉（details/summary の補助）
   5. ROIシミュレーション
   6. 印刷時にすべての開閉項目を展開
   スライド機能（ページ送り・キー操作・スワイプ）は実装しません。
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- 1. 目次の開閉（モバイル） ---------- */

  var tocToggle = document.getElementById('tocToggle');
  var toc = document.getElementById('toc');

  function closeToc() {
    toc.classList.remove('open');
    tocToggle.setAttribute('aria-expanded', 'false');
  }
  function openToc() {
    toc.classList.add('open');
    tocToggle.setAttribute('aria-expanded', 'true');
  }

  if (tocToggle && toc) {
    tocToggle.addEventListener('click', function () {
      if (toc.classList.contains('open')) {
        closeToc();
      } else {
        openToc();
      }
    });

    // 目次のリンクをクリックしたら、モバイルでは目次を閉じてから移動する
    toc.querySelectorAll('[data-toc-link]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.matchMedia('(max-width: 899.98px)').matches) {
          closeToc();
        }
      });
    });

    // 目次の外側をクリックしたら閉じる（モバイル）
    document.addEventListener('click', function (e) {
      if (!window.matchMedia('(max-width: 899.98px)').matches) return;
      if (!toc.classList.contains('open')) return;
      if (toc.contains(e.target) || tocToggle.contains(e.target)) return;
      closeToc();
    });
  }

  /* ---------- 2. 現在位置の表示（スクロールスパイ） ---------- */

  var sections = Array.prototype.slice.call(document.querySelectorAll('main#content > section[id]'));
  var tocLinks = {};
  document.querySelectorAll('.toc-list a[data-toc-link]').forEach(function (a) {
    var id = a.getAttribute('href').replace('#', '');
    tocLinks[id] = a;
  });

  function setActiveSection(id) {
    Object.keys(tocLinks).forEach(function (key) {
      tocLinks[key].classList.toggle('active', key === id);
    });
    var activeLink = tocLinks[id];
    if (activeLink && activeLink.scrollIntoView) {
      var tocInner = document.querySelector('.toc-inner');
      if (tocInner) {
        var linkTop = activeLink.offsetTop;
        var linkBottom = linkTop + activeLink.offsetHeight;
        if (linkTop < tocInner.scrollTop || linkBottom > tocInner.scrollTop + tocInner.clientHeight) {
          tocInner.scrollTop = linkTop - 40;
        }
      }
    }
  }

  if (sections.length && 'IntersectionObserver' in window) {
    var currentId = sections[0].id;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            currentId = entry.target.id;
          }
        });
        setActiveSection(currentId);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );
    sections.forEach(function (s) { observer.observe(s); });
    setActiveSection(currentId);
  }

  /* ---------- 3. ページ上部へ戻る ---------- */

  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      backToTop.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });

    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- 4. 反論処理・営業台本の開閉 ---------- */
  /* <details>/<summary> はブラウザ標準機能で開閉するため、
     ここでは特別な処理を追加しない（印刷時の展開は 6. で扱う） */

  /* ---------- 5. ROIシミュレーション ---------- */

  var roiIds = ['roiCost', 'roiOffers', 'roiRate', 'roiRevenue', 'roiProfit'];
  var roiInputs = {};
  roiIds.forEach(function (id) { roiInputs[id] = document.getElementById(id); });

  function fmtYen(n) {
    if (!isFinite(n)) return '-';
    return Math.round(n).toLocaleString('ja-JP') + '円';
  }
  function fmtNum(n, digits) {
    if (!isFinite(n)) return '-';
    var f = Math.pow(10, digits || 0);
    return (Math.round(n * f) / f).toLocaleString('ja-JP');
  }

  function calcRoi() {
    if (!roiInputs.roiCost) return;

    var cost = parseFloat(roiInputs.roiCost.value) || 0;
    var offers = parseFloat(roiInputs.roiOffers.value) || 0;
    var rate = parseFloat(roiInputs.roiRate.value) || 0;
    var revenuePerDeal = parseFloat(roiInputs.roiRevenue.value) || 0;
    var profitPerDeal = parseFloat(roiInputs.roiProfit.value) || 0;

    var deals = offers * (rate / 100);
    var revenue = deals * revenuePerDeal;
    var profit = deals * profitPerDeal;
    var needed = profitPerDeal > 0 ? Math.ceil(cost / profitPerDeal) : NaN;
    var months = deals > 0 ? needed / deals : NaN;

    document.getElementById('roiOutDeals').textContent = fmtNum(deals, 1) + ' 件/月';
    document.getElementById('roiOutRevenue').textContent = fmtYen(revenue) + '/月';
    document.getElementById('roiOutProfit').textContent = fmtYen(profit) + '/月';
    document.getElementById('roiOutNeeded').textContent = isFinite(needed) ? fmtNum(needed, 0) + ' 件' : '算出不可';
    document.getElementById('roiOutMonths').textContent = isFinite(months) ? fmtNum(months, 1) + ' ヶ月' : '算出不可（月間成約件数が0）';
  }

  roiIds.forEach(function (id) {
    if (roiInputs[id]) {
      roiInputs[id].addEventListener('input', calcRoi);
    }
  });
  calcRoi();

  /* ---------- 6. 印刷時にすべての開閉項目を展開 ---------- */

  var openStateBeforePrint = [];

  window.addEventListener('beforeprint', function () {
    openStateBeforePrint = [];
    document.querySelectorAll('details').forEach(function (d) {
      openStateBeforePrint.push({ el: d, wasOpen: d.open });
      d.open = true;
    });
  });

  window.addEventListener('afterprint', function () {
    openStateBeforePrint.forEach(function (item) {
      item.el.open = item.wasOpen;
    });
    openStateBeforePrint = [];
  });

  // 印刷ダイアログを開くショートカット（"ページ上部へ戻る"ボタンの隣に置かない、
  // シンプルにブラウザの印刷機能を使う想定のため専用ボタンは設置しない）
})();
