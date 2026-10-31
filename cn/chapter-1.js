(() => {
  const get = (id) => document.getElementById(id);
  const fee = get("fee");
  const us = get("us-rate");
  const ao = get("ao-rate");
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const compactCurrency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const money = (amount) => currency.format(amount);
  const axisMoney = (amount) =>
    Math.abs(amount) >= 10000 ? compactCurrency.format(amount) : money(amount);
  const methodColors = ["#a96f50", "#53788a", "#708a70"];
  let selectedMethod = 2;

  function calculate(amount, usRate, aoRate, mode) {
    const foreignTax = amount * aoRate;
    const usBeforeCredit = amount * usRate;
    const limit = mode === "jordan" ? 0 : usBeforeCredit;
    const credit = Math.min(foreignTax, limit);
    const rows = [
      { name: "不予减除", usTax: usBeforeCredit },
      {
        name: "税收扣除",
        usTax: Math.max(amount - foreignTax, 0) * usRate,
      },
      {
        name: "外国税收抵免",
        usTax: Math.max(usBeforeCredit - credit, 0),
      },
    ].map((row) => ({
      ...row,
      total: foreignTax + row.usTax,
      after: amount - foreignTax - row.usTax,
    }));
    return { foreignTax, usBeforeCredit, limit, credit, rows };
  }

  function draw(amount, usRate, aoRate, mode) {
    const canvas = get("chart");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (!rect.width || !rect.height) return;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;
    const p = { l: w < 420 ? 54 : 66, r: 16, t: 16, b: 32 };
    const pw = w - p.l - p.r;
    const ph = h - p.t - p.b;
    const range = Math.max(amount, 1);
    const x = (rate) => p.l + rate * pw;
    const y = (value) => p.t + ((range - value) / (2 * range)) * ph;
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "#7c7268";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    [-1, -0.5, 0, 0.5, 1].forEach((n) => {
      const yy = y(range * n);
      ctx.beginPath();
      ctx.moveTo(p.l, yy);
      ctx.lineTo(w - p.r, yy);
      ctx.strokeStyle = n === 0 ? "#c9bcad" : "#e3dbd0";
      ctx.lineWidth = n === 0 ? 1.2 : 1;
      ctx.stroke();
      ctx.fillText(axisMoney(amount * n), p.l - 7, yy);
    });
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    [0, 0.25, 0.5, 0.75, 1].forEach((n) =>
      ctx.fillText(`${n * 100}%`, x(n), h - p.b + 9),
    );
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "#8a8176";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x(aoRate), p.t);
    ctx.lineTo(x(aoRate), h - p.b);
    ctx.stroke();
    const current = calculate(amount, usRate, aoRate, mode);
    methodColors.forEach((color, i) => {
      ctx.beginPath();
      for (let n = 0; n <= 100; n++) {
        const value = calculate(amount, usRate, n / 100, mode).rows[i].after;
        if (n) ctx.lineTo(x(n / 100), y(value));
        else ctx.moveTo(x(0), y(value));
      }
      ctx.globalAlpha = i === selectedMethod ? 1 : 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = i === selectedMethod ? 3 : 1.8;
      ctx.setLineDash(i === 2 ? [6, 4] : []);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    current.rows.forEach((row, i) => {
      ctx.beginPath();
      ctx.arc(x(aoRate), y(row.after), i === selectedMethod ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = methodColors[i];
      ctx.fill();
      ctx.strokeStyle = "#fffdf9";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  function syncMethodButtons() {
    document.querySelectorAll("[data-method]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(Number(button.dataset.method) === selectedMethod),
      );
    });
  }

  function renderAssumptions(mode) {
    const panel = get("assumption-panel");
    panel.className = `assumption-panel ${mode}`;
    panel.innerHTML =
      mode === "jordan"
        ? '<div class="assumption-icon" aria-hidden="true">i</div><div><strong>零限额的成立前提</strong><div class="assumption-chips"><span>无协定重新确定来源</span><span>无其他同类境外来源所得</span></div><p class="assumption-formula">服务在美国履行，不进入境外来源分子；满足上述假设时，限额才为 <b>$0</b>。</p></div>'
        : '<div class="assumption-icon" aria-hidden="true">i</div><div><strong>关键假设 · 仅用于教学比较</strong><div class="assumption-chips"><span>境外来源应税所得 = 全球应税所得</span><span>安哥拉税均符合抵免资格</span></div><p class="assumption-formula">限额 = 美国所得税额 × 境外来源应纳税所得额 ÷ 全球应纳税所得额；本模式比例为 <b>100%</b>。</p></div>';
  }

  function renderComparison(data, amount) {
    const scale = Math.max(amount, ...data.rows.map((row) => row.total), 1);
    const reference = (amount / scale) * 100;
    get("income-bars").innerHTML = data.rows
      .map((row, i) => {
        const afterWidth = (Math.max(row.after, 0) / scale) * 100;
        const aoWidth = (data.foreignTax / scale) * 100;
        const usWidth = (row.usTax / scale) * 100;
        return `<button type="button" class="income-row" data-compare="${i}" aria-pressed="${i === selectedMethod}"><span class="income-method"><i></i>${row.name}<small>两国税额 ${money(row.total)}</small></span><span class="income-track" aria-hidden="true"><span class="income-segment income-after" style="width:${afterWidth}%" title="税后所得 ${money(row.after)}"></span><span class="income-segment income-ao" style="width:${aoWidth}%" title="安哥拉税 ${money(data.foreignTax)}"></span><span class="income-segment income-us" style="width:${usWidth}%" title="美国税 ${money(row.usTax)}"></span><span class="income-reference" style="left:${reference}%"></span></span><span class="income-value"><strong class="${row.after < 0 ? "negative" : ""}">${money(row.after)}</strong><small>税后所得</small></span></button>`;
      })
      .join("");
    const epsilon = Math.max(amount, 1) * 1e-10;
    const highest = Math.max(...data.rows.map((row) => row.after));
    const best = data.rows.filter((row) => Math.abs(row.after - highest) <= epsilon);
    get("comparison-insight").textContent =
      best.length === data.rows.length
        ? "本例三种方式的税后所得相同。"
        : `${best.map((row) => row.name).join("、")}最高，可保留 ${money(highest)}。`;
  }

  function setFlowPath(id, value, amount, negative = false) {
    const path = get(id);
    const share = amount > 0 ? Math.min(Math.abs(value) / amount, 1) : 0;
    const isZero = Math.abs(value) < 1e-12;
    path.setAttribute("stroke-width", isZero ? 1.5 : 3 + share * 25);
    path.setAttribute("stroke-dasharray", isZero || negative ? "4 5" : "none");
    path.style.opacity = isZero ? 0.2 : 1;
    path.style.stroke = negative ? "#9b4638" : "";
  }

  function renderFlow(amount, data, chosen) {
    get("flow-amount").textContent = money(amount);
    get("flow-ao-tax").textContent = money(data.foreignTax);
    get("flow-us-tax").textContent = money(chosen.usTax);
    get("flow-after-tax").textContent = money(chosen.after);
    get("flow-after-tax").classList.toggle("negative", chosen.after < 0);
    setFlowPath("flow-path-ao", data.foreignTax, amount);
    setFlowPath("flow-path-us", chosen.usTax, amount);
    setFlowPath("flow-path-after", chosen.after, amount, chosen.after < 0);
    [
      ["flow-node-ao", data.foreignTax],
      ["flow-node-us", chosen.usTax],
      ["flow-node-after", chosen.after],
    ].forEach(([id, value]) => {
      get(id).classList.toggle("is-zero", Math.abs(value) < 1e-12);
    });
    if (selectedMethod === 0) {
      get("flow-insight").textContent = "两国分别按原收入征税，安哥拉税不影响美国税。";
    } else if (selectedMethod === 1) {
      const reduction = data.usBeforeCredit - chosen.usTax;
      get("flow-insight").textContent = `扣除减少的是税基，本例美国税因此减少 ${money(reduction)}。`;
    } else if (data.foreignTax === 0) {
      get("flow-insight").textContent = "本例没有安哥拉税可用于抵免。";
    } else if (data.limit === 0) {
      get("flow-insight").textContent =
        document.querySelector('input[name="mode"]:checked').value === "jordan"
          ? "在本例简化假设下，抵免限额为 $0，安哥拉税不能抵减本例美国税。"
          : "本例美国税额与抵免限额均为 $0。";
    } else if (data.foreignTax <= data.limit) {
      get("flow-insight").textContent = `安哥拉税 ${money(data.foreignTax)} 全额抵免，美国税减少 ${money(data.credit)}。`;
    } else {
      get("flow-insight").textContent = `抵免触及 ${money(data.limit)} 上限，仍有 ${money(data.foreignTax - data.credit)} 安哥拉税未获抵免。`;
    }
  }

  function renderSteps(amount, data, chosen) {
    const middle =
      selectedMethod === 0
        ? `${money(amount)} × ${us.value}%`
        : selectedMethod === 1
          ? `(${money(amount)} − ${money(data.foreignTax)}) × ${us.value}%`
          : `${money(amount)} × ${us.value}% − ${money(data.credit)}`;
    const note =
      selectedMethod === 0
        ? "美国税基 = 咨询费全额"
        : selectedMethod === 1
          ? `美国税基 = ${money(Math.max(amount - data.foreignTax, 0))}`
          : `抵免 = min(${money(data.foreignTax)}, ${money(data.limit)})`;
    get("calculation-steps").innerHTML = `<article class="calculation-step"><div class="step-heading"><span class="step-number">01</span><small>安哥拉税额</small></div><p>${money(amount)} × ${ao.value}%</p><strong>${money(data.foreignTax)}</strong></article><article class="calculation-step"><div class="step-heading"><span class="step-number">02</span><small>美国税额</small></div><p>${middle}</p><strong>${money(chosen.usTax)}</strong><em>${note}</em></article><article class="calculation-step"><div class="step-heading"><span class="step-number">03</span><small>税后所得</small></div><p>${money(amount)} − ${money(data.foreignTax)} − ${money(chosen.usTax)}</p><strong class="${chosen.after < 0 ? "negative" : ""}">${money(chosen.after)}</strong></article>`;
  }

  function clearResults() {
    get("income-bars").innerHTML = '<div class="empty-state">输入金额后，这里会显示收入去向。</div>';
    get("comparison-insight").textContent = "";
    get("calculation-steps").replaceChildren();
    get("flow-amount").textContent = "—";
    ["flow-ao-tax", "flow-us-tax", "flow-after-tax"].forEach((id) => {
      get(id).textContent = "—";
      get(id).classList.remove("negative");
    });
    ["flow-node-ao", "flow-node-us", "flow-node-after"].forEach((id) =>
      get(id).classList.add("is-zero"),
    );
    ["flow-path-ao", "flow-path-us", "flow-path-after"].forEach((id) => {
      get(id).setAttribute("stroke-width", 0);
      get(id).style.opacity = 0;
    });
    get("flow-insight").textContent = "请输入有效的咨询费金额。";
    ["ao-tax", "credit-limit", "credit"].forEach(
      (id) => (get(id).textContent = "—"),
    );
    get("results-body").replaceChildren();
    const canvas = get("chart");
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  function render() {
    const raw = fee.value.trim();
    const valid = raw !== "" && Number.isFinite(Number(raw)) && Number(raw) >= 0;
    get("fee-error").textContent = valid
      ? ""
      : raw === ""
        ? "请输入咨询费金额。"
        : "请输入非负金额。";
    fee.setAttribute("aria-invalid", String(!valid));
    get("us-output").textContent = `${us.value}%`;
    get("ao-output").textContent = `${ao.value}%`;
    [us, ao].forEach((input) =>
      input.style.setProperty("--range-progress", `${input.value}%`),
    );
    document.querySelectorAll("[data-rate]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.rate === ao.value));
    });
    const mode = document.querySelector('input[name="mode"]:checked').value;
    get("mode-note").textContent =
      mode === "jordan" ? "美国来源 · 本例限额 $0" : "境外来源占比 100% · 限额内抵免";
    renderAssumptions(mode);
    syncMethodButtons();
    if (!valid) {
      clearResults();
      return;
    }
    const amount = Number(raw);
    const usRate = Number(us.value) / 100;
    const aoRate = Number(ao.value) / 100;
    const data = calculate(amount, usRate, aoRate, mode);
    const chosen = data.rows[selectedMethod];
    get("ao-tax").textContent = money(data.foreignTax);
    get("credit-limit").textContent = money(data.limit);
    get("credit").textContent = money(data.credit);
    get("results-body").innerHTML = data.rows
      .map(
        (row) =>
          `<tr><th scope="row">${row.name}</th><td>${money(data.foreignTax)}</td><td>${money(row.usTax)}</td><td>${money(row.total)}</td><td class="${row.after < 0 ? "negative" : ""}">${money(row.after)}</td></tr>`,
      )
      .join("");
    renderComparison(data, amount);
    renderFlow(amount, data, chosen);
    renderSteps(amount, data, chosen);
    draw(amount, usRate, aoRate, mode);
  }

  [fee, us, ao, ...document.querySelectorAll('input[name="mode"]')].forEach(
    (input) => input.addEventListener("input", render),
  );
  document.querySelectorAll("[data-method]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMethod = Number(button.dataset.method);
      render();
    });
  });
  get("income-bars").addEventListener("click", (event) => {
    const button = event.target.closest("[data-compare]");
    if (!button) return;
    selectedMethod = Number(button.dataset.compare);
    render();
  });
  document.querySelectorAll("[data-rate]").forEach((button) => {
    button.addEventListener("click", () => {
      ao.value = button.dataset.rate;
      render();
    });
  });
  get("reset").addEventListener("click", () => {
    fee.value = "5000";
    us.value = "50";
    ao.value = "50";
    selectedMethod = 2;
    document.querySelector('input[value="comparison"]').checked = true;
    render();
  });
  get("explore-details").addEventListener("toggle", render);
  window.addEventListener("resize", render);
  render();
})();
