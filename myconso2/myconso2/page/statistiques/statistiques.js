frappe.pages['statistiques'].on_page_load = function(wrapper) {
	frappe.ui.make_app_page({ parent: wrapper, title: 'Statistiques', single_column: true });
	new StatistiquesPage(wrapper);
};

class StatistiquesPage {
	constructor(wrapper) {
		this.$root = $(wrapper).find('.page-content, .layout-main-section').first();
		this._charts = {};
		this._dateFrom = null;
		this._dateTo   = null;
		this.render();
		this._bindEvents();
		this._loadAll();
	}

	render() {
		const CAL = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 2H8C8.265 2 8.52 2.105 8.707 2.293C8.895 2.48 9 2.735 9 3V4H14V3C14 2.735 14.105 2.48 14.293 2.293C14.48 2.105 14.735 2 15 2H16C16.265 2 16.52 2.105 16.707 2.293C16.895 2.48 17 2.735 17 3V4C17.796 4 18.559 4.316 19.121 4.879C19.684 5.441 20 6.204 20 7V18C20 18.796 19.684 19.559 19.121 20.121C18.559 20.684 17.796 21 17 21H6C5.204 21 4.441 20.684 3.879 20.121C3.316 19.559 3 18.796 3 18V7C3 6.204 3.316 5.441 3.879 4.879C4.441 4.316 5.204 4 6 4V3C6 2.735 6.105 2.48 6.293 2.293C6.48 2.105 6.735 2 7 2ZM15 4H16V3H15V4ZM8 4V3H7V4H8ZM6 5C5.47 5 4.961 5.211 4.586 5.586C4.211 5.961 4 6.47 4 7V8H19V7C19 6.47 18.789 5.961 18.414 5.586C18.039 5.211 17.53 5 17 5H6ZM4 18C4 18.53 4.211 19.039 4.586 19.414C4.961 19.789 5.47 20 6 20H17C17.53 20 18.039 19.789 18.414 19.414C18.789 19.039 19 18.53 19 18V9H4V18ZM12 13H17V18H12V13ZM13 14V17H16V14H13Z" fill="#0E3151"/></svg>`;
		const FLAME = `<svg width="20" height="20" viewBox="0 0 23 23" fill="none"><path d="M11.5 3C11.5 3 14.2 6.8 13.5 10.2C15.5 8.5 15.8 6 15.2 4.8C17.3 6.4 18.2 9.5 17.7 12.5C17.4 16.3 14.2 19.8 11.5 19.8C8.8 19.8 5.6 16.3 5.3 12.5C5 9.8 6.2 8 7.3 7C6.8 8.7 7.3 10.2 8.3 11.2C8.5 9 9.5 6 11.5 3Z" fill="#E85D04" stroke="#E85D04" stroke-width="0.3"/></svg>`;
		const CHEVRON_URL = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%230E3151' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

		const pillSel = (id, val, opts) => {
			const o = opts.map(([v, l]) => `<option value="${v}"${v === val ? ' selected' : ''}>${l}</option>`).join('');
			return `<select id="${id}" style="height:31px;background:rgba(245,245,245,0.85);background-image:${CHEVRON_URL};background-repeat:no-repeat;background-position:right 10px center;border-radius:20px;box-shadow:0 0 3px rgba(0,0,0,0.2);border:none;outline:none;cursor:pointer;font-family:Inter,sans-serif;font-size:13px;font-weight:500;color:#0e3151;padding:0 28px 0 12px;appearance:none;-webkit-appearance:none;white-space:nowrap;flex-shrink:0;">${o}</select>`;
		};

		const PERIOD = [['semaine','Cette semaine'],['mois','Ce mois-ci'],['annee','Cette année']];

		const card = (title, chartId, selHtml) => `
		  <div style="background:#fff;border-radius:16px;box-shadow:0 0 2px rgba(0,0,0,0.15);padding:18px 18px 12px;overflow:hidden;flex:1;display:flex;flex-direction:column;">
		    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;flex-shrink:0;">
		      <span style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#0e3151;">${title}</span>
		      ${selHtml}
		    </div>
		    <div id="${chartId}" style="flex:1;min-height:240px;"></div>
		  </div>`;

		const repSec = (label, extraHtml = '') => `
		  <div style="padding:14px 20px;border-top:1px solid rgba(14,49,81,0.12);">
		    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
		      <span style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#0e3151;">${label}</span>
		      ${extraHtml}
		    </div>`;

		this.$root.html(`
<div style="width:100%;box-sizing:border-box;padding:14px 16px 32px;background:#f5f5f5;min-height:100%;">

  <!-- Contenu principal : colonne gauche (date + 3 cards) + reporting droite -->
  <div style="display:flex;gap:12px;align-items:stretch;">

    <!-- Colonne gauche : barre de dates + 3 cartes graphiques -->
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;">

      <!-- Barre de dates (même largeur que les cards) -->
      <div style="display:flex;align-items:center;gap:10px;background:#fff;border-radius:12px;padding:12px 18px;box-shadow:0 0 2px rgba(0,0,0,0.12);flex-wrap:wrap;">
        <span style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#0e3151;">Du</span>
        <div style="display:flex;align-items:center;gap:6px;background:#f9f9f9;border-radius:6px;padding:6px 10px;box-shadow:inset 0 0 1px rgba(0,0,0,0.15);">
          <input id="mc2-st-date-from" type="date" style="border:none;background:transparent;font-size:13px;color:#153453;font-family:NotoSans,sans-serif;cursor:pointer;outline:none;">
          ${CAL}
        </div>
        <span style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#0e3151;">au</span>
        <div style="display:flex;align-items:center;gap:6px;background:#f9f9f9;border-radius:6px;padding:6px 10px;box-shadow:inset 0 0 1px rgba(0,0,0,0.15);">
          <input id="mc2-st-date-to" type="date" style="border:none;background:transparent;font-size:13px;color:#153453;font-family:NotoSans,sans-serif;cursor:pointer;outline:none;">
          ${CAL}
        </div>
        <button id="mc2-st-reset" style="margin-left:auto;font-size:12px;color:#618db9;background:none;border:1px solid #618db9;border-radius:10px;padding:4px 12px;cursor:pointer;">Réinitialiser</button>
      </div>

      ${card('Ma conso en kWh',    'mc2-chart-kwh',      pillSel('mc2-kwh-period',  'semaine', PERIOD))}
      ${card('Ma conso en FCFA',   'mc2-chart-fcfa',     pillSel('mc2-fcfa-period', 'annee',   PERIOD))}
      ${card('Évolution de mes factures', 'mc2-chart-factures',
        `<div style="height:31px;background:rgba(245,245,245,0.85);border-radius:20px;box-shadow:0 0 3px rgba(0,0,0,0.2);display:flex;align-items:center;padding:0 14px;flex-shrink:0;">
           <span style="font-family:Inter,sans-serif;font-size:13px;font-weight:500;color:#0e3151;white-space:nowrap;">Cette année</span>
         </div>`)}
    </div>

    <!-- Colonne droite : panel Reporting -->
    <div style="width:400px;flex-shrink:0;background:#fff;border-radius:16px;box-shadow:0 0 2px rgba(0,0,0,0.15);overflow:hidden;display:flex;flex-direction:column;">

      <!-- En-tête -->
      <div style="padding:18px 20px 10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span style="font-family:Inter,sans-serif;font-size:17px;font-weight:600;color:#0e3151;">Reporting</span>
          <select id="mc2-rep-period" style="height:31px;background:rgba(245,245,245,0.85);background-image:${CHEVRON_URL};background-repeat:no-repeat;background-position:right 10px center;border-radius:20px;box-shadow:0 0 3px rgba(0,0,0,0.2);border:none;outline:none;cursor:pointer;font-family:Inter,sans-serif;font-size:13px;font-weight:500;color:#0e3151;padding:0 28px 0 10px;appearance:none;-webkit-appearance:none;">
            <option value="semaine">Cette semaine</option>
            <option value="mois">Ce mois-ci</option>
            <option value="annee">Cette année</option>
          </select>
        </div>
        <p style="font-family:NotoSans,sans-serif;font-size:11px;color:#89898b;margin-top:4px;">• Reporting de la période sélectionnée •</p>
      </div>

      <!-- Commentaires -->
      ${repSec('Commentaires')}
        <div id="mc2-rep-comments" style="font-family:Inter,sans-serif;font-size:13px;line-height:1.7;color:#153453;">
          <div style="color:#9CAAB9;">Chargement...</div>
        </div>
      </div>

      <!-- Résumé -->
      ${repSec('Résumé de la période')}
        <div id="mc2-rep-chart" style="height:190px;"></div>
      </div>

      <!-- Répartition : deux circles empilés verticalement -->
      ${repSec('Répartition')}
        <p style="font-family:Inter,sans-serif;font-size:11px;color:#9CAAB9;margin:0 0 4px;">Conso kWh</p>
        <div id="mc2-rep-pie1" style="height:220px;"></div>
        <div style="height:1px;background:rgba(14,49,81,0.08);margin:12px 0;"></div>
        <p style="font-family:Inter,sans-serif;font-size:11px;color:#9CAAB9;margin:0 0 4px;">Structure facture</p>
        <div id="mc2-rep-pie2" style="height:220px;"></div>
      </div>

      <!-- Empreinte Carbone -->
      ${repSec('Empreinte Carbone', FLAME)}
        <p id="mc2-rep-ec-txt" style="font-family:Inter,sans-serif;font-size:13px;color:#0e3151;line-height:1.7;margin-bottom:14px;">—</p>
        <div style="position:relative;height:14px;background:#f7f7f7;border-radius:25px;box-shadow:inset 0 0 4px rgba(0,0,0,0.2);overflow:hidden;">
          <div id="mc2-rep-co2-fill" style="position:absolute;left:0;top:0;height:100%;width:0;background:linear-gradient(90deg,rgba(165,216,168,1) 0%,rgba(93,240,126,1) 29%,rgba(255,230,66,1) 56%,rgba(250,163,23,1) 85%,rgba(254,63,20,1) 98%);transition:width 0.8s ease;"></div>
        </div>
        <div style="display:flex;align-items:baseline;gap:4px;margin-top:8px;padding-bottom:4px;">
          <span id="mc2-rep-co2-num" style="font-family:Inter,sans-serif;font-size:38px;font-weight:700;color:#E04E1E;">—</span>
          <span style="font-family:Inter,sans-serif;font-size:16px;color:#0e3151;">kg co<sub>2</sub></span>
        </div>
      </div>

    </div>
  </div>
</div>`);
	}

	_bindEvents() {
		this.$root.on('change', '#mc2-kwh-period',  () => this._loadChart('kwh'));
		this.$root.on('change', '#mc2-fcfa-period', () => this._loadChart('fcfa'));
		this.$root.on('change', '#mc2-rep-period',  () => this._loadReport());
		this.$root.on('change', '#mc2-st-date-from, #mc2-st-date-to', () => {
			const from = this.$root.find('#mc2-st-date-from').val();
			const to   = this.$root.find('#mc2-st-date-to').val();
			if (from && to) { this._dateFrom = from; this._dateTo = to; this._loadAll(); }
		});
		this.$root.on('click', '#mc2-st-reset', () => {
			this._dateFrom = null; this._dateTo = null;
			this.$root.find('#mc2-st-date-from, #mc2-st-date-to').val('');
			this._loadAll();
		});
	}

	_buildArgs(periodSelectId) {
		const args = {};
		if (this._dateFrom && this._dateTo) {
			args.date_from = this._dateFrom;
			args.date_to   = this._dateTo;
		} else if (periodSelectId) {
			args.period = this.$root.find(`#${periodSelectId}`).val() || 'semaine';
		}
		return args;
	}

	_loadChart(type) {
		const selId = type === 'kwh' ? 'mc2-kwh-period' : (type === 'fcfa' ? 'mc2-fcfa-period' : null);
		const args  = Object.assign({ chart_type: type }, this._buildArgs(selId));
		const $el   = this.$root.find(`#mc2-chart-${type}`);
		$el.html('<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#9CAAB9;font-size:13px;font-family:Inter,sans-serif;">Chargement...</div>');

		frappe.call({
			method: 'myconso2.myconso2.api.get_statistics_data',
			args,
			callback: r => {
				if (!r.message) return;
				const { labels, values, unit } = r.message;
				if (!labels || !labels.length) {
					$el.html('<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#9CAAB9;font-size:13px;font-family:Inter,sans-serif;">Aucune donnée disponible</div>');
					return;
				}
				const data = { labels, datasets: [{ values, name: unit }] };
				const fmt  = v => `${new Intl.NumberFormat('fr-FR').format(v)} ${unit}`;
				const colorMap = { kwh: '#0E3151', fcfa: '#5E8AB4', factures: '#E1877D' };
				const key = `chart_${type}`;
				if (this._charts[key]) { try { this._charts[key].destroy?.(); } catch(e) {} delete this._charts[key]; }
				if (this._resizeObs && this._resizeObs[key]) { this._resizeObs[key].disconnect(); delete this._resizeObs[key]; }
				$el.empty();

				const _makeChart = (containerH) => {
					if (this._charts[key]) { try { this._charts[key].destroy?.(); } catch(e) {} }
					$el.empty();
					this._charts[key] = new frappe.Chart(`#mc2-chart-${type}`, {
						type:        type === 'factures' ? 'bar' : 'line',
						data,
						colors:      [colorMap[type] || '#0E3151'],
						height:      Math.max(200, containerH - 8),
						lineOptions: { regionFill: 1, dotSize: 4 },
						axisOptions: { xIsSeries: 1 },
						tooltipOptions: { formatTooltipY: fmt },
					});
				};

				// Render immédiat avec hauteur courante
				_makeChart($el[0].clientHeight || 260);

				// ResizeObserver : recrée le chart si la hauteur flex change (ex: panel droit plus grand)
				if (typeof ResizeObserver !== 'undefined') {
					if (!this._resizeObs) this._resizeObs = {};
					let lastH = $el[0].clientHeight;
					const ro = new ResizeObserver(entries => {
						const newH = entries[0].contentRect.height;
						if (Math.abs(newH - lastH) > 10) { lastH = newH; _makeChart(newH); }
					});
					ro.observe($el[0]);
					this._resizeObs[key] = ro;
				}
			},
		});
	}

	_loadReport() {
		const args = this._buildArgs('mc2-rep-period');
		if (!args.period && !args.date_from) args.period = 'semaine';

		frappe.call({
			method: 'myconso2.myconso2.api.get_statistics_report',
			args,
			callback: r => {
				if (!r.message) return;
				const d = r.message;

				// Commentaires
				const $c = this.$root.find('#mc2-rep-comments').empty();
				(d.comments || []).forEach(c => $c.append(`<ul style="list-style:disc;padding-left:16px;margin-bottom:10px;"><li>${c}</li></ul>`));
				if (!d.comments || !d.comments.length)
					$c.html('<div style="color:#9CAAB9;">Aucune donnée disponible.</div>');

				// Mini chart résumé
				if (d.labels && d.labels.length) {
					const miniData = { labels: d.labels, datasets: [{ values: d.values, name: 'kWh' }] };
					const fmtY = v => `${new Intl.NumberFormat('fr-FR').format(v)} kWh`;
					if (this._charts['report_mini']) { try { this._charts['report_mini'].destroy?.(); } catch(e) {} delete this._charts['report_mini']; }
					this.$root.find('#mc2-rep-chart').empty();
					this._charts['report_mini'] = new frappe.Chart('#mc2-rep-chart', {
						type: 'bar', data: miniData, colors: ['#294570'], height: 180,
						axisOptions: { xIsSeries: 1 },
						tooltipOptions: { formatTooltipY: fmtY },
					});
				} else {
					this.$root.find('#mc2-rep-chart').html('<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9CAAB9;font-size:12px;font-family:Inter,sans-serif;">Aucune donnée</div>');
				}

				// Pie charts (toujours recrées)
				['pie1','pie2'].forEach(k => {
					if (this._charts[k]) { try { this._charts[k].destroy?.(); } catch(e) {} delete this._charts[k]; }
				});
				const C1 = ['#0E3151','#2E6A9E','#5E8AB4','#91B4CF','#C4D7E8'];
				const C2 = ['#1E3A5F','#4A8DC2','#E1877D'];

				if (d.pie1 && d.pie1.labels && d.pie1.labels.length) {
					this.$root.find('#mc2-rep-pie1').empty();
					this._charts.pie1 = new frappe.Chart('#mc2-rep-pie1', {
						type: 'pie',
						data: { labels: d.pie1.labels, datasets: [{ values: d.pie1.values }] },
						colors: C1, height: 210,
					});
				} else {
					this.$root.find('#mc2-rep-pie1').html('<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9CAAB9;font-size:12px;font-family:Inter,sans-serif;">Aucune donnée</div>');
				}

				if (d.pie2 && d.pie2.labels && d.pie2.labels.length) {
					this.$root.find('#mc2-rep-pie2').empty();
					this._charts.pie2 = new frappe.Chart('#mc2-rep-pie2', {
						type: 'pie',
						data: { labels: d.pie2.labels, datasets: [{ values: d.pie2.values }] },
						colors: C2, height: 210,
					});
				} else {
					this.$root.find('#mc2-rep-pie2').html('<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9CAAB9;font-size:12px;font-family:Inter,sans-serif;">Aucune donnée</div>');
				}

				// CO2
				if (d.co2 !== undefined) {
					const co2  = d.co2;
					const pct  = Math.min(100, (co2 / 25) * 100);
					this.$root.find('#mc2-rep-co2-num').text(co2);
					this.$root.find('#mc2-rep-co2-fill').css('width', pct + '%');
					const msg = co2 < 5  ? 'Votre empreinte est très faible. Excellent effort !'
					          : co2 < 15 ? 'Votre empreinte est dans la moyenne. Continuez à la réduire.'
					          :            'Votre émission est élevée. Réduisez votre consommation pour préserver la planète.';
					this.$root.find('#mc2-rep-ec-txt').text(msg);
				}
			},
		});
	}

	_loadAll() {
		this._loadChart('kwh');
		this._loadChart('fcfa');
		this._loadChart('factures');
		this._loadReport();
	}
}
