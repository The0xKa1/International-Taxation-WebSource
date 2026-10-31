(() => {
  const get = (id) => document.getElementById(id);
  const fee = get("fee"),
    us = get("us-rate"),
    ao = get("ao-rate");
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
  const money = (amount) => currency.format(amount);
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
    return { foreignTax, limit, credit, rows };
  }
  function draw(amount, usRate, aoRate, mode) {
    const canvas = get("chart"),
      rect = canvas.getBoundingClientRect(),
      dpr = window.devicePixelRatio || 1;
    if (!rect.width || !rect.height) return;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width,
      h = rect.height,
      p = { l: 65, r: 15, t: 16, b: 32 },
      pw = w - p.l - p.r,
      ph = h - p.t - p.b;
    const range = Math.max(amount, 1),
      x = (r) => p.l + r * pw,
      y = (v) => p.t + ((range - v) / (2 * range)) * ph;
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#777";
    ctx.strokeStyle = "#e6e0d8";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    [-1, -0.5, 0, 0.5, 1].forEach((n) => {
      const yy = y(range * n);
      ctx.beginPath();
      ctx.moveTo(p.l, yy);
      ctx.lineTo(w - p.r, yy);
      ctx.stroke();
      ctx.fillText(money(amount * n), p.l - 6, yy);
    });
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    [0, 0.25, 0.5, 0.75, 1].forEach((n) =>
      ctx.fillText(`${n * 100}%`, x(n), h - p.b + 8),
    );
    ["#c17a54", "#49758b", "#72936a"].forEach((color, i) => {
      ctx.beginPath();
      for (let n = 0; n <= 100; n++) {
        const v = calculate(amount, usRate, n / 100, mode).rows[i].after;
        n ? ctx.lineTo(x(n / 100), y(v)) : ctx.moveTo(x(0), y(v));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(i === 2 ? [6, 4] : []);
      ctx.stroke();
    });
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = "#8a8176";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x(aoRate), p.t);
    ctx.lineTo(x(aoRate), h - p.b);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  let selectedMethod = 2;
  function render() {
    const raw = fee.value.trim();
    const valid =
      raw !== "" && Number.isFinite(Number(raw)) && Number(raw) >= 0;
    get("fee-error").textContent = valid
      ? ""
      : raw === ""
        ? "Enter a consulting fee."
        : "Enter a non-negative amount.";
    fee.setAttribute("aria-invalid", String(!valid));
    get("us-output").textContent = `${us.value}%`;
    get("ao-output").textContent = `${ao.value}%`;
    const mode = document.querySelector('input[name="mode"]:checked').value;
    get("mode-note").textContent =
      mode === "jordan"
        ? "For US-source income, the credit limit is zero."
        : "For assumed foreign-source income, the credit is the lower of Angolan tax and the US credit limit.";
    if (!valid) {
      get("income-bars").textContent = "Enter an amount to see the comparison.";
      get("calculation-steps").replaceChildren();
      ["ao-tax", "credit-limit", "credit"].forEach(
        (id) => (get(id).textContent = "—"),
      );
      get("results-body").innerHTML = "";
      const canvas = get("chart");
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const amount = Number(raw),
      ur = Number(us.value) / 100,
      ar = Number(ao.value) / 100,
      data = calculate(amount, ur, ar, mode);
    get("ao-tax").textContent = money(data.foreignTax);
    get("credit-limit").textContent = money(data.limit);
    get("credit").textContent = money(data.credit);
    get("results-body").innerHTML = data.rows
      .map(
        (row) =>
          `<tr><th scope="row">${row.name}</th><td>${money(data.foreignTax)}</td><td>${money(row.usTax)}</td><td>${money(row.total)}</td><td>${money(row.after)}</td></tr>`,
      )
      .join("");
    get("income-bars").innerHTML = data.rows
      .map(
        (row, i) =>
          `<div class="income-row"><header><span>${row.name}</span><strong>${money(row.after)}</strong></header><div class="income-track"><div class="income-fill" style="width:${amount ? Math.max(0, (row.after / amount) * 100) : 0}%;background:${["#b67c59", "#49758b", "#718a7a"][i]}"></div></div><small>Combined tax ${money(row.total)}</small></div>`,
      )
      .join("");
    const chosen = data.rows[selectedMethod];
    const middle =
      selectedMethod === 0
        ? `${money(amount)} × ${us.value}%`
        : selectedMethod === 1
          ? `(${money(amount)} − ${money(data.foreignTax)}) × ${us.value}%`
          : `${money(amount * ur)} − ${money(data.credit)}`;
    const note =
      selectedMethod === 2
        ? `Credit = min(${money(data.foreignTax)}, ${money(data.limit)})`
        : selectedMethod === 1
          ? "Deduct Angolan tax, then calculate US tax on the remaining base."
          : "Calculate US tax on the full fee.";
    get("calculation-steps").innerHTML =
      `<div class="calculation-step"><small>01 · Angolan tax</small><p>${money(amount)} × ${ao.value}%</p><strong>${money(data.foreignTax)}</strong></div><div class="calculation-step"><small>02 · US tax</small><p>${middle}</p><strong>${money(chosen.usTax)}</strong><em>${note}</em></div><div class="calculation-step"><small>03 · After-tax income</small><p>${money(amount)} − ${money(data.foreignTax)} − ${money(chosen.usTax)}</p><strong>${money(chosen.after)}</strong></div>`;
    draw(amount, ur, ar, mode);
  }
  [fee, us, ao, ...document.querySelectorAll('input[name="mode"]')].forEach(
    (input) => input.addEventListener("input", render),
  );
  get("reset").addEventListener("click", () => {
    fee.value = "5000";
    us.value = "50";
    ao.value = "50";
    document.querySelector('input[value="comparison"]').checked = true;
    render();
  });
  document.querySelectorAll("[data-method]").forEach((button) =>
    button.addEventListener("click", () => {
      selectedMethod = Number(button.dataset.method);
      document
        .querySelectorAll("[data-method]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      render();
    }),
  );
  window.addEventListener("resize", render);
  render();
})();
