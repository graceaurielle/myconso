frappe.pages['facture-conso'].on_page_load = function(wrapper) {
	frappe.ui.make_app_page({ parent: wrapper, title: 'Facture', single_column: true });
	new FactureConsoPage(wrapper);
};

class FactureConsoPage {
	constructor(wrapper) {
		this.$root = $(wrapper).find('.page-content, .layout-main-section').first();
		this._dateFrom = null;
		this._dateTo = null;
		this._currentYear = new Date().getFullYear();
		this._facturesMap = {};
		this.render();
		this._bindEvents();
		this._loadFactures();
	}

	_invCard(facture) {
		const SVG = `<svg width="144" height="180" viewBox="0 0 144 180" fill="none"><path d="M54 68H21M72 49H21M0 149.814V54.486C0 28.8 1.43051e-06 15.966 7.911 7.983C15.813 4.76837e-07 28.548 0 54 0H90C115.452 0 128.187 4.76837e-07 136.089 7.983C144 15.957 144 28.8 144 54.486V149.814C144 163.413 144 170.217 139.842 172.899C133.047 177.273 122.544 168.093 117.261 164.763C112.896 162.009 110.718 160.641 108.288 160.56C105.678 160.47 103.455 161.793 98.739 164.763L81.54 175.608C76.896 178.533 74.583 180 72 180C69.417 180 67.104 178.533 62.46 175.608L45.27 164.763C40.896 162.009 38.718 160.641 36.297 160.56C33.678 160.47 31.455 161.793 26.739 164.763C21.456 168.093 10.953 177.273 4.149 172.899C-4.76837e-07 170.217 0 163.422 0 149.814Z" stroke="#294570" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
		const fmt = v => new Intl.NumberFormat('fr-FR').format(v);
		return `
		<div class="mc2-fp-inv-card" data-period-key="${facture.period_key}" style="cursor:pointer;" title="Voir la facture">
		  <div class="mc2-fp-inv-receipt">${SVG}</div>
		  <div class="mc2-fp-inv-period">${facture.period}</div>
		  <div class="mc2-fp-inv-amount">
		    <span class="mc2-fp-inv-main">${fmt(facture.amount)}</span><span class="mc2-fp-inv-unit">FCFA</span>
		  </div>
		  <div style="position:absolute;left:29px;top:128px;font-size:11px;color:#7A8FA6;">${fmt(facture.consumption)} kWh</div>
		</div>`;
	}

	render() {
		const CALENDAR = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M7 2h1a1 1 0 0 1 1 1v1h5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1c.796 0 1.559.316 2.121.879A3 3 0 0 1 20 7v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3V3a1 1 0 0 1 1-1zm8 2h1V3h-1v1zM8 4V3H7v1h1zm-2 1a2 2 0 0 0-2 2v1h15V7a2 2 0 0 0-2-2H6zM4 18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V9H4v9zm8-5h5v5h-5v-5zm1 1v3h3v-3h-3z" fill="#0E3151"/></svg>`;
		const FILTER = `<svg width="25" height="25" viewBox="0 0 25 25" fill="none"><path d="M22.1354 12.5H9.26564M4.72293 12.5H2.86459M4.72293 12.5C4.72293 11.8978 4.96217 11.3202 5.38804 10.8943C5.8139 10.4685 6.3915 10.2292 6.99376 10.2292C7.59602 10.2292 8.17362 10.4685 8.59948 10.8943C9.02535 11.3202 9.26459 11.8978 9.26459 12.5C9.26459 13.1023 9.02535 13.6799 8.59948 14.1058C8.17362 14.5316 7.59602 14.7709 6.99376 14.7709C6.3915 14.7709 5.8139 14.5316 5.38804 14.1058C4.96217 13.6799 4.72293 13.1023 4.72293 12.5ZM22.1354 19.3823H16.1479M16.1479 19.3823C16.1479 19.9847 15.9081 20.563 15.4821 20.989C15.0562 21.4149 14.4785 21.6542 13.8761 21.6542C13.2738 21.6542 12.6962 21.4139 12.2703 20.9881C11.8445 20.5622 11.6052 19.9846 11.6052 19.3823M16.1479 19.3823C16.1479 18.7799 15.9081 18.2027 15.4821 17.7768C15.0562 17.3508 14.4785 17.1115 13.8761 17.1115C13.2738 17.1115 12.6962 17.3508 12.2703 17.7766C11.8445 18.2025 11.6052 18.7801 11.6052 19.3823M11.6052 19.3823H2.86459M22.1354 5.61776H18.9011M14.3583 5.61776H2.86459M14.3583 5.61776C14.3583 5.01549 14.5976 4.4379 15.0235 4.01204C15.4493 3.58617 16.0269 3.34692 16.6292 3.34692C16.9274 3.34692 17.2227 3.40566 17.4982 3.51978C17.7737 3.6339 18.024 3.80117 18.2349 4.01204C18.4458 4.2229 18.613 4.47324 18.7272 4.74875C18.8413 5.02426 18.9 5.31955 18.9 5.61776C18.9 5.91597 18.8413 6.21126 18.7272 6.48677C18.613 6.76228 18.4458 7.01261 18.2349 7.22348C18.024 7.43435 17.7737 7.60161 17.4982 7.71573C17.2227 7.82985 16.9274 7.88859 16.6292 7.88859C16.0269 7.88859 15.4493 7.64934 15.0235 7.22348C14.5976 6.79761 14.3583 6.22002 14.3583 5.61776Z" stroke="#0E3151" stroke-width="1.6875" stroke-miterlimit="10" stroke-linecap="round"/></svg>`;
		const ARROW = `<svg width="20" height="18" viewBox="0 0 20 18" fill="none"><path d="M10.6271 11.7L6.7627 6.29995H14.4915L10.6271 11.7Z" fill="#0E3151"/></svg>`;
		const PREDICT_ICON = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10.8302 14.511L11.2449 13.9935C11.6087 13.5383 12.3819 13.575 12.6887 14.061C13.0584 14.6467 13.9719 14.5305 14.2254 13.992C14.2389 13.9643 14.2059 14.034 14.2337 13.7917C14.2622 13.5495 14.2502 13.494 14.2262 13.3837L12.7847 6.57375C12.4217 4.8615 12.2409 4.00575 11.6169 3.5025C10.9952 3 10.1139 3 8.35516 3H6.64741C4.88716 3 4.00741 3 3.38416 3.5025C2.76016 4.005 2.57941 4.8615 2.21641 6.573L0.774161 13.383C0.750911 13.494 0.738911 13.5495 0.766661 13.7917C0.795161 14.034 0.762911 13.9643 0.775661 13.992C1.02916 14.5305 1.94266 14.6475 2.31241 14.0618C2.61991 13.575 3.39241 13.5383 3.75616 13.9935L4.17016 14.511C4.69216 15.1635 5.78266 15.1635 6.30391 14.511L6.36916 14.4293C6.92266 13.7378 8.07916 13.7378 8.63266 14.4293L8.69791 14.511C9.21991 15.1635 10.3097 15.1635 10.8317 14.511" stroke="white" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"/><path d="M0.362412 5.625C-0.0763381 5.169 0.00616178 4.58175 0.00616178 3.114C0.00616178 1.64625 0.00616193 0.912 0.445662 0.456C0.884412 0 1.59016 0 3.00391 0H11.9964C13.4094 0 14.1159 0 14.5554 0.456C14.9949 0.912 14.9942 1.64625 14.9942 3.114C14.9942 4.58175 15.0767 5.169 14.6372 5.625M7.50016 6H5.25016M9.00016 9H4.50016" stroke="white" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

		const curYear = new Date().getFullYear();
		const yearOpts = [curYear, curYear - 1, curYear - 2].map(y =>
			`<option value="${y}" ${y === curYear ? 'selected' : ''}>${y}</option>`
		).join('');

		this.$root.html(`
		<div class="mc2-fp-wrapper">

		  <div class="mc2-fp-left-card">
		    <div class="mc2-fp-left-title">Calculer cette facture</div>

		    <div class="mc2-fp-field">
		      <label class="mc2-fp-label">Index Début</label>
		      <div class="mc2-fp-input-box">
		        <input id="mc2-fp-idx-debut" class="mc2-fp-input" type="number" step="0.01" placeholder="Ex: 15 000" />
		      </div>
		    </div>

		    <div class="mc2-fp-field">
		      <label class="mc2-fp-label">Index Fin</label>
		      <div class="mc2-fp-input-box">
		        <input id="mc2-fp-idx-fin" class="mc2-fp-input" type="number" step="0.01" placeholder="Ex: 15 200" />
		      </div>
		    </div>

		    <button id="mc2-fp-calc-btn" class="mc2-fp-predict-btn">
		      <span class="mc2-fp-predict-icon">${PREDICT_ICON}</span>
		      Calculer cette facture
		    </button>

		    <div id="mc2-fp-result-wrap" class="mc2-fp-result-box" style="display:none;">
		      <div class="mc2-fp-result-header">
		        <span id="mc2-fp-result-main" class="mc2-fp-result-main">0</span>
		        <span class="mc2-fp-result-unit">FCFA</span>
		      </div>
		      <div class="mc2-fp-result-divider"></div>
		      <div id="mc2-fp-breakdown" class="mc2-fp-breakdown"></div>
		    </div>
		  </div>

		  <div class="mc2-fp-right-card">
		    <div class="mc2-fp-right-title">Mes factures</div>

		    <div class="mc2-fp-filter-bar">
		      <span class="mc2-fp-filter-icon">${FILTER}</span>
		      <select id="mc2-fp-year-sel" class="mc2-fp-period-pill" style="appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:28px;">
		        ${yearOpts}
		      </select>
		      <span class="mc2-fp-date-label">Du</span>
		      <div class="mc2-fp-date-wrap">
		        <input id="mc2-fp-date-from" class="mc2-fp-date-input" type="date" />
		        <span class="mc2-fp-cal-icon">${CALENDAR}</span>
		      </div>
		      <span class="mc2-fp-date-label">au</span>
		      <div class="mc2-fp-date-wrap">
		        <input id="mc2-fp-date-to" class="mc2-fp-date-input" type="date" />
		        <span class="mc2-fp-cal-icon">${CALENDAR}</span>
		      </div>
		    </div>

		    <div id="mc2-fp-invoices">
		      <div style="padding:20px;color:#9CAAB9;">Chargement...</div>
		    </div>
		  </div>

		</div>`);
	}

	_bindEvents() {
		this.$root.on('click', '#mc2-fp-calc-btn', () => this._predict());
		this.$root.on('change', '#mc2-fp-year-sel', () => this._loadFactures());
		this.$root.on('change', '#mc2-fp-date-from, #mc2-fp-date-to', () => this._loadFactures());
		this.$root.on('click', '.mc2-fp-inv-card', e => {
			const pk = $(e.currentTarget).data('period-key');
			if (pk && this._facturesMap[pk]) this._showBillModal(this._facturesMap[pk]);
		});
	}

	_predict() {
		const debut = parseFloat(this.$root.find('#mc2-fp-idx-debut').val());
		const fin = parseFloat(this.$root.find('#mc2-fp-idx-fin').val());
		if (isNaN(debut) || isNaN(fin)) { frappe.msgprint('Veuillez saisir les deux index'); return; }
		if (fin <= debut) { frappe.msgprint("L'index fin doit être supérieur à l'index début"); return; }

		frappe.call({
			method: 'myconso2.myconso2.api.predict_facture',
			args: { index_debut: debut, index_fin: fin },
			callback: r => {
				if (!r.exc && r.message) {
					const d = r.message;
					const fmt = v => new Intl.NumberFormat('fr-FR').format(v);
					const codeNum = (d.code_tarif || 'code02').replace('code', '');
					const tva_lbl = `TVA ${d.tva_taux_pct || 18} %`;
					this.$root.find('#mc2-fp-result-main').text(fmt(d.total));
					this.$root.find('#mc2-fp-breakdown').html(
						`<table style="width:100%;border-collapse:collapse;font-size:12.5px;color:#506f92;">` +
						`<tr><td style="padding:3px 0;">Code Tarif</td><td style="text-align:right;padding:3px 0;"><b>Code ${codeNum}</b></td></tr>` +
						`<tr><td>Consommation</td><td style="text-align:right;"><b>${fmt(d.kwh)} kWh</b></td></tr>` +
						(d.kwh_t2 > 0
							? `<tr><td style="padding-left:10px;">↳ T1</td><td style="text-align:right;">${fmt(d.kwh_t1)} kWh × ${d.tarif_t1}</td></tr>` +
							  `<tr><td style="padding-left:10px;">↳ T2</td><td style="text-align:right;">${fmt(d.kwh_t2)} kWh × ${d.tarif_t2}</td></tr>`
							: `<tr><td style="padding-left:10px;">↳ T1</td><td style="text-align:right;">${fmt(d.kwh_t1)} kWh × ${d.tarif_t1}</td></tr>`) +
						`<tr><td colspan="2" style="padding:4px 0;"><hr style="border:0;border-top:1px solid rgba(41,69,112,0.1);"></td></tr>` +
						`<tr><td>Énergie HT</td><td style="text-align:right;"><b>${fmt(d.energy_ht)} FCFA</b></td></tr>` +
						`<tr><td>Prime fixe HT</td><td style="text-align:right;"><b>${fmt(d.prime_ht)} FCFA</b></td></tr>` +
						`<tr><td>Sous-total HT</td><td style="text-align:right;"><b>${fmt(d.sous_total_ht)} FCFA</b></td></tr>` +
						`<tr><td>${tva_lbl}</td><td style="text-align:right;"><b>${fmt(d.tva)} FCFA</b></td></tr>` +
						`<tr><td colspan="2" style="padding:4px 0;"><hr style="border:0;border-top:1px solid rgba(41,69,112,0.1);"></td></tr>` +
						`<tr><td>CO₂ estimé</td><td style="text-align:right;"><b>${d.co2 || 0} kg</b></td></tr>` +
						`</table>`
					);
					this.$root.find('#mc2-fp-result-wrap').show();
				}
			},
		});
	}

	_loadFactures() {
		const year = this.$root.find('#mc2-fp-year-sel').val();
		const dateFrom = this.$root.find('#mc2-fp-date-from').val();
		const dateTo = this.$root.find('#mc2-fp-date-to').val();

		const args = {};
		if (dateFrom && dateTo) {
			args.date_from = dateFrom;
			args.date_to = dateTo;
		} else {
			args.year = year;
		}

		frappe.call({
			method: 'myconso2.myconso2.api.get_factures',
			args,
			callback: r => {
				const $c = this.$root.find('#mc2-fp-invoices').empty();
				if (!r.message || !r.message.length) {
					$c.html('<div style="padding:20px;color:#9CAAB9;">Aucune facture calculée — enregistrez des index d\'abord</div>');
					return;
				}
				this._facturesMap = {};
					r.message.forEach(f => {
						this._facturesMap[f.period_key] = f;
						$c.append(this._invCard(f));
					});
				},
			});
		}

	_showBillModal(facture) {
		const b = facture.breakdown || {};
		const fmt = v => new Intl.NumberFormat('fr-FR').format(v);
		const fmtDate = d => {
			if (!d) return '—';
			const [y, m, day] = d.split('-');
			return `${day}/${m}/${y}`;
		};
		const tvaP    = b.tva_taux_pct || 18;
		const tvaFrac = tvaP / 100;
		const tvaRate = 1 + tvaFrac;

		const rawDiff  = Math.abs((facture.index_nouveau || 0) - (facture.index_ancien || 0));
		const coeff    = rawDiff > 0 ? Math.round(facture.consumption / rawDiff * 100) / 100 : 1;
		const t1Tva    = Math.round((b.energy_t1_ht || 0) * tvaFrac);
		const t1Ttc    = Math.round((b.energy_t1_ht || 0) * tvaRate);
		const t2Tva    = Math.round((b.energy_t2_ht || 0) * tvaFrac);
		const t2Ttc    = Math.round((b.energy_t2_ht || 0) * tvaRate);
		const primeHt  = b.prime_ht || 0;
		const primeTva = Math.round(primeHt * tvaFrac);
		const primeTtc = Math.round(primeHt * tvaRate);

		let trancheRows = `<tr class="cie2-row">
			<td>1</td>
			<td>${b.tarif_t1 || ''}</td>
			<td>${fmt(b.kwh_t1 || 0)}</td>
			<td>${fmt(b.energy_t1_ht || 0)}</td>
			<td>${tvaP}</td>
			<td>${fmt(t1Tva)}</td>
			<td>${fmt(t1Ttc)}</td>
		</tr>`;
		if ((b.kwh_t2 || 0) > 0) {
			trancheRows += `<tr class="cie2-row">
				<td>2</td>
				<td>${b.tarif_t2 || ''}</td>
				<td>${fmt(b.kwh_t2 || 0)}</td>
				<td>${fmt(b.energy_t2_ht || 0)}</td>
				<td>${tvaP}</td>
				<td>${fmt(t2Tva)}</td>
				<td>${fmt(t2Ttc)}</td>
			</tr>`;
		}

		const html = `
		<style>
		.cie2{font-family:'Inter',sans-serif;padding:4px 2px;color:#153453}
		.cie2-lbl{font-size:13px;font-weight:500;color:#0e3151;margin-bottom:2px}
		.cie2-period{font-size:34px;font-weight:700;color:#294570;line-height:1.1}
		.cie2-dates{font-size:13px;color:#0e3151;font-weight:600;margin-left:14px}
		.cie2-dates b{color:#153453}
		.cie2-tbl{width:100%;border-collapse:separate;border-spacing:0 5px;margin:12px 0}
		.cie2-hdr th{
			background:#506f92;
			color:#fff;font-weight:600;font-size:13px;text-align:center;
			padding:10px 6px;vertical-align:middle;line-height:1.3
		}
		.cie2-hdr th:first-child{border-radius:10px 0 0 10px}
		.cie2-hdr th:last-child{border-radius:0 10px 10px 0}
		.cie2-row td{
			background:rgba(233,233,233,0.70);font-size:13px;
			text-align:center;padding:12px 6px;color:#153453
		}
		.cie2-row td:first-child{border-radius:10px 0 0 10px}
		.cie2-row td:last-child{border-radius:0 10px 10px 0}
		.cie2-prime td{font-size:13px;text-align:center;padding:12px 6px}
		.cie2-prime td.cl{background:#506f92;color:#fff;font-weight:600}
		.cie2-prime td.cv{background:rgba(233,233,233,0.70);color:#153453}
		.cie2-prime td.cl:first-child{border-radius:10px 0 0 10px}
		.cie2-prime td.cv:last-child{border-radius:0 10px 10px 0}
		.cie2-total td{font-size:13px;font-weight:500;text-align:center;padding:12px 6px}
		.cie2-total td.cl{background:#506f92;color:#fff}
		.cie2-total td.cl:first-child{border-radius:10px 0 0 10px}
		.cie2-total td.cg{
			background:#506f92;
			color:#fff
		}
		.cie2-total td.cg:last-child{border-radius:0 10px 10px 0}
		.cie2-footer{display:flex;flex-direction:column;align-items:flex-end;margin-top:20px}
		.cie2-footer-label{font-size:16px;color:#153453;margin-bottom:8px}
		.cie2-badge{
			background:rgba(225,135,125,1);
			border-radius:15px;padding:14px 32px;color:#fff;
			display:inline-flex;align-items:baseline;gap:4px
		}
		.cie2-badge-num{font-size:44px;font-weight:300;letter-spacing:1px}
		.cie2-badge-unit{font-size:18px}
		</style>

		<div class="cie2">
		  <div class="cie2-lbl">Facture</div>
		  <div style="margin-bottom:20px">
		    <span class="cie2-period">${facture.period}</span>
		    <span class="cie2-dates">Du <b>${fmtDate(facture.date_from)}</b> au <b>${fmtDate(facture.date_to)}</b></span>
		  </div>

		  <table class="cie2-tbl">
		    <thead>
		      <tr class="cie2-hdr">
		        <th>Numéro de<br>compteur</th>
		        <th>Ancien<br>Index</th>
		        <th>Nouveau<br>Index</th>
		        <th>Différence</th>
		        <th>Coefficient<br>de lecture</th>
		        <th>Consommation<br>(kWh)</th>
		      </tr>
		    </thead>
		    <tbody>
		      <tr class="cie2-row">
		        <td>${facture.numero_compteur || '—'}</td>
		        <td>${fmt(facture.index_ancien || 0)}</td>
		        <td>${fmt(facture.index_nouveau || 0)}</td>
		        <td>${fmt(rawDiff)}</td>
		        <td>${coeff}</td>
		        <td>${fmt(facture.consumption)}</td>
		      </tr>
		    </tbody>
		  </table>

		  <table class="cie2-tbl">
		    <thead>
		      <tr class="cie2-hdr">
		        <th>Tranches</th>
		        <th>Prix Unitaire<br>HT (Fcfa)</th>
		        <th>Consommation<br>(kWh)</th>
		        <th>Montant HT<br>(Fcfa)</th>
		        <th>Taux de TVA (%)</th>
		        <th>Montant TVA<br>(Fcfa)</th>
		        <th>Montant TTC<br>(Fcfa)</th>
		      </tr>
		    </thead>
		    <tbody>
		      ${trancheRows}
		      <tr class="cie2-prime">
		        <td class="cl" colspan="3">Prime fixe</td>
		        <td class="cv">${fmt(primeHt)}</td>
		        <td class="cv">18</td>
		        <td class="cv">${fmt(primeTva)}</td>
		        <td class="cv">${fmt(primeTtc)}</td>
		      </tr>
		      <tr class="cie2-total">
		        <td class="cl" colspan="3">Total Facture Énergie</td>
		        <td class="cg">${fmt(b.sous_total_ht || b.montant_ht)}</td>
		        <td class="cg">—</td>
		        <td class="cg">${fmt(b.tva)}</td>
		        <td class="cg">${fmt(b.total)}</td>
		      </tr>
		    </tbody>
		  </table>

		  <div class="cie2-footer">
		    <div class="cie2-footer-label">Total à payer Hors Taxe</div>
		    <div class="cie2-badge">
		      <span class="cie2-badge-num">${fmt(b.total)}</span>
		      <span class="cie2-badge-unit">FCFA</span>
		    </div>
		  </div>
		</div>`;

		new frappe.ui.Dialog({
			title: `Facture ${facture.period}`,
			fields: [{ fieldtype: 'HTML', fieldname: 'bill_html', options: html }],
			size: 'large',
		}).show();
	}
}
