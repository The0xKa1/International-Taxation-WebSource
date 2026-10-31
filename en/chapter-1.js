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
      { name: "No relief", usTax: usBeforeCredit },
      {
        name: "Tax deduction",
        usTax: Math.max(amount - foreignTax, 0) * usRate,
      },
      {
        name: "Foreign tax credit",
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
        ? '<div class="assumption-icon" aria-hidden="true">i</div><div><strong>Conditions for the zero limit</strong><div class="assumption-chips"><span>No treaty re-sourcing</span><span>No other foreign-source income in the same category</span></div><p class="assumption-formula">The services are performed in the US and do not enter the foreign-source numerator. Only under these assumptions is the limit <b>$0</b>.</p></div>'
        : '<div class="assumption-icon" aria-hidden="true">i</div><div><strong>Key assumptions · Teaching comparison only</strong><div class="assumption-chips"><span>Foreign-source taxable income = worldwide taxable income</span><span>All Angolan tax is eligible for credit</span></div><p class="assumption-formula">Limit = US income tax × foreign-source taxable income ÷ worldwide taxable income; this mode assumes <b>100%</b>.</p></div>';
  }

  function renderComparison(data, amount) {
    const scale = Math.max(amount, ...data.rows.map((row) => row.total), 1);
    const reference = (amount / scale) * 100;
    get("income-bars").innerHTML = data.rows
      .map((row, i) => {
        const afterWidth = (Math.max(row.after, 0) / scale) * 100;
        const aoWidth = (data.foreignTax / scale) * 100;
        const usWidth = (row.usTax / scale) * 100;
        return `<button type="button" class="income-row" data-compare="${i}" aria-pressed="${i === selectedMethod}"><span class="income-method"><i></i>${row.name}<small>Combined tax ${money(row.total)}</small></span><span class="income-track" aria-hidden="true"><span class="income-segment income-after" style="width:${afterWidth}%" title="After-tax income ${money(row.after)}"></span><span class="income-segment income-ao" style="width:${aoWidth}%" title="Angolan tax ${money(data.foreignTax)}"></span><span class="income-segment income-us" style="width:${usWidth}%" title="US tax ${money(row.usTax)}"></span><span class="income-reference" style="left:${reference}%"></span></span><span class="income-value"><strong class="${row.after < 0 ? "negative" : ""}">${money(row.after)}</strong><small>After-tax income</small></span></button>`;
      })
      .join("");
    const epsilon = Math.max(amount, 1) * 1e-10;
    const highest = Math.max(...data.rows.map((row) => row.after));
    const best = data.rows.filter((row) => Math.abs(row.after - highest) <= epsilon);
    get("comparison-insight").textContent =
      best.length === data.rows.length
        ? "All three methods produce the same after-tax income here."
        : `${best.map((row) => row.name).join(" / ")}: highest after-tax income, ${money(highest)}.`;
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
      get("flow-insight").textContent = "Both countries tax the original fee; Angolan tax does not affect US tax.";
    } else if (selectedMethod === 1) {
      const reduction = data.usBeforeCredit - chosen.usTax;
      get("flow-insight").textContent = `The deduction reduces the tax base, lowering US tax by ${money(reduction)} in this case.`;
    } else if (data.foreignTax === 0) {
      get("flow-insight").textContent = "There is no Angolan tax to credit in this case.";
    } else if (data.limit === 0) {
      get("flow-insight").textContent =
        document.querySelector('input[name="mode"]:checked').value === "jordan"
          ? "Under this case’s simplified assumptions, the limit is $0 and Angolan tax cannot reduce US tax in this example."
          : "US tax and the credit limit are both $0 in this case.";
    } else if (data.foreignTax <= data.limit) {
      get("flow-insight").textContent = `The full ${money(data.foreignTax)} of Angolan tax is credited, reducing US tax by ${money(data.credit)}.`;
    } else {
      get("flow-insight").textContent = `The credit stops at the ${money(data.limit)} limit, leaving ${money(data.foreignTax - data.credit)} of Angolan tax uncredited.`;
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
        ? "US tax base = full consulting fee"
        : selectedMethod === 1
          ? `US tax base = ${money(Math.max(amount - data.foreignTax, 0))}`
          : `Credit = min(${money(data.foreignTax)}, ${money(data.limit)})`;
    get("calculation-steps").innerHTML = `<article class="calculation-step"><div class="step-heading"><span class="step-number">01</span><small>Angolan tax</small></div><p>${money(amount)} × ${ao.value}%</p><strong>${money(data.foreignTax)}</strong></article><article class="calculation-step"><div class="step-heading"><span class="step-number">02</span><small>US tax</small></div><p>${middle}</p><strong>${money(chosen.usTax)}</strong><em>${note}</em></article><article class="calculation-step"><div class="step-heading"><span class="step-number">03</span><small>After-tax income</small></div><p>${money(amount)} − ${money(data.foreignTax)} − ${money(chosen.usTax)}</p><strong class="${chosen.after < 0 ? "negative" : ""}">${money(chosen.after)}</strong></article>`;
  }

  function clearResults() {
    get("income-bars").innerHTML = '<div class="empty-state">Enter a fee to see where the income goes.</div>';
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
    get("flow-insight").textContent = "Enter a valid consulting fee.";
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
        ? "Enter a consulting fee."
        : "Enter a non-negative amount.";
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
      mode === "jordan" ? "US source · $0 in this case" : "100% foreign-source share · Credit up to the limit";
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
