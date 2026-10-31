(() => {
  const form = document.querySelector("#scenario");
  const byId = (id) => document.getElementById(id);
  const ids = ["days", "workdays", "salary", "totalwork", "remote", "months"];
  const text = (id, value) => {
    byId(id).textContent = value;
  };
  const list = (id, values) => {
    const element = byId(id);
    element.replaceChildren(
      ...values.map((value) => {
        const item = document.createElement("li");
        item.textContent = value;
        return item;
      }),
    );
  };
  const money = (value) =>
    "¥" +
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

  function update() {
    const fields = ids.map(byId);
    let error = "";
    if (fields.some((field) => field.value.trim() === ""))
      error = "Fill in all numeric inputs.";
    else if (fields.some((field) => !field.validity.valid))
      error = "Check the ranges. Days and months must be whole numbers.";
    const [days, workdays, salary, totalwork, remote, months] = fields.map(
      (field) => Number(field.value),
    );
    if (!error && (workdays > days || workdays > totalwork))
      error =
        "Days worked in the work country cannot exceed days of presence or total annual workdays.";
    const errorNode = byId("form-error");
    errorNode.hidden = !error;
    errorNode.textContent = error;
    if (error) {
      [
        "allocation-formula",
        "allocation-bar",
        "allocation-labels",
        "condition-cards",
        "enterprise-paths",
      ].forEach((id) => byId(id).replaceChildren());
      text("sourceSalary", "—");
      text("resident", "—");
      list("personal-results", ["Complete the case inputs first."]);
      list("enterprise-results", ["Complete the case inputs first."]);
      return;
    }
    const home = byId("homeResident").checked;
    const employer = byId("hostEmployer").checked;
    const borne = byId("borne").checked;
    const localResidenceSignal = days >= 183;
    text("sourceSalary", money((salary * workdays) / totalwork));
    text(
      "resident",
      home && localResidenceSignal
        ? "Further assessment needed"
        : "No joint indicators",
    );
    const exception = days <= 183 && !employer && !borne;
    const share = workdays / totalwork,
      localSalary = salary * share;
    text(
      "allocation-formula",
      `${money(salary)} × ${workdays} / ${totalwork} = ${money(localSalary)}`,
    );
    byId("allocation-bar").innerHTML =
      `<span style="width:${share * 100}%"></span>`;
    text(
      "allocation-labels",
      `Work country ${money(localSalary)} (${(share * 100).toFixed(1)}%) · Other workdays ${money(salary - localSalary)}`,
    );
    byId("condition-cards").innerHTML = [
      [days <= 183, "Stay of at most 183 days", `Current stay: ${days} days`],
      [
        !employer,
        "Employer is not resident in the work country",
        employer
          ? "Local resident employer selected"
          : "Local resident employer not selected",
      ],
      [
        !borne,
        "Salary is not borne by a local PE",
        borne
          ? "Local PE bears salary: selected"
          : "Local PE bears salary: not selected",
      ],
    ]
      .map(
        ([pass, title, detail]) =>
          `<div class="condition ${pass ? "pass" : "fail"}"><strong>${pass ? "✓" : "○"} ${title}</strong><span>${detail}</span></div>`,
      )
      .join("");
    list("personal-results", [
      `Stay in work country: ${days} days. This teaching case uses 183 days per year as one residence indicator; actual residence rules are set by domestic law.`,
      `By workday allocation, ${money((salary * workdays) / totalwork)} of salary relates to work in the work country (${workdays} ÷ ${totalwork}).`,
      exception
        ? "All three common conditions for the short-term employment exception are met in this simplified case. Confirm treaty residence, the counting period and the applicable treaty."
        : "At least one common condition for the short-term employment exception is not met in this simplified case.",
      home && localResidenceSignal
        ? "Home-country ties and days in the work country both indicate possible residence. Consider dual residence under the applicable treaty."
        : "Assess residence under each country’s domestic law. If both treat the employee as resident, consult the treaty residence article.",
    ]);
    const activity = byId("activity").value;
    const contract = byId("contract").checked || activity === "sales";
    const personal = byId("personalReason").checked;
    const business = byId("businessReason").checked;
    byId("enterprise-paths").innerHTML =
      `<article class="pathway"><h3>Home office → Fixed place of business</h3><p>Work at home: ${remote}% · Duration: ${months} months</p><p>${business ? "A business reason is present" : "No business reason selected"}${personal ? "; personal reasons are also present" : ""}.</p><p class="path-status">${remote >= 50 ? "Examine usage arrangements and business reasons" : "Examine the facts of home-office use"}</p></article><article class="pathway"><h3>Contracts → Agency PE</h3><p>${contract ? "A leading contract role or habitual contracting is indicated." : "No leading contract role or habitual contracting is indicated."}</p><p class="path-status">${contract ? "Assess the contract role and treaty conditions separately" : "Examine contract negotiation and approval"}</p></article>`;
    list("enterprise-results", [
      `Work at home accounts for ${remote}% over ${months} months. ${remote < 50 ? "The share is below 50%. Examine home-office use in light of the facts." : "The share reaches 50%. Examine continuity of use and the company’s business reasons."}`,
      `${personal ? "The employee has personal or family reasons. " : "No personal or family reasons selected. "}${business ? "The company also has a business reason to use the location. " : "No business reason to use the location selected. "}${byId("office").checked ? "The company no longer provides an available office in the home country." : "The inputs do not indicate that the company has stopped providing an office."}`,
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
