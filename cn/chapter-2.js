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
    new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value);

  function update() {
    const fields = ids.map(byId);
    let error = "";
    if (fields.some((field) => field.value.trim() === ""))
      error = "请填写所有数字参数。";
    else if (fields.some((field) => !field.validity.valid))
      error = "请检查数字范围，并以整数填写天数和月份。";
    const [days, workdays, salary, totalwork, remote, months] = fields.map(
      (field) => Number(field.value),
    );
    if (!error && (workdays > days || workdays > totalwork))
      error = "工作国实际工作日不能大于同年度的停留天数或年度总工作日。";
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
      list("personal-results", ["请先完善左侧情境参数。"]);
      list("enterprise-results", ["请先完善左侧情境参数。"]);
      return;
    }
    const home = byId("homeResident").checked;
    const employer = byId("hostEmployer").checked;
    const borne = byId("borne").checked;
    const localResidenceSignal = days >= 183;
    text("sourceSalary", money((salary * workdays) / totalwork));
    text(
      "resident",
      home && localResidenceSignal ? "需要进一步判断" : "线索未同时出现",
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
      `工作国 ${money(localSalary)}（${(share * 100).toFixed(1)}%） · 其余工作日 ${money(salary - localSalary)}`,
    );
    byId("condition-cards").innerHTML = [
      [days <= 183, "停留不超过 183 天", `当前 ${days} 天`],
      [
        !employer,
        "雇主非工作国居民",
        employer ? "已勾选当地居民雇主" : "未勾选当地居民雇主",
      ],
      [
        !borne,
        "工资非当地常设机构负担",
        borne ? "已勾选当地机构负担" : "未勾选当地机构负担",
      ],
    ]
      .map(
        ([pass, title, detail]) =>
          `<div class="condition ${pass ? "pass" : "fail"}"><strong>${pass ? "✓" : "○"} ${title}</strong><span>${detail}</span></div>`,
      )
      .join("");
    list("personal-results", [
      `工作国停留 ${days} 天。教学情境以年度 183 天作为居民身份的一个观察点；实际居民标准由相关国家法律确定。`,
      `按工作日比例，${money((salary * workdays) / totalwork)} 工资与工作国劳动相联系（${workdays} ÷ ${totalwork}）。`,
      exception
        ? "在本例的简化条件下，短期受雇例外的三项常见条件均已满足；还需确认协定居民身份、计算期间及适用协定。"
        : "在本例的简化条件下，短期受雇例外至少有一项常见条件尚未满足。",
      home && localResidenceSignal
        ? "原居住国联系和工作国停留天数同时提示居民身份线索，可继续依据适用协定分析双重居民问题。"
        : "分别考察两国国内法下的居民身份；如同时构成居民，再查看适用协定的居民条款。",
    ]);
    const activity = byId("activity").value;
    const contract = byId("contract").checked || activity === "sales";
    const personal = byId("personalReason").checked;
    const business = byId("businessReason").checked;
    byId("enterprise-paths").innerHTML =
      `<article class="pathway"><h3>住所使用 → 固定营业场所</h3><p>住所工作 ${remote}% · 持续 ${months} 个月</p><p>${business ? "存在企业商业理由" : "当前未选择企业商业理由"}${personal ? "；个人原因也同时存在" : ""}。</p><p class="path-status">${remote >= 50 ? "继续考察使用安排与商业理由" : "结合住所使用事实分析"}</p></article><article class="pathway"><h3>合同活动 → 代理人常设机构</h3><p>${contract ? "已输入主导合同或经常订约的事实。" : "当前未输入主导合同或经常订约的事实。"}</p><p class="path-status">${contract ? "单独分析合同作用与协定条件" : "补充了解合同谈判与审批过程"}</p></article>`;
    list("enterprise-results", [
      `住所工作比例为 ${remote}%，持续 ${months} 个月。${remote < 50 ? "比例低于 50%，可结合具体事实考察住所的使用。" : "比例达到 50%，可继续考察使用是否持续以及企业是否有商业理由。"}`,
      `${personal ? "员工有个人或家庭原因。" : "未勾选员工的个人或家庭原因。"}${business ? "企业也有利用当地位置开展业务的商业理由。" : "未勾选企业利用当地位置的商业理由。"}${byId("office").checked ? "企业未在原居住国继续提供可使用的办公室。" : "企业是否继续提供办公室，当前未显示否定事实。"}`,
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
