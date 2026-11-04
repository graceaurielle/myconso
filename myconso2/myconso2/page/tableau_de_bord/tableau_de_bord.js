frappe.pages['tableau-de-bord'].on_page_load = function(wrapper) {
	frappe.ui.make_app_page({ parent: wrapper, title: 'Tableau de Bord', single_column: true });
	wrapper.__mc2_tdb = new TableauDeBord(wrapper);
};

frappe.pages['tableau-de-bord'].on_page_show = function(wrapper) {
	if (wrapper.__mc2_tdb) {
		wrapper.__mc2_tdb._loadDashboard();
		wrapper.__mc2_tdb._loadFacPeriods();
	}
};

const WMO_DESC = {
	0:'Ciel clair',1:'Principalement dégagé',2:'Partiellement nuageux',3:'Couvert',
	45:'Brouillard',48:'Brouillard givrant',51:'Bruine légère',53:'Bruine',55:'Bruine dense',
	61:'Pluie légère',63:'Pluie modérée',65:'Pluie forte',
	71:'Neige légère',73:'Neige',75:'Neige forte',
	80:'Averses légères',81:'Averses',82:'Averses violentes',
	95:'Orage',96:'Orage + grêle',99:'Orage violent'
};

// Icônes du bouton de bascule de graphique
const _MC2_COL_ICON  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="11" width="5" height="10" rx="1"/><rect x="9.5" y="5" width="5" height="16" rx="1"/><rect x="17" y="8" width="5" height="13" rx="1"/></svg>`;
const _MC2_LINE_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 17 8 12 13 15 21 7"/><circle cx="3" cy="17" r="2" fill="currentColor"/><circle cx="8" cy="12" r="2" fill="currentColor"/><circle cx="13" cy="15" r="2" fill="currentColor"/><circle cx="21" cy="7" r="2" fill="currentColor"/></svg>`;

class TableauDeBord {
	constructor(wrapper) {
		this.$main = $(wrapper).find('.page-content, .layout-main-section').first();
		this._chartPeriod = 'week';
		this._chartType   = 'line';
		this._chart       = null;
		this._clockTimer  = null;
		this._facPeriods  = [];
		this._init();
	}

	_init() {
		this._render();
		this._bindEvents();
		this._startClock();
		this._loadDashboard();
		this._loadFacPeriods();
		this._loadWeather();
		this._loadChart();
	}

	_render() {
		const I = {
			bell: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
			checkCircle: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>`,
			scan: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>`,
			refresh: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
			save: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
			predict: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="15" r="2.5"/><line x1="14" y1="17.5" x2="16" y2="19.5" stroke-linecap="round"/></svg>`,
			leaf: `<svg width="13" height="13" viewBox="0 0 24 24" fill="#22C55E" stroke="none"><path d="M17 8C8 10 5.9 16.17 3.82 21c1.8-.5 3.64-.97 5.18-1.95C11.65 17.5 14.4 14.24 17 8z"/><path d="M21 3C9 3 3 12 3 21" fill="none" stroke="#22C55E" stroke-width="2" stroke-linecap="round"/></svg>`,
			info: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7A8FA6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
			refreshBig: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
			monitor: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><circle cx="12" cy="10" r="2.5"/></svg>`,
			barChart: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
			cloud: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,
			pin: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7A8FA6" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
			cal: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7A8FA6" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
		};

		const cloudSVG = `<svg viewBox="0 0 190 115" width="190" height="115"><defs><radialGradient id="mc2g1" cx="38%" cy="38%" r="62%"><stop offset="0%" stop-color="#C8D4F5"/><stop offset="100%" stop-color="#8A9EE0"/></radialGradient><radialGradient id="mc2g2" cx="38%" cy="35%" r="62%"><stop offset="0%" stop-color="#DBB8F8"/><stop offset="100%" stop-color="#A47CD8"/></radialGradient><radialGradient id="mc2g3" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#C5D5F4"/><stop offset="100%" stop-color="#95ACEA"/></radialGradient></defs><ellipse cx="132" cy="76" rx="50" ry="30" fill="url(#mc2g3)" opacity="0.5"/><ellipse cx="96" cy="82" rx="65" ry="33" fill="url(#mc2g1)"/><ellipse cx="70" cy="63" rx="38" ry="30" fill="url(#mc2g2)"/><ellipse cx="115" cy="59" rx="36" ry="28" fill="url(#mc2g1)"/><ellipse cx="64" cy="55" rx="18" ry="12" fill="white" opacity="0.32"/><ellipse cx="110" cy="50" rx="13" ry="9" fill="white" opacity="0.22"/></svg>`;

		this.$main.html(`
		<div class="mc2-db">

		  <div class="mc2-col-left">
		    <div class="mc2-notif-panel">
		      <div class="mc2-notif-hdr">
		        <span class="mc2-notif-title">Notifications ${I.bell}</span>
		        <button class="mc2-check-btn">${I.checkCircle}</button>
		      </div>
		      <div class="mc2-notif-body" id="mc2-notif-body">
		        <p>Bienvenue sur votre tableau de bord.</p>
		        <p class="mc2-notif-sub">Enregistrez votre index quotidien pour un suivi précis.</p>
		      </div>
		      <div class="mc2-nav-row">
		        <button class="mc2-arr">&#8249;</button>
		        <div class="mc2-dot-nav"><span class="mc2-dn mc2-dn--on"></span><span class="mc2-dn"></span></div>
		        <button class="mc2-arr">&#8250;</button>
		      </div>
		    </div>

		    <div class="mc2-conso-panel">
		      <div class="mc2-conso-hdr"><span>Ma conso en chiffres</span>${I.scan}</div>
		      <div class="mc2-conso-big-row">
		        <span class="mc2-conso-pct" id="mc2-db-pct">—</span>
		        <span class="mc2-conso-party"></span>
		      </div>
		      <p class="mc2-conso-txt" id="mc2-db-conso-txt">Chargement...</p>
		      <p class="mc2-conso-save" id="mc2-db-conso-save"></p>
		      <div class="mc2-nav-row">
		        <button class="mc2-arr">&#8249;</button>
		        <div class="mc2-dot-nav"><span class="mc2-dn mc2-dn--on"></span><span class="mc2-dn"></span></div>
		        <button class="mc2-arr">&#8250;</button>
		      </div>
		    </div>
		  </div>

		  <div class="mc2-col-mid">
		    <div class="mc2-index-card">
		      <div class="mc2-card-ttl">L'Index du jour ${I.refresh}</div>
		      <div class="mc2-index-fields">
		        <div class="mc2-fg">
		          <label class="mc2-lbl">Index</label>
		          <input id="mc2-db-idx" type="number" class="mc2-inp" step="0.01" placeholder="Entrer l'index">
		        </div>
		        <div class="mc2-fg">
		          <label class="mc2-lbl">Heure actuelle</label>
		          <div class="mc2-time-box" id="mc2-db-last-idx" style="font-size:14px;font-weight:600;">00:00:00</div>
		        </div>
		      </div>
		      <button id="mc2-db-save-btn" class="mc2-btn-enreg">Enregistrer&nbsp;${I.save}</button>
		    </div>

		    <div class="mc2-facture-card">
		      <div class="mc2-fac-top">
		        <button class="mc2-fac-pill" id="mc2-db-fac-period">— &nbsp;▾</button>
		      </div>
		      <a class="mc2-fac-link" style="cursor:pointer;" onclick="frappe.set_route('facture-conso')">Voir toutes les factures</a>
		      <div class="mc2-fac-amount"><span id="mc2-db-fac-amount">—</span><span class="mc2-fac-unit">FCFA</span></div>
		      <button class="mc2-btn-predict" onclick="frappe.set_route('facture-conso')">Prédire ma facture&nbsp;${I.predict}</button>
		    </div>

		    <div class="mc2-carbone-mini">
		      <canvas id="mc2-gauge" width="88" height="54"></canvas>
		      <div class="mc2-cb-info">
		        <div class="mc2-cb-title">Empreinte Carbone ${I.leaf}</div>
		        <div class="mc2-cb-sub" id="mc2-db-co2-sub">Calcul en cours... ${I.info}</div>
		        <a class="mc2-cb-more" style="cursor:pointer;" onclick="frappe.set_route('conso-empreinte-carb')">En savoir plus +</a>
		      </div>
		      <div class="mc2-cb-val" id="mc2-db-co2-val">—<sub>CO₂</sub></div>
		    </div>
		  </div>

		  <div class="mc2-col-right">
		    <div class="mc2-col3-top">
		      <div class="mc2-col3a">
		        <div class="mc2-info-row">
		          <div class="mc2-icard mc2-icard--navy">
		            <div class="mc2-icard-topicon">${I.refreshBig}</div>
		            <div class="mc2-icard-texts">
		              <div class="mc2-icard-sub" id="mc2-db-abo-sub">—</div>
		              <div class="mc2-icard-bold">Abonnement</div>
		            </div>
		          </div>
		          <div class="mc2-icard mc2-icard--salmon">
		            <div class="mc2-icard-topicon">${I.monitor}</div>
		            <div class="mc2-icard-texts">
		              <div class="mc2-icard-sub" id="mc2-db-cpt-sub">—</div>
		              <div class="mc2-icard-bold">Compteur</div>
		            </div>
		          </div>
		        </div>

		        <div class="mc2-tracker-card">
		          <div class="mc2-tracker-hdr">
		            <div>
		              <div class="mc2-card-ttl">Index Tracker Mensuel</div>
		              <div class="mc2-card-sub">Suivez vos enregistrements d'index</div>
		            </div>
		            <select class="mc2-pill-sel" id="mc2-db-tracker-month"></select>
		          </div>
		          <div class="mc2-tracker-body">
		            <div class="mc2-dot-grid" id="mc2-dot-grid"></div>
		            <div class="mc2-last-idx">
		              <div class="mc2-last-idx-lbl">Dernier index enregistré</div>
		              <div class="mc2-last-idx-val" id="mc2-db-last-val">—</div>
		              <div class="mc2-last-idx-unit">kWh</div>
		            </div>
		          </div>
		        </div>
		      </div>

		      <div class="mc2-col3b">
		        <div class="mc2-meteo-card">
		          <div class="mc2-meteo-top-row">
		            <div class="mc2-cloud-wrap">${cloudSVG}</div>
		            <div class="mc2-meteo-right">
		              <div class="mc2-meteo-hdr">
		                <span class="mc2-card-ttl">Météo ${I.cloud}</span>
		                <button class="mc2-icon-btn mc2-meteo-refresh" title="Actualiser la météo">${I.refresh}</button>
		              </div>
		              <p class="mc2-meteo-desc" id="mc2-db-meteo-desc">Localisation en cours…</p>
		            </div>
		          </div>
		          <div class="mc2-temp" id="mc2-db-temp">—°c</div>
		          <div class="mc2-meteo-cond" id="mc2-db-meteo-cond">${I.cloud} —</div>
		          <div style="font-size:11px;color:#7A8FA6;margin:2px 0 4px;" id="mc2-db-feels-like">Ressenti —°c</div>
		          <div style="display:flex;gap:10px;font-size:11px;color:#6A7F94;margin-bottom:6px;" id="mc2-db-meteo-stats">
		            <span id="mc2-db-humidity">💧 —%</span>
		            <span id="mc2-db-wind">💨 — km/h</span>
		            <span id="mc2-db-precip">🌧 — mm</span>
		          </div>
		          <hr class="mc2-hr">
		          <div class="mc2-meteo-detail" id="mc2-db-meteo-loc">${I.pin}&nbsp;—</div>
		          <div class="mc2-meteo-detail" id="mc2-db-meteo-date">${I.cal}&nbsp;—</div>
		        </div>
		      </div>
		    </div>

		    <div class="mc2-stats-card">
		      <div class="mc2-stats-hdr">
		        <div class="mc2-card-ttl">Statistiques ${I.barChart}</div>
		        <div class="mc2-stats-ctrls">
		          <select class="mc2-pill-sel" id="mc2-db-period-sel">
		            <option value="week">Cette semaine</option>
		            <option value="current_month">Ce mois-ci</option>
		            <option value="year">Cette année</option>
		          </select>
		          <button class="mc2-icon-btn mc2-chart-toggle">${_MC2_COL_ICON}</button>
		        </div>
		      </div>
		      <div id="mc2-chart"></div>
		    </div>
		  </div>

		</div>`);
	}

	_bindEvents() {
		this.$main.on('click', '#mc2-db-save-btn', () => this._saveIndex());
		this.$main.on('change', '#mc2-db-period-sel', () => {
			this._chartPeriod = this.$main.find('#mc2-db-period-sel').val();
			this._loadChart();
		});
		this.$main.on('change', '#mc2-db-tracker-month', () => this._loadTrackerDots());
		this.$main.on('click', '.mc2-chart-toggle', () => this._toggleChartType());
		this.$main.on('click', '#mc2-db-fac-period', e => {
			e.stopPropagation();
			this._toggleFacDropdown();
		});
		// Bouton Actualiser la météo (force le rechargement sans cache)
		this.$main.on('click', '.mc2-meteo-refresh', () => this._loadWeather(true));
	}

	_startClock() {
		const tick = () => {
			const now = new Date();
			const pad = n => String(n).padStart(2, '0');
			const t = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
			this.$main.find('#mc2-db-last-idx').text(t);
		};
		tick();
		this._clockTimer = setInterval(tick, 1000);
	}

	_saveIndex() {
		const val = parseFloat(this.$main.find('#mc2-db-idx').val());
		if (!val) { frappe.msgprint('Entrez la valeur de l\'index'); return; }
		const now = new Date();
		const pad = n => String(n).padStart(2, '0');
		frappe.call({
			method: 'myconso2.myconso2.api.add_index',
			args: {
				valeur_index: val,
				date_index: `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,
				heure_index: `${pad(now.getHours())}:${pad(now.getMinutes())}:00`,
			},
			callback: r => {
				if (!r.exc) {
					this.$main.find('#mc2-db-idx').val('');
					this._loadDashboard();
					this._loadChart();
					frappe.show_alert({ message: 'Index enregistré', indicator: 'green' });
				}
			},
		});
	}

	_loadDashboard() {
		frappe.call({
			method: 'myconso2.myconso2.api.get_dashboard_summary',
			callback: r => {
				if (!r.message) return;
				const d = r.message;
				const fmt = v => new Intl.NumberFormat('fr-FR').format(v);
				const params = d.params || {};

				this.$main.find('#mc2-db-abo-sub').text(params.type_abonnement || '—');
				this.$main.find('#mc2-db-cpt-sub').text(params.numero_compteur || '—');

				if (d.latest_index) {
					this.$main.find('#mc2-db-last-val').text(fmt(d.latest_index.valeur_index));
				}

				this.$main.find('#mc2-db-fac-amount').text(fmt(d.current_bill || 0));
				this.$main.find('#mc2-db-fac-period').text(`Facture ${d.current_month_label || ''} ▾`);

				const co2 = d.co2 || 0;
				this.$main.find('#mc2-db-co2-val').html(`${co2}<sub> kg CO₂</sub>`);
				const co2msg = co2 < 20 ? 'Bon ratio, continuez ! Merci pour la Planète !'
				             : co2 < 50 ? 'Consommation modérée.'
				             : 'Attention : consommation élevée.';
				this.$main.find('#mc2-db-co2-sub').text(co2msg);
				this._drawGauge(co2, Math.max(co2 * 1.5, 50));

				const pct = d.pct_change || 0;
				this.$main.find('#mc2-db-pct').text(pct >= 0 ? `+${pct}%` : `${pct}%`)
				          .css('color', pct <= 0 ? '#22C55E' : '#E04E1E');
				this.$main.find('#mc2-db-conso-txt').text(
					pct <= 0
						? 'Votre consommation a baissé par rapport à la moyenne !'
						: 'Votre consommation a augmenté par rapport à la moyenne.'
				);
				this.$main.find('#mc2-db-conso-save').html(`Ce mois : <strong>${fmt(d.consumption_this_month || 0)} kWh</strong>`);

				if ((d.consumption_this_month || 0) > 0) {
					this.$main.find('#mc2-notif-body').html(`
					<p>Consommation du mois : <strong>${fmt(d.consumption_this_month)} kWh</strong></p>
					<p class="mc2-notif-sub">Facture estimée : ${fmt(d.current_bill)} FCFA</p>`);
				}

				this._initTracker();
			},
		});
	}

	// ── Facture period dropdown ──────────────────────────────────────────────

	_loadFacPeriods() {
		frappe.call({
			method: 'myconso2.myconso2.api.get_factures',
			args: { year: new Date().getFullYear() },
			callback: r => {
				this._facPeriods = (r.message && r.message.length) ? r.message : [];
			},
		});
	}

	_toggleFacDropdown() {
		$('#mc2-fac-dd').remove();
		if (!this._facPeriods.length) return;
		const $btn = this.$main.find('#mc2-db-fac-period');
		const fmt  = v => new Intl.NumberFormat('fr-FR').format(v);
		const $dd  = $('<div id="mc2-fac-dd"></div>').css({
			position: 'fixed',
			background: '#fff',
			border: '1px solid #E0E8F0',
			borderRadius: '10px',
			boxShadow: '0 4px 20px rgba(0,0,0,0.13)',
			zIndex: 9999,
			minWidth: '230px',
			padding: '4px 0',
			overflow: 'hidden',
		});
		this._facPeriods.forEach(f => {
			$('<div></div>').css({
				padding: '9px 18px',
				cursor: 'pointer',
				fontSize: '13px',
				color: '#153453',
				display: 'flex',
				justifyContent: 'space-between',
				gap: '16px',
			}).html(`<span>${f.period}</span><span style="font-weight:600;color:#294570">${fmt(f.amount)} FCFA</span>`)
			  .on('click', () => {
			      this.$main.find('#mc2-db-fac-amount').text(fmt(f.amount));
			      this.$main.find('#mc2-db-fac-period').text(`${f.period} ▾`);
			      $dd.remove();
			  })
			  .on('mouseenter', function() { $(this).css('background', '#F0F5FA'); })
			  .on('mouseleave', function() { $(this).css('background', ''); })
			  .appendTo($dd);
		});
		const r = $btn[0].getBoundingClientRect();
		$dd.css({ top: r.bottom + 4, left: r.left });
		$('body').append($dd);
		setTimeout(() => {
			$(document).one('click.mc2facdd', () => $('#mc2-fac-dd').remove());
		}, 10);
	}

	// ── Chart toggle ─────────────────────────────────────────────────────────

	_toggleChartType() {
		this._chartType = this._chartType === 'line' ? 'bar' : 'line';
		this._updateToggleIcon();
		this._loadChart();
	}

	_updateToggleIcon() {
		// Quand line → icône colonne (indique ce qui se passe au clic)
		// Quand bar  → icône ligne
		this.$main.find('.mc2-chart-toggle').html(
			this._chartType === 'line' ? _MC2_COL_ICON : _MC2_LINE_ICON
		);
	}

	// ── Tracker ──────────────────────────────────────────────────────────────

	_initTracker() {
		const now = new Date();
		const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
		const curM = now.getMonth() + 1;
		const $sel = this.$main.find('#mc2-db-tracker-month').empty();
		MONTHS_FR.forEach((m, i) => {
			$sel.append(`<option value="${i+1}" ${i+1 === curM ? 'selected' : ''}>${m}</option>`);
		});
		this._loadTrackerDots();
	}

	_loadTrackerDots() {
		const month = parseInt(this.$main.find('#mc2-db-tracker-month').val()) || (new Date().getMonth() + 1);
		const year  = new Date().getFullYear();
		frappe.call({
			method: 'myconso2.myconso2.api.get_tracker_data',
			args: { month, year },
			callback: r => { if (r.message) this._renderTrackerDots(r.message); },
		});
	}

	_renderTrackerDots(data) {
		const { days_with_entry, days_in_month } = data;
		const entriesSet = new Set(days_with_entry);
		const today    = new Date();
		const isCur    = (today.getMonth() + 1 === data.month && today.getFullYear() === data.year);
		const todayDay = today.getDate();
		const $g = this.$main.find('#mc2-dot-grid').empty();
		let $r = null;
		for (let d = 1; d <= days_in_month; d++) {
			if ((d - 1) % 11 === 0) { $r = $('<div class="mc2-dgrow"></div>'); $g.append($r); }
			let cls;
			if (entriesSet.has(d)) cls = 'mc2-gd mc2-gd--g';
			else if (isCur && d > todayDay) cls = 'mc2-gd mc2-gd--e';
			else cls = 'mc2-gd mc2-gd--h';
			$r.append(`<span class="${cls}" title="Jour ${d}"></span>`);
		}
	}

	// ── Météo ─────────────────────────────────────────────────────────────────

	_loadWeather(forceRefresh = false) {
		const DEFAULT_LAT = 5.3599, DEFAULT_LON = -4.0082;
		const WEATHER_TTL = 10 * 60 * 1000; // 10 min cache météo
		const GEO_TTL     = 15 * 60 * 1000; // 15 min cache géoloc

		// Si pas forceRefresh, essayer le cache météo
		if (!forceRefresh) {
			try {
				const cached = JSON.parse(localStorage.getItem('mc2_weather') || 'null');
				if (cached && (Date.now() - cached.ts) < WEATHER_TTL) {
					this._updateWeather(cached.data);
					return;
				}
			} catch(e) {}
		}

		const doCall = (lat, lon, isDefault = false) => {
			if (isDefault) {
				this.$main.find('#mc2-db-meteo-desc').text('Position par défaut : Abidjan');
			} else {
				this.$main.find('#mc2-db-meteo-desc').text('Localisation en cours…');
			}
			frappe.call({
				method: 'myconso2.myconso2.api.get_current_weather',
				args: { lat, lon },
				callback: r => {
					if (r.message && !r.message.error) {
						try {
							localStorage.setItem('mc2_weather', JSON.stringify({ ts: Date.now(), data: r.message }));
						} catch(e) {}
						this._updateWeather(r.message);
					} else {
						this.$main.find('#mc2-db-meteo-desc').text('Météo indisponible');
					}
				},
			});
		};

		// Vérifier le cache géolocalisation
		try {
			const geoCache = JSON.parse(localStorage.getItem('mc2_geo') || 'null');
			if (geoCache && (Date.now() - geoCache.ts) < GEO_TTL) {
				doCall(geoCache.lat, geoCache.lon);
				return;
			}
		} catch(e) {}

		if (!navigator.geolocation) {
			doCall(DEFAULT_LAT, DEFAULT_LON, true);
			return;
		}
		navigator.geolocation.getCurrentPosition(
			pos => {
				const lat = pos.coords.latitude, lon = pos.coords.longitude;
				try {
					localStorage.setItem('mc2_geo', JSON.stringify({ ts: Date.now(), lat, lon }));
				} catch(e) {}
				doCall(lat, lon);
			},
			() => doCall(DEFAULT_LAT, DEFAULT_LON, true),
			{ timeout: 5000, maximumAge: 300000 }
		);
	}

	_updateWeather(w) {
		const icon  = w.weather_icon  || '';
		const label = w.weather_label || WMO_DESC[w.weather_code || w.weathercode] || '—';
		const loc   = w.city || 'Votre position actuelle';
		const now   = new Date();
		const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
		const pad = n => String(n).padStart(2,'0');
		const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;
		const pinSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7A8FA6" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
		const calSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7A8FA6" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

		const code      = w.weather_code || w.weathercode || 0;
		const temp      = w.temperature   != null ? w.temperature   : (w.temperature_2m || 0);
		const feelsLike = w.feels_like    != null ? w.feels_like    : (w.apparent_temperature || temp);
		const humidity  = w.humidity      != null ? w.humidity      : (w.relativehumidity_2m || '—');
		const windSpeed = w.wind_speed    != null ? w.wind_speed    : (w.windspeed_10m || '—');
		const precip    = w.precipitation != null ? w.precipitation : '—';

		this.$main.find('#mc2-db-temp').text(`${Math.round(temp)}°c`);
		this.$main.find('#mc2-db-meteo-cond').text(`${icon} ${label}`);
		this.$main.find('#mc2-db-feels-like').text(`Ressenti ${Math.round(feelsLike)}°c`);
		this.$main.find('#mc2-db-humidity').text(`💧 ${humidity}%`);
		this.$main.find('#mc2-db-wind').text(`💨 ${windSpeed} km/h`);
		this.$main.find('#mc2-db-precip').text(`🌧 ${precip} mm`);
		this.$main.find('#mc2-db-meteo-loc').html(`${pinSvg}&nbsp;${loc}`);
		this.$main.find('#mc2-db-meteo-date').html(`${calSvg}&nbsp;${dateStr}`);

		const coolCodes = new Set([0,1,2,3,45,48,51,53,55,61,63,65,80,81,82]);
		this.$main.find('#mc2-db-meteo-desc').text(
			coolCodes.has(code)
				? 'Ce temps est susceptible de faire baisser votre consommation !'
				: 'Ce temps peut augmenter votre consommation électrique.'
		);
	}

	// ── Graphique ─────────────────────────────────────────────────────────────

	_loadChart() {
		frappe.call({
			method: 'myconso2.myconso2.api.get_chart_data',
			args: { period: this._chartPeriod },
			callback: r => { if (r.message) this._renderChart(r.message); },
		});
	}

	_renderChart(data) {
		try {
			this.$main.find('#mc2-chart').empty();
			const isBar = this._chartType === 'bar';
			const opts  = {
				type: isBar ? 'bar' : 'line',
				data: {
					labels: data.labels,
					datasets: [{ name: 'Consommation (kWh)', values: data.consumption }],
				},
				colors: [isBar ? '#506f92' : '#1E3A5F'],
				height: 210,
				axisOptions: { xIsSeries: 1 },
				tooltipOptions: { formatTooltipY: d => `${new Intl.NumberFormat('fr-FR').format(d)} kWh` },
			};
			if (!isBar) opts.lineOptions = { hideDots: 0, regionFill: 1 };
			this._chart = new frappe.Chart('#mc2-chart', opts);
			if (isBar) setTimeout(() => this._applyBarGradient(), 150);
		} catch(e) { console.warn('chart:', e); }
	}

	_applyBarGradient() {
		const svg = this.$main.find('#mc2-chart svg')[0];
		if (!svg) return;
		const ns = 'http://www.w3.org/2000/svg';
		let defs = svg.querySelector('defs');
		if (!defs) { defs = document.createElementNS(ns, 'defs'); svg.insertBefore(defs, svg.firstChild); }
		const old = defs.querySelector('#mc2bg');
		if (old) old.remove();
		const grad = document.createElementNS(ns, 'linearGradient');
		grad.setAttribute('id', 'mc2bg');
		grad.setAttribute('gradientUnits', 'objectBoundingBox');
		grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
		grad.setAttribute('x2', '1'); grad.setAttribute('y2', '0');
		[['0%','rgba(80,111,146,1)'],['100%','rgba(225,135,125,1)']].forEach(([off, col]) => {
			const s = document.createElementNS(ns, 'stop');
			s.setAttribute('offset', off); s.setAttribute('stop-color', col);
			grad.appendChild(s);
		});
		defs.appendChild(grad);
		svg.querySelectorAll('rect[fill="#506f92"], path[fill="#506f92"]').forEach(el => {
			el.setAttribute('fill', 'url(#mc2bg)');
		});
	}

	// ── Jauge CO₂ ────────────────────────────────────────────────────────────

	_drawGauge(value, maxVal) {
		const canvas = this.$main.find('#mc2-gauge')[0];
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		const cx = 44, cy = 52, R = 36;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 0, false);
		ctx.strokeStyle = '#E0EAE0'; ctx.lineWidth = 7; ctx.stroke();
		const ratio = Math.min(value / maxVal, 1);
		ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, Math.PI + ratio * Math.PI, false);
		ctx.strokeStyle = ratio < 0.4 ? '#22C55E' : ratio < 0.7 ? '#F59E0B' : '#EF4444';
		ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke();
		const step = maxVal / 3;
		ctx.font = '7px sans-serif'; ctx.fillStyle = '#9CAAB9'; ctx.textAlign = 'center';
		[1, 2, 3].forEach(i => {
			const a = Math.PI + (i / 3) * Math.PI, r2 = R + 11;
			ctx.fillText(Math.round(step * i), cx + r2 * Math.cos(a), cy + r2 * Math.sin(a) + 3);
		});
	}
}
