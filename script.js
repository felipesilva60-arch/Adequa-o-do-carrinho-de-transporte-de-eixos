const $ = seletor => document.querySelector(seletor);
const $$ = seletor => [...document.querySelectorAll(seletor)];

const CHAVE = "rollmove_demo_v1";

let dados = {
  transportes: [],
  inspecoes: [],
  ordens: [],
  atividades: []
};

try {
  const salvo = localStorage.getItem(CHAVE);
  if (salvo) dados = { ...dados, ...JSON.parse(salvo) };
} catch (erro) {
  console.warn("Não foi possível recuperar os dados locais.");
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch (erro) {
    alert("Não foi possível salvar os dados neste navegador.");
  }

  atualizarPainel();
}

function escapar(texto = "") {
  return String(texto).replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caractere]);
}

function dataAtual() {
  return new Date().toLocaleString("pt-BR");
}

function aviso(mensagem) {
  const elemento = $("#toast");

  elemento.textContent = mensagem;
  elemento.classList.add("show");

  clearTimeout(aviso.timer);

  aviso.timer = setTimeout(() => {
    elemento.classList.remove("show");
  }, 3000);
}

function registrarAtividade(tipo, detalhe, status) {
  dados.atividades.unshift({
    data: dataAtual(),
    tipo,
    detalhe,
    status
  });

  dados.atividades = dados.atividades.slice(0, 30);
}

/* NAVEGAÇÃO ENTRE AS PÁGINAS */

function abrirPagina(nome) {
  $$(".page").forEach(pagina => {
    pagina.classList.toggle(
      "active",
      pagina.id === "page-" + nome
    );
  });

  $$(".nav button").forEach(botao => {
    botao.classList.toggle(
      "active",
      botao.dataset.page === nome
    );
  });

  const botao = $(`[data-page="${nome}"]`);

  if (botao) {
    $("#crumbCurrent").textContent =
      botao.textContent.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".nav button").forEach(botao => {
  botao.addEventListener("click", () => {
    abrirPagina(botao.dataset.page);
  });
});

$$("[data-go]").forEach(botao => {
  botao.addEventListener("click", () => {
    abrirPagina(botao.dataset.go);
  });
});

/* PAINEL GERAL */

function classeStatus(status) {
  if (status === "Concluída" || status === "Completa") return "ok";
  if (status === "Urgente" || status === "Pendente") return "bad";
  return "";
}

function atualizarPainel() {
  $("#metricTrans").textContent = dados.transportes.length;
  $("#metricIns").textContent = dados.inspecoes.length;

  $("#metricOrd").textContent = dados.ordens.filter(
    ordem => ordem.status !== "Concluída"
  ).length;

  $("#recentBody").innerHTML = dados.atividades.length
    ? dados.atividades.slice(0, 7).map(item => `
      <tr>
        <td>${escapar(item.data)}</td>
        <td>${escapar(item.tipo)}</td>
        <td>${escapar(item.detalhe)}</td>
        <td>
          <span class="status ${classeStatus(item.status)}">
            ${escapar(item.status)}
          </span>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="4" class="empty">
        Nenhuma atividade registrada.
      </td></tr>`;

  atualizarHistoricoInspecoes();
  atualizarOrdens();
}

/* REGISTRO DE TRANSPORTE */

const formularioTransporte = $("#transportForm");

formularioTransporte.addEventListener("submit", evento => {
  evento.preventDefault();

  const verificacoes = $$("#transportForm input[type='checkbox']");
  const conferidos = verificacoes.filter(item => item.checked).length;

  if (conferidos !== verificacoes.length) {
    aviso("Confira os três itens antes de registrar.");
    return;
  }

  if ($("#axisCount").value !== "2") {
    aviso("O desafio exige transportar dois eixos simultaneamente.");
    return;
  }

  const transporte = {
    data: dataAtual(),
    operador: $("#operator").value.trim(),
    eixos: 2,
    trajeto: $("#route").value,
    observacao: $("#loadNote").value.trim()
  };

  dados.transportes.push(transporte);

  registrarAtividade(
    "Transporte",
    "2 eixos — " + transporte.trajeto,
    "Registrado"
  );

  salvar();
  formularioTransporte.reset();

  aviso("Movimentação demonstrativa registrada.");
  abrirPagina("dashboard");
});

/* CHECKLIST DE INSPEÇÃO */

const caixasInspecao = $$("#inspectionChecks input[type='checkbox']");

function atualizarChecklist() {
  const quantidade = caixasInspecao.filter(
    caixa => caixa.checked
  ).length;

  $("#inspectionProgress").style.width =
    (quantidade / caixasInspecao.length * 100) + "%";

  $("#inspectionCount").textContent =
    `${quantidade} de ${caixasInspecao.length} itens conferidos`;

  $("#inspectionMessage").textContent =
    quantidade === caixasInspecao.length
      ? "Todos os itens foram marcados. A validação técnica presencial continua necessária."
      : "Inspeção ainda não concluída.";
}

caixasInspecao.forEach(caixa => {
  caixa.addEventListener("change", atualizarChecklist);
});

$("#saveInspection").addEventListener("click", () => {
  const quantidade = caixasInspecao.filter(
    caixa => caixa.checked
  ).length;

  const inspecao = {
    data: dataAtual(),
    itens: quantidade,
    observacao: $("#inspectionNote").value.trim()
  };

  dados.inspecoes.push(inspecao);

  registrarAtividade(
    "Inspeção",
    `${quantidade}/5 itens conferidos`,
    quantidade === 5 ? "Completa" : "Pendente"
  );

  salvar();

  aviso(
    quantidade === 5
      ? "Checklist salvo. A validação presencial ainda é necessária."
      : "Inspeção salva com pendências."
  );
});

function atualizarHistoricoInspecoes() {
  $("#inspectionBody").innerHTML = dados.inspecoes.length
    ? [...dados.inspecoes].reverse().map(item => `
      <tr>
        <td>${escapar(item.data)}</td>
        <td>${item.itens}/5</td>
        <td>${escapar(item.observacao || "Sem observações")}</td>
        <td>
          <span class="status ${item.itens === 5 ? "ok" : ""}">
            ${item.itens === 5 ? "Completa" : "Pendente"}
          </span>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="4" class="empty">
        Nenhuma inspeção salva.
      </td></tr>`;
}

/* ORDENS DE SERVIÇO */

$("#orderForm").addEventListener("submit", evento => {
  evento.preventDefault();

  const ordem = {
    id: Date.now(),
    codigo: "OS-" + String(dados.ordens.length + 1).padStart(4, "0"),
    data: dataAtual(),
    titulo: $("#orderTitle").value.trim(),
    tipo: $("#orderType").value,
    prioridade: $("#orderPriority").value,
    descricao: $("#orderDesc").value.trim(),
    status: "Aberta"
  };

  dados.ordens.push(ordem);

  registrarAtividade(
    "Ordem de serviço",
    ordem.codigo + " — " + ordem.titulo,
    ordem.status
  );

  salvar();
  evento.target.reset();

  aviso("Ordem " + ordem.codigo + " criada.");
});

function atualizarOrdens() {
  $("#ordersBody").innerHTML = dados.ordens.length
    ? [...dados.ordens].reverse().map(ordem => {
        let acao = "";

        if (ordem.status === "Aberta") {
          acao = `<button class="btn secondary"
                    data-ordem="${ordem.id}"
                    data-status="Em andamento">Iniciar</button>`;
        } else if (ordem.status === "Em andamento") {
          acao = `<button class="btn green"
                    data-ordem="${ordem.id}"
                    data-status="Concluída">Concluir</button>`;
        } else {
          acao = "Finalizada";
        }

        return `
          <tr>
            <td>${escapar(ordem.codigo)}</td>
            <td>
              <strong>${escapar(ordem.titulo)}</strong><br>
              ${escapar(ordem.tipo)}
            </td>
            <td>${escapar(ordem.prioridade)}</td>
            <td>
              <span class="status ${classeStatus(ordem.status)}">
                ${escapar(ordem.status)}
              </span>
            </td>
            <td>${acao}</td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="5" class="empty">
        Nenhuma ordem aberta.
      </td></tr>`;
}

$("#ordersBody").addEventListener("click", evento => {
  const botao = evento.target.closest("[data-ordem]");
  if (!botao) return;

  const ordem = dados.ordens.find(
    item => item.id === Number(botao.dataset.ordem)
  );

  if (!ordem) return;

  ordem.status = botao.dataset.status;

  registrarAtividade(
    "Ordem de serviço",
    ordem.codigo + " — " + ordem.titulo,
    ordem.status
  );

  salvar();
  aviso("Ordem atualizada: " + ordem.status);
});

/* EXPORTAR REGISTROS */

$("#exportData").addEventListener("click", () => {
  const arquivo = new Blob(
    [JSON.stringify(dados, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = url;
  link.download = "rollmove-registros.json";
  link.click();

  URL.revokeObjectURL(url);
});

/* LIMPAR DADOS */

$("#clearData").addEventListener("click", () => {
  const confirmar = confirm(
    "Deseja apagar todos os registros deste navegador?"
  );

  if (!confirmar) return;

  dados = {
    transportes: [],
    inspecoes: [],
    ordens: [],
    atividades: []
  };

  localStorage.removeItem(CHAVE);

  atualizarPainel();
  aviso("Dados locais apagados.");
});

/* INICIALIZAÇÃO */

atualizarChecklist();
atualizarPainel();
