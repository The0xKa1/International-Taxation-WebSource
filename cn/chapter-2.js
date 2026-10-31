(() => {
  const form = document.querySelector("#scenario");
  const byId = (id) => document.getElementById(id);
  const ids = ["days", "workdays", "salary", "totalwork", "remote", "months"];
  const number = new Intl.NumberFormat("zh-CN", {
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
    status.textContent = "请先完善左侧情境参数。";
    list("personal-results", ["请先完善左侧情境参数。"]);
    list("enterprise-results", ["请先完善左侧情境参数。"]);
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
      error = "请填写所有数字参数。";
    else if (fields.some((field) => !field.validity.valid))
      error = "请检查数字范围，并以整数填写天数和月份。";
    const [days, workdays, salary, totalwork, remote, months] = fields.map(
      (field) => Number(field.value),
    );
    if (!error && (workdays > days || workdays > totalwork)) {
      error = "B 国实际工作日不能大于停留天数或年度总工作日。";
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
      home && localResidenceSignal ? "需要进一步判断" : "线索未同时出现",
    );
    text("workday-percent", `${percent}%`);
    text("salary-percent", `${percent}%`);
    byId("workday-bar").innerHTML =
      `<span class="allocation-local" style="width:${share * 100}%" title="B 国 ${workdays} 天"></span><span class="allocation-other" style="width:${100 - share * 100}%" title="其他 ${totalwork - workdays} 天"></span>`;
    byId("allocation-bar").innerHTML =
      `<span class="allocation-local" style="width:${share * 100}%" title="B 国 ${money(localSalary)}"></span><span class="allocation-other" style="width:${100 - share * 100}%" title="其余 ${money(salary - localSalary)}"></span>`;
    byId("allocation-labels").innerHTML =
      `<span><i style="--c:#6f896f"></i>B 国 ${money(localSalary)}</span><span><i style="--c:#c7b9a7"></i>其余工作日 ${money(salary - localSalary)}</span>`;
    text(
      "allocation-formula",
      `${money(salary)} × (${workdays} ÷ ${totalwork}) = ${money(localSalary)}`,
    );
    byId("condition-cards").innerHTML = [
      [days <= 183, "停留不超过 183 天", `当前 ${days} 天`],
      [
        !employer,
        "雇主非 B 国居民",
        employer ? "当地居民雇主" : "非当地居民雇主",
      ],
      [
        !borne,
        "工资非当地常设机构负担",
        borne ? "当地机构负担" : "非当地机构负担",
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
      ? "<strong>三项常见条件均满足</strong><span>继续核对协定居民身份、计算期间与适用条款。</span>"
      : "<strong>暂不满足全部条件</strong><span>查看未通过项；这只是例外条件分析，不是最终征税结论。</span>";
    list("personal-results", [
      `B 国停留 ${days} 天。教学情境以年度 183 天作为居民身份的一个观察点；实际居民标准由相关国家法律确定。`,
      `按工作日比例，${money(localSalary)} 工资与 B 国劳动相联系（${workdays} ÷ ${totalwork}）。`,
      exception
        ? "在本例的简化条件下，短期受雇例外的三项常见条件均已满足；还需确认协定居民身份、计算期间及适用协定。"
        : "在本例的简化条件下，短期受雇例外至少有一项常见条件尚未满足。",
      home && localResidenceSignal
        ? "A 国联系和 B 国停留天数同时提示居民身份线索，可继续依据适用协定分析双重居民问题。"
        : "分别考察两国国内法下的居民身份；如同时构成居民，再查看适用协定的居民条款。",
    ]);
    const activity = byId("activity").value;
    const contract = byId("contract").checked || activity === "sales";
    const personal = byId("personalReason").checked;
    const business = byId("businessReason").checked;
    const office = byId("office").checked;
    const activityLabel = {
      aux: "辅助活动",
      core: "核心业务",
      sales: "客户与合同",
    }[activity];
    byId("enterprise-paths").innerHTML = `
      <article class="pathway home-pathway">
        <header class="pathway-header"><span class="path-index">01</span><div><h3>住所办公</h3><p>固定营业场所路径</p></div><span class="path-tag ${remote >= 50 ? "review" : "usually-no-place"}">${remote >= 50 ? "继续审查" : "通常不构成场所"}</span></header>
        <div class="use-meter" aria-label="住所工作比例 ${remote}%，50% 为观察点"><span style="width:${remote}%"></span><i aria-hidden="true"></i></div>
        <div class="meter-labels"><strong>住所工作 ${remote}%</strong><span>50% 观察点</span></div>
        <div class="fact-chips"><span>持续 ${months} 个月</span><span class="${business ? "signal" : ""}">${business ? "有企业商业理由" : "未选企业商业理由"}</span><span>${personal ? "有个人原因" : "未选个人原因"}</span><span class="${office ? "signal" : ""}">${office ? "A 国无可用办公室" : "未显示 A 国办公室停用"}</span></div>
        <p class="path-status">${remote >= 50 ? "达到 50% 不自动形成常设机构；继续考察持续使用、商业理由与办公安排。" : "低于 50%，通常不构成企业营业场所；仍需结合完整事实复核。"}</p>
      </article>
      <article class="pathway contract-pathway">
        <header class="pathway-header"><span class="path-index">02</span><div><h3>合同活动</h3><p>代理人常设机构路径</p></div><span class="path-tag">独立判断</span></header>
        <div class="contract-route"><span class="route-node active">${activityLabel}</span><i class="route-arrow">→</i><span class="route-node ${contract ? "active" : ""}">${contract ? "经常订约，或主导且通常不实质修改" : "未显示经常订约"}</span><i class="route-arrow">→</i><span class="route-node analysis-node">核对实际作用与协定条件</span></div>
        <p class="path-status">${contract ? "出现合同作用线索；继续分析代理人常设机构，而非直接得出成立结论。" : "当前未显示经常订约线索；可进一步了解合同谈判与审批过程。"}</p>
      </article>`;
    list("enterprise-results", [
      `住所工作比例为 ${remote}%，持续 ${months} 个月。${remote < 50 ? "比例低于 50%，该住所通常不构成企业营业场所，仍需结合完整事实复核。" : "比例达到 50%，不自动形成常设机构，可继续考察使用是否持续以及企业是否有商业理由。"}`,
      `${personal ? "员工有个人或家庭原因。" : "未勾选员工的个人或家庭原因。"}${business ? "企业也有利用当地位置开展业务的商业理由。" : "未勾选企业利用当地位置的商业理由。"}${office ? "企业未在 A 国继续提供可使用的办公室。" : "企业是否继续提供办公室，当前未显示否定事实。"}`,
      activity === "aux"
        ? "所选活动为内部支持或准备性、辅助性活动，需结合实际职能分析。"
        : activity === "core"
          ? "所选活动为企业核心业务，需要结合实际职能分析。"
          : "所选活动包括持续开发客户和主导合同条件。",
      contract
        ? "合同相关事实提示应单独考察代理人常设机构，包括员工的实际合同作用及适用协定。"
        : "当前未选择主导合同或经常订约的事实，可进一步了解合同谈判与审批过程。",
      "如形成常设机构，还需分析归属于该机构的职能、资产、风险及利润。",
    ]);
  }
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("reset", () => setTimeout(update, 0));
  update();
})();
