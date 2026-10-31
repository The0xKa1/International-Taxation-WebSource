(() => {
  const form = document.querySelector("#scenario");
  const byId = (id) => document.getElementById(id);
  const ids = ["days", "workdays", "salary", "totalwork", "remote", "months"];
  const number = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const text = (id, value) => {
    byId(id).textContent = value;
  };
  const list = (id, values) => {
    byId(id).replaceChildren(
      ...values.map((value) => {
        const item = document.createElement("li");
        item.textContent = value;
        return item;
      }),
    );
  };
  const money = (value) => `¥${number.format(value)}`;

  function clearResults() {
    [
      "workday-bar",
      "allocation-formula",
      "allocation-bar",
      "allocation-labels",
      "condition-cards",
      "enterprise-paths",
    ].forEach((id) => byId(id).replaceChildren());
    ["sourceSalary", "resident", "workday-percent", "salary-percent"].forEach(
      (id) => text(id, "—"),
    );
    const status = byId("exception-status");
    status.className = "exception-summary";
    status.textContent = "Complete the case inputs first.";
    list("personal-results", ["Complete the case inputs first."]);
    list("enterprise-results", ["Complete the case inputs first."]);
  }

  function update() {
    const fields = ids.map(byId);
    let error = "";
    fields.forEach((field) => {
      field.setAttribute(
        "aria-invalid",
        String(field.value.trim() === "" || !field.validity.valid),
      );
    });
    if (fields.some((field) => field.value.trim() === ""))
      error = "Fill in all numeric inputs.";
    else if (fields.some((field) => !field.validity.valid))
      error = "Check the ranges. Days and months must be whole numbers.";
    const [days, workdays, salary, totalwork, remote, months] = fields.map(
      (field) => Number(field.value),
    );
    if (!error && (workdays > days || workdays > totalwork)) {
      error = "Days worked in B cannot exceed days of presence or total annual workdays.";
      byId("workdays").setAttribute("aria-invalid", "true");
    }
    const errorNode = byId("form-error");
    errorNode.hidden = !error;
    errorNode.textContent = error;
    if (error) {
      clearResults();
      return;
    }
    const home = byId("homeResident").checked;
    const employer = byId("hostEmployer").checked;
    const borne = byId("borne").checked;
    const localResidenceSignal = days >= 183;
    const exception = days <= 183 && !employer && !borne;
    const share = workdays / totalwork;
    const localSalary = salary * share;
    const percent = (share * 100).toFixed(1);
    text("sourceSalary", money(localSalary));
    text(
      "resident",
      home && localResidenceSignal
        ? "Further assessment needed"
        : "No joint indicators",
    );
    text("workday-percent", `${percent}%`);
    text("salary-percent", `${percent}%`);
    byId("workday-bar").innerHTML =
      `<span class="allocation-local" style="width:${share * 100}%" title="Country B: ${workdays} days"></span><span class="allocation-other" style="width:${100 - share * 100}%" title="Other: ${totalwork - workdays} days"></span>`;
    byId("allocation-bar").innerHTML =
      `<span class="allocation-local" style="width:${share * 100}%" title="Country B: ${money(localSalary)}"></span><span class="allocation-other" style="width:${100 - share * 100}%" title="Other workdays: ${money(salary - localSalary)}"></span>`;
    byId("allocation-labels").innerHTML =
      `<span><i style="--c:#6f896f"></i>Country B ${money(localSalary)}</span><span><i style="--c:#c7b9a7"></i>Other workdays ${money(salary - localSalary)}</span>`;
    text(
      "allocation-formula",
      `${money(salary)} × (${workdays} ÷ ${totalwork}) = ${money(localSalary)}`,
    );
    byId("condition-cards").innerHTML = [
      [days <= 183, "Stay of at most 183 days", `${days} days`],
      [
        !employer,
        "Employer is not resident in B",
        employer ? "Local resident employer" : "Nonresident employer",
      ],
      [
        !borne,
        "Salary is not borne by a local PE",
        borne ? "Borne by local PE" : "Not borne by local PE",
      ],
    ]
      .map(
        ([pass, title, detail]) =>
          `<div class="condition ${pass ? "pass" : "fail"}"><strong><span class="condition-icon">${pass ? "✓" : "×"}</span>${title}</strong><span>${detail}</span></div>`,
      )
      .join("");
    const exceptionStatus = byId("exception-status");
    exceptionStatus.className = `exception-summary ${exception ? "pass" : "fail"}`;
    exceptionStatus.innerHTML = exception
      ? "<strong>All three common conditions are met</strong><span>Confirm treaty residence, the counting period, and the applicable article.</span>"
      : "<strong>Not all conditions are met</strong><span>Review the failed items. This exception analysis is not a final tax conclusion.</span>";
    list("personal-results", [
      `Stay in Country B: ${days} days. This teaching case uses 183 days per year as one residence indicator; actual residence rules are set by domestic law.`,
      `By workday allocation, ${money(localSalary)} of salary relates to work in Country B (${workdays} ÷ ${totalwork}).`,
      exception
        ? "All three common conditions for the short-term employment exception are met in this simplified case. Confirm treaty residence, the counting period and the applicable treaty."
        : "At least one common condition for the short-term employment exception is not met in this simplified case.",
      home && localResidenceSignal
        ? "Country A ties and days in Country B both indicate possible residence. Consider dual residence under the applicable treaty."
        : "Assess residence under each country’s domestic law. If both treat the employee as resident, consult the treaty residence article.",
    ]);
    const activity = byId("activity").value;
    const contract = byId("contract").checked || activity === "sales";
    const personal = byId("personalReason").checked;
    const business = byId("businessReason").checked;
    const office = byId("office").checked;
    const activityLabel = {
      aux: "Auxiliary activities",
      core: "Core business",
      sales: "Clients and contracts",
    }[activity];
    byId("enterprise-paths").innerHTML = `
      <article class="pathway home-pathway">
        <header class="pathway-header"><span class="path-index">01</span><div><h3>Home office</h3><p>Fixed-place-of-business path</p></div><span class="path-tag ${remote >= 50 ? "review" : "usually-no-place"}">${remote >= 50 ? "Examine further" : "Usually not a place of business"}</span></header>
        <div class="use-meter" aria-label="Work at home: ${remote}%; 50% observation point"><span style="width:${remote}%"></span><i aria-hidden="true"></i></div>
        <div class="meter-labels"><strong>Work at home ${remote}%</strong><span>50% observation point</span></div>
        <div class="fact-chips"><span>${months} months</span><span class="${business ? "signal" : ""}">${business ? "Business reason present" : "No business reason selected"}</span><span>${personal ? "Personal reasons present" : "No personal reasons selected"}</span><span class="${office ? "signal" : ""}">${office ? "No available office in A" : "No office closure indicated"}</span></div>
        <p class="path-status">${remote >= 50 ? "Reaching 50% does not automatically create a PE; examine continuity, business reasons, and office arrangements." : "Below 50%, the home usually is not a place of business; review the complete facts nevertheless."}</p>
      </article>
      <article class="pathway contract-pathway">
        <header class="pathway-header"><span class="path-index">02</span><div><h3>Contract activities</h3><p>Agency permanent establishment path</p></div><span class="path-tag">Assess separately</span></header>
        <div class="contract-route"><span class="route-node active">${activityLabel}</span><i class="route-arrow">→</i><span class="route-node ${contract ? "active" : ""}">${contract ? "Habitual contracting, or leading terms without material changes" : "No habitual contracting indicated"}</span><i class="route-arrow">→</i><span class="route-node analysis-node">Check actual role and treaty conditions</span></div>
        <p class="path-status">${contract ? "Contract-role indicators are present; assess agency PE rather than treating them as a conclusive result." : "No habitual contracting is indicated; examine contract negotiation and approval further."}</p>
      </article>`;
    list("enterprise-results", [
      `Work at home accounts for ${remote}% over ${months} months. ${remote < 50 ? "The share is below 50%, so the home usually is not a place of business; review the complete facts nevertheless." : "The share reaches 50%, which does not automatically create a PE. Examine continuity of use and the company’s business reasons."}`,
      `${personal ? "The employee has personal or family reasons. " : "No personal or family reasons selected. "}${business ? "The company also has a business reason to use the location. " : "No business reason to use the location selected. "}${office ? "The company no longer provides an available office in Country A." : "The inputs do not indicate that the company has stopped providing an office."}`,
      activity === "aux"
        ? "Internal support or preparatory / auxiliary activities selected. Assess the actual functions."
        : activity === "core"
          ? "Core business activities selected. Assess the actual functions."
          : "Activities include ongoing client development and leading contract terms.",
      contract
        ? "The contract facts call for a separate agency-PE analysis, considering the employee’s actual role and the applicable treaty."
        : "No leading contract role or habitual contracting is selected. Examine contract negotiation and approval.",
      "If a permanent establishment exists, assess the functions, assets, risks and profits attributable to it.",
    ]);
  }
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("reset", () => setTimeout(update, 0));
  update();
})();
