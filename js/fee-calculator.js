(function () {
  var root = document.getElementById("fee-calculator");
  if (!root) return;

  var LEPPLA_BP = 50;

  var inputs = {
    capital: root.querySelector("#fee-capital"),
    years: root.querySelector("#fee-years"),
    returnPct: root.querySelector("#fee-return"),
    otherBp: root.querySelector("#fee-other-bp"),
  };

  var outs = {
    otherEnd: root.querySelector("[data-out='other-end']"),
    lepplaEnd: root.querySelector("[data-out='leppla-end']"),
    delta: root.querySelector("[data-out='delta']"),
    deltaStrong: root.querySelector("[data-out='delta-strong']"),
    disclosure: root.querySelector("[data-out='disclosure']"),
    capitalLabels: root.querySelectorAll("[data-label='capital']"),
    yearsLabels: root.querySelectorAll("[data-label='years']"),
    returnLabels: root.querySelectorAll("[data-label='return']"),
    otherBpLabels: root.querySelectorAll("[data-label='other-bp']"),
    lepplaBpLabels: root.querySelectorAll("[data-label='leppla-bp']"),
  };

  function setAll(nodes, text) {
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = text;
  }

  var svg = root.querySelector("#fee-live-chart");
  var otherLine = svg.querySelector("[data-line='other']");
  var lepplaLine = svg.querySelector("[data-line='leppla']");
  var otherDot = svg.querySelector("[data-dot='other']");
  var lepplaDot = svg.querySelector("[data-dot='leppla']");
  var otherEndLabel = svg.querySelector("[data-end='other']");
  var lepplaEndLabel = svg.querySelector("[data-end='leppla']");
  var yLabels = svg.querySelectorAll("[data-y]");
  var xLabels = svg.querySelectorAll("[data-x]");
  var gridLines = svg.querySelectorAll("[data-grid]");

  var chart = {
    left: 56,
    right: 576,
    top: 24,
    bottom: 264,
  };

  function num(el, fallback) {
    var v = parseFloat(el.value);
    return isFinite(v) ? v : fallback;
  }

  function formatMoney(n) {
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return "$" + Math.round(n / 1e3).toLocaleString() + "K";
    return "$" + Math.round(n).toLocaleString();
  }

  function formatMoneyFull(n) {
    return "$" + Math.round(n).toLocaleString();
  }

  function growSeries(principal, annualReturn, annualFee, years) {
    var rQ = annualReturn / 4;
    var fQ = annualFee / 4;
    var net = 1 + rQ - fQ;
    var points = [principal];
    var value = principal;
    for (var y = 0; y < years; y++) {
      for (var q = 0; q < 4; q++) {
        value *= net;
      }
      points.push(value);
    }
    return points;
  }

  function niceMax(maxVal) {
    if (maxVal <= 0) return 1;
    var exp = Math.pow(10, Math.floor(Math.log10(maxVal)));
    var n = maxVal / exp;
    var nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return nice * exp;
  }

  function pathFromSeries(series, yMax) {
    var n = series.length;
    var w = chart.right - chart.left;
    var h = chart.bottom - chart.top;
    var parts = [];
    for (var i = 0; i < n; i++) {
      var x = chart.left + (n === 1 ? 0 : (i / (n - 1)) * w);
      var y = chart.bottom - (series[i] / yMax) * h;
      parts.push(x.toFixed(1) + "," + y.toFixed(1));
    }
    return parts.join(" ");
  }

  function updateYAxis(yMax) {
    var ticks = 4;
    for (var i = 0; i <= ticks; i++) {
      var val = (yMax / ticks) * (ticks - i);
      var y = chart.top + ((chart.bottom - chart.top) / ticks) * i;
      if (yLabels[i]) {
        yLabels[i].setAttribute("y", (y + 4).toFixed(1));
        yLabels[i].textContent = formatMoney(val);
      }
      if (gridLines[i]) {
        gridLines[i].setAttribute("y1", y.toFixed(1));
        gridLines[i].setAttribute("y2", y.toFixed(1));
      }
    }
  }

  function updateXAxis(years) {
    var marks = [0, 0.25, 0.5, 0.75, 1];
    for (var i = 0; i < marks.length; i++) {
      var t = marks[i] * years;
      var x = chart.left + marks[i] * (chart.right - chart.left);
      if (xLabels[i]) {
        xLabels[i].setAttribute("x", x.toFixed(1));
        xLabels[i].textContent = i === marks.length - 1 ? years + " yrs" : String(t % 1 === 0 ? t : t.toFixed(1));
      }
    }
  }

  function render() {
    var capital = Math.max(1000, num(inputs.capital, 5000000));
    var years = Math.max(1, Math.min(40, Math.round(num(inputs.years, 10))));
    var ret = Math.max(0, num(inputs.returnPct, 12)) / 100;
    var otherFee = Math.max(0, num(inputs.otherBp, 125)) / 10000;
    var lepplaFee = LEPPLA_BP / 10000;

    setAll(outs.capitalLabels, formatMoneyFull(capital));
    setAll(outs.yearsLabels, String(years));
    setAll(outs.returnLabels, (ret * 100).toFixed((ret * 100) % 1 ? 1 : 0) + "%");
    setAll(outs.otherBpLabels, String(Math.round(otherFee * 10000)));
    setAll(outs.lepplaBpLabels, String(LEPPLA_BP));

    var otherSeries = growSeries(capital, ret, otherFee, years);
    var lepplaSeries = growSeries(capital, ret, lepplaFee, years);
    var otherEnd = otherSeries[otherSeries.length - 1];
    var lepplaEnd = lepplaSeries[lepplaSeries.length - 1];
    var delta = lepplaEnd - otherEnd;

    var yMax = niceMax(Math.max(otherEnd, lepplaEnd) * 1.08);

    otherLine.setAttribute("points", pathFromSeries(otherSeries, yMax));
    lepplaLine.setAttribute("points", pathFromSeries(lepplaSeries, yMax));

    var endX = chart.right;
    var otherY = chart.bottom - (otherEnd / yMax) * (chart.bottom - chart.top);
    var lepplaY = chart.bottom - (lepplaEnd / yMax) * (chart.bottom - chart.top);

    otherDot.setAttribute("cx", endX);
    otherDot.setAttribute("cy", otherY.toFixed(1));
    lepplaDot.setAttribute("cx", endX);
    lepplaDot.setAttribute("cy", lepplaY.toFixed(1));

    otherEndLabel.setAttribute("x", "588");
    otherEndLabel.setAttribute("y", (otherY + 4).toFixed(1));
    otherEndLabel.textContent = formatMoney(otherEnd);

    lepplaEndLabel.setAttribute("x", "588");
    lepplaEndLabel.setAttribute("y", (lepplaY + 4).toFixed(1));
    lepplaEndLabel.textContent = formatMoney(lepplaEnd);

    // Keep labels from overlapping when lines are close
    if (Math.abs(lepplaY - otherY) < 16) {
      if (lepplaEnd >= otherEnd) {
        lepplaEndLabel.setAttribute("y", (lepplaY - 6).toFixed(1));
        otherEndLabel.setAttribute("y", (otherY + 14).toFixed(1));
      } else {
        otherEndLabel.setAttribute("y", (otherY - 6).toFixed(1));
        lepplaEndLabel.setAttribute("y", (lepplaY + 14).toFixed(1));
      }
    }

    updateYAxis(yMax);
    updateXAxis(years);

    if (outs.otherEnd) outs.otherEnd.textContent = formatMoneyFull(otherEnd);
    if (outs.lepplaEnd) outs.lepplaEnd.textContent = formatMoneyFull(lepplaEnd);
    if (outs.delta) outs.delta.textContent = formatMoneyFull(Math.abs(delta));
    if (outs.deltaStrong) {
      outs.deltaStrong.textContent = formatMoney(Math.abs(delta));
    }

    if (outs.disclosure) {
      outs.disclosure.textContent =
        "Hypothetical illustration only. " +
        formatMoneyFull(capital) +
        " starting capital, " +
        (ret * 100).toFixed(ret * 100 % 1 ? 1 : 0) +
        "% gross annual return compounded quarterly, " +
        years +
        "-year horizon. Comparison fee at " +
        Math.round(otherFee * 10000) +
        " bp per year. Leppla Pyramid at " +
        Math.round(lepplaFee * 10000) +
        " bp per year. Not actual or projected performance.";
    }
  }

  Object.keys(inputs).forEach(function (key) {
    var el = inputs[key];
    if (!el) return;
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  var resetBtn = root.querySelector("[data-action='reset']");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      inputs.capital.value = "5000000";
      inputs.years.value = "10";
      inputs.returnPct.value = "12";
      inputs.otherBp.value = "125";
      render();
    });
  }

  render();
})();
