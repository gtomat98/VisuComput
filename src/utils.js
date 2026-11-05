export const formatarNumero = valor => valor == null ? '—' : new Intl.NumberFormat('pt-BR').format(valor);
export const somar = valores => valores.reduce((acumulado, atual) => acumulado + (Number(atual) || 0), 0);
export const calcularPercentual = (parte, total) => total ? (parte / total) * 100 : null;
export const normalizarBusca = texto => texto.trim().toLocaleLowerCase('pt-BR');

export const layoutBase = {
  autosize: true,
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { family: 'Inter, Arial, sans-serif', color: '#d7e1ea', size: 12 },
  margin: { l: 65, r: 28, t: 24, b: 62 },
  hoverlabel: { bgcolor: '#142638', font: { color: '#fff' } },
  xaxis: { gridcolor: '#26394b', zerolinecolor: '#60758a' },
  yaxis: { gridcolor: '#26394b', zerolinecolor: '#60758a' }
};

export const plotConfig = {
  responsive: true,
  displaylogo: false,
  scrollZoom: true,
  modeBarButtonsToAdd: ['select2d', 'lasso2d']
};

export function limitarIntervaloZoom(range, min, max, minSpan, maxSpan, reverse = false) {
  if (!Array.isArray(range) || range.length !== 2) return null;
  let inicio = Number(range[0]);
  let fim = Number(range[1]);

  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return null;
  if (inicio > fim) [inicio, fim] = [fim, inicio];

  const centro = (inicio + fim) / 2;
  let extensao = Math.max(minSpan, Math.min(maxSpan, fim - inicio));
  inicio = centro - extensao / 2;
  fim = centro + extensao / 2;

  if (inicio < min) {
    fim += min - inicio;
    inicio = min;
  }
  if (fim > max) {
    inicio -= fim - max;
    fim = max;
  }

  inicio = Math.max(min, inicio);
  fim = Math.min(max, fim);

  return reverse ? [fim, inicio] : [inicio, fim];
}

export function atualizarIntervalosZoom(evento, zoomAtual, limites, atualizarZoom) {
  const proximoZoom = { ...zoomAtual };
  let alterado = false;

  for (const eixo of ['xaxis', 'yaxis']) {
    if (evento[`${eixo}.autorange`] === true) {
      if (proximoZoom[eixo]) {
        delete proximoZoom[eixo];
        alterado = true;
      }
      continue;
    }

    const intervalo = evento[`${eixo}.range`];
    const valorInicial = evento[`${eixo}.range[0]`] ?? (Array.isArray(intervalo) ? intervalo[0] : undefined);
    const valorFinal = evento[`${eixo}.range[1]`] ?? (Array.isArray(intervalo) ? intervalo[1] : undefined);

    if (valorInicial !== undefined && valorFinal !== undefined) {
      const configEixo = limites[eixo];
      const ajustado = limitarIntervaloZoom(
        [valorInicial, valorFinal],
        configEixo.min,
        configEixo.max,
        configEixo.minSpan,
        configEixo.maxSpan,
        Boolean(configEixo.reverse)
      );

      if (ajustado) {
        proximoZoom[eixo] = ajustado;
        alterado = true;
      }
    }
  }

  if (alterado) atualizarZoom(proximoZoom);
}
