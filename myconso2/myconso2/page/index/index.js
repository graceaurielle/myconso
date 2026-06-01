frappe.pages['index'].on_page_load = function(wrapper) {
	frappe.ui.make_app_page({ parent: wrapper, title: 'Index du jour', single_column: true });
	new IndexDuJour(wrapper);
};

class IndexDuJour {
	constructor(wrapper) {
		this.$main = $(wrapper).find('.page-content, .layout-main-section').first();
		this._editName = null;
		this._trackerMonth = new Date().getMonth() + 1;
		this._trackerYear = new Date().getFullYear();
		this._listPage = 1;
		this._dateFrom = null;
		this._dateTo = null;
		this._init();
	}

	_init() {
		this._render();
		this._bindEvents();
		this._setFormDefaults();
		this._loadTracker();
		this._loadList();
	}

	_render() {
		const meterIcon = `<svg width="27" height="27" viewBox="0 0 27 27" fill="none"><path d="M25.3125 16.875C25.3113 14.6203 24.6578 12.4141 23.431 10.5224L22.2126 11.7416C23.1367 13.2945 23.6247 15.068 23.625 16.875H25.3125ZM23.625 7.94306L22.432 6.75L15.2035 13.9784C14.6892 13.6684 14.1006 13.5031 13.5 13.5C12.8325 13.5 12.18 13.6979 11.625 14.0688C11.07 14.4396 10.6374 14.9667 10.3819 15.5834C10.1265 16.2001 10.0596 16.8787 10.1899 17.5334C10.3201 18.1881 10.6415 18.7895 11.1135 19.2615C11.5855 19.7335 12.1869 20.0549 12.8416 20.1852C13.4963 20.3154 14.1749 20.2485 14.7916 19.9931C15.4083 19.7376 15.9354 19.3051 16.3062 18.75C16.6771 18.195 16.875 17.5425 16.875 16.875C16.8721 16.2741 16.7068 15.6852 16.3966 15.1706L23.625 7.94306ZM13.5 18.5625C13.1663 18.5625 12.84 18.4635 12.5625 18.2781C12.285 18.0927 12.0687 17.8291 11.941 17.5208C11.8132 17.2124 11.7798 16.8731 11.8449 16.5458C11.9101 16.2184 12.0708 15.9178 12.3068 15.6818C12.5428 15.4458 12.8435 15.285 13.1708 15.2199C13.4981 15.1548 13.8374 15.1882 14.1458 15.316C14.4541 15.4437 14.7177 15.66 14.9031 15.9375C15.0885 16.215 15.1875 16.5412 15.1875 16.875C15.1875 17.3226 15.0097 17.7518 14.6933 18.0682C14.3768 18.3847 13.9476 18.5625 13.5 18.5625ZM13.5 6.75C15.3068 6.75045 17.0799 7.23841 18.6325 8.16244L19.8594 6.93647C18.0765 5.78996 16.0176 5.14516 13.8993 5.0699C11.7809 4.99465 9.68148 5.49172 7.82177 6.50883C5.96206 7.52594 4.41087 9.02548 3.33138 10.8497C2.25189 12.6739 1.68402 14.7553 1.68752 16.875H3.37502C3.37814 14.1906 4.44588 11.6171 6.34401 9.719C8.24214 7.82087 10.8157 6.75313 13.5 6.75Z" fill="#0E3151"/></svg>`;
		const saveIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3.6 6A2.4 2.4 0 0 1 6 3.6h10.055c.636 0 1.246.253 1.697.703l1.945 1.946A2.4 2.4 0 0 1 20.4 7.945V18A2.4 2.4 0 0 1 18 20.4H6A2.4 2.4 0 0 1 3.6 18V6zM6 4.8a1.2 1.2 0 0 0-1.2 1.2v12a1.2 1.2 0 0 0 1.2 1.2V13.8c0-.477.19-.935.527-1.273A1.8 1.8 0 0 1 7.8 12h8.4c.477 0 .935.19 1.273.527A1.8 1.8 0 0 1 18 13.8v5.4a1.2 1.2 0 0 0 1.2-1.2V7.945a1.2 1.2 0 0 0-.352-.849L16.903 5.15A1.2 1.2 0 0 0 16.055 4.8H15.6V7.8a1.8 1.8 0 0 1-1.8 1.8H9a1.8 1.8 0 0 1-1.8-1.8V4.8H6zm2.4 0V7.8a.6.6 0 0 0 .6.6h4.8a.6.6 0 0 0 .6-.6V4.8H8.4zM16.8 19.2V13.8a.6.6 0 0 0-.6-.6H7.8a.6.6 0 0 0-.6.6v5.4h9.6z" fill="white"/></svg>`;
		const calendarIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M7 2h1a1 1 0 0 1 1 1v1h5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1c.796 0 1.559.316 2.121.879A3 3 0 0 1 20 7v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3V3a1 1 0 0 1 1-1zm8 2h1V3h-1v1zM8 4V3H7v1h1zm-2 1a2 2 0 0 0-2 2v1h15V7a2 2 0 0 0-2-2H6zM4 18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V9H4v9zm8-5h5v5h-5v-5zm1 1v3h3v-3h-3z" fill="#0E3151"/></svg>`;
		const editIcon = `<svg width="20" height="20" viewBox="0 0 22 22" fill="none"><path d="M3.667 19.25H18.333M5.194 12.088a1.833 1.833 0 0 0-.611 1.476V16.5h2.954a1.833 1.833 0 0 0 1.305-.612l8.708-8.713a1.833 1.833 0 0 0 0-2.592l-.86-.861a1.833 1.833 0 0 0-2.59 0L5.194 12.088z" stroke="#0E3151" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
		const deleteIcon = `<svg width="20" height="20" viewBox="0 0 22 22" fill="none"><path d="M9.167 4.583h3.666a1.833 1.833 0 0 0-3.666 0zm-1.375 0a3.208 3.208 0 0 1 6.416 0h5.271a.688.688 0 0 1 0 1.375H18.27l-1.072 11.102a3.208 3.208 0 0 1-3.424 2.857H8.226a3.208 3.208 0 0 1-3.424-2.857L3.73 5.958H2.521a.688.688 0 0 1 0-1.375h5.271zm1.833 4.354a.688.688 0 0 0-1.375 0v6.875a.688.688 0 1 0 1.375 0V8.937zm3.438-.688a.688.688 0 0 1 .688.688v6.875a.688.688 0 1 1-1.375 0V8.937a.688.688 0 0 1 .687-.688z" fill="#0E3151"/></svg>`;
		const filterIcon = `<svg width="25" height="25" viewBox="0 0 25 25" fill="none"><path d="M22.135 12.5H9.266M4.723 12.5H2.864M4.723 12.5a2.27 2.27 0 1 0 4.54 0 2.27 2.27 0 0 0-4.54 0zM22.135 19.382h-5.988m0 0a2.27 2.27 0 1 1-4.54 0m4.54 0a2.27 2.27 0 1 0-4.54 0M11.605 19.382H2.864M22.135 5.618H18.9M14.358 5.618H2.864m11.494 0a2.27 2.27 0 1 1 4.54 0 2.27 2.27 0 0 1-4.54 0z" stroke="#0E3151" stroke-width="1.688" stroke-miterlimit="10" stroke-linecap="round"/></svg>`;
		const decoCircle = `<svg width="268" height="268" viewBox="0 0 341 341" fill="none"><path d="M127.12 43.3033C57.0315 67.1788 19.4223 143.622 43.3006 213.719C67.1789 283.815 143.633 321.403 213.721 297.527C283.809 273.652 321.419 197.208 297.54 127.112C273.662 57.0157 197.208 19.4277 127.12 43.3033ZM210.837 289.06C145.418 311.345 74.0681 276.248 51.7832 210.829C29.4983 145.41 64.5851 74.055 130.004 51.77C195.423 29.4851 266.773 64.5826 289.058 130.002C311.343 195.421 276.256 266.776 210.837 289.06Z" fill="#618DB9" fill-opacity="0.08"/></svg>`;
		const boltSm = `<svg width="56" height="54" viewBox="0 0 76 75" fill="none"><path d="M53.713 20.832L22.436 27.638c-1.94.434-2.363 2.96-.689 4.081l15.717 10.605L20.201 50.303c-.787.368-1.192 1.255-.932 2.092.289.931 1.24 1.477 2.19 1.25l31.277-6.807c1.94-.434 2.363-2.96.689-4.081L37.708 32.151l17.262-7.977c.787-.369 1.192-1.255.932-2.093-.133-.445-.437-.825-.847-1.058-.409-.234-.892-.303-1.342-.19z" fill="#618DB9" fill-opacity="0.08"/></svg>`;
		const boltLg = `<svg width="84" height="81" viewBox="0 0 76 75" fill="none"><path d="M53.713 20.832L22.436 27.638c-1.94.434-2.363 2.96-.689 4.081l15.717 10.605L20.201 50.303c-.787.368-1.192 1.255-.932 2.092.289.931 1.24 1.477 2.19 1.25l31.277-6.807c1.94-.434 2.363-2.96.689-4.081L37.708 32.151l17.262-7.977c.787-.369 1.192-1.255.932-2.093-.133-.445-.437-.825-.847-1.058-.409-.234-.892-.303-1.342-.19z" fill="#618DB9" fill-opacity="0.08"/></svg>`;

		const now = new Date();
		const curM = now.getMonth() + 1, curY = now.getFullYear();
		const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
		const monthOpts = MONTHS_FR.map((m, i) =>
			`<option value="${i+1}" ${i+1 === curM ? 'selected' : ''}>${m} ${curY}</option>`
		).join('');

		this.$main.html(`
		<div class="mc2-idx-page">

		  <div class="mc2-idx-top-card">
		    <div class="mc2-idx-card-title-row">
		      <span class="mc2-idx-title-text">L'Index du jour</span>
		      ${meterIcon}
		    </div>
		    <div class="mc2-idx-body">
		      <div class="mc2-idx-bolt mc2-idx-bolt--tl">${boltLg}</div>
		      <div class="mc2-idx-bolt mc2-idx-bolt--bl">${boltSm}</div>
		      <div class="mc2-idx-bolt mc2-idx-bolt--br">${boltLg}</div>
		      <div class="mc2-idx-bolt mc2-idx-bolt--tr">${boltSm}</div>
		      <div class="mc2-idx-deco"><div class="mc2-idx-deco-circle">${decoCircle}</div></div>

		      <div class="mc2-idx-form">
		        <div class="mc2-idx-field">
		          <label class="mc2-idx-label">Index</label>
		          <input id="mc2-idx-valeur" class="mc2-idx-input" type="number" step="0.01" placeholder="Entrer l'index" />
		        </div>
		        <div class="mc2-idx-form-2col">
		          <div class="mc2-idx-field">
		            <label class="mc2-idx-label">Heure</label>
		            <div class="mc2-idx-time-wrap">
		              <input id="mc2-idx-hh" class="mc2-idx-time-input" maxlength="2" placeholder="HH" />
		              <span class="mc2-idx-sep">:</span>
		              <input id="mc2-idx-mm" class="mc2-idx-time-input" maxlength="2" placeholder="MM" />
		            </div>
		          </div>
		          <div class="mc2-idx-field">
		            <label class="mc2-idx-label">Date</label>
		            <div class="mc2-idx-date-wrap">
		              <input id="mc2-idx-date" class="mc2-idx-date-input" type="date" />
		              <span class="mc2-idx-cal-icon">${calendarIcon}</span>
		            </div>
		          </div>
		        </div>
		        <div style="display:flex;gap:10px;align-items:center;margin-top:4px;">
		          <button id="mc2-idx-btn-save" class="mc2-idx-btn-save">Enregistrer ${saveIcon}</button>
		          <a id="mc2-idx-btn-cancel" style="display:none;cursor:pointer;color:#E04E1E;font-size:13px;">Annuler</a>
		        </div>
		      </div>

		      <div class="mc2-idx-tracker-card">
		        <div class="mc2-idx-tracker-hdr">
		          <div>
		            <div class="mc2-idx-tracker-title">Index Tracker Mensuel</div>
		            <div class="mc2-idx-tracker-sub">Suivez vos enregistrements d'index</div>
		          </div>
		          <select id="mc2-idx-month-sel" class="mc2-idx-month-pill">${monthOpts}</select>
		        </div>
		        <div id="mc2-idx-dots" class="mc2-idx-dots-wrap"></div>
		      </div>
		    </div>
		  </div>

		  <div class="mc2-idx-list-card">
		    <div class="mc2-idx-list-hdr-row">
		      <div class="mc2-idx-list-title">Liste index ${meterIcon}</div>
		      <div class="mc2-idx-filter-bar">
		        ${filterIcon}
		        <select id="mc2-idx-period-sel" class="mc2-idx-filter-pill">
		          <option value="all">Tout</option>
		          <option value="week">Cette semaine</option>
		          <option value="month">Ce mois</option>
		          <option value="year">Cette année</option>
		          <option value="custom">Personnalisé</option>
		        </select>
		        <span class="mc2-idx-filter-lbl">Du</span>
		        <div class="mc2-idx-date-filter-wrap">
		          <input id="mc2-idx-date-from" class="mc2-idx-date-filter-input" type="date" />
		          ${calendarIcon}
		        </div>
		        <span class="mc2-idx-filter-lbl">au</span>
		        <div class="mc2-idx-date-filter-wrap">
		          <input id="mc2-idx-date-to" class="mc2-idx-date-filter-input" type="date" />
		          ${calendarIcon}
		        </div>
		      </div>
		    </div>
		    <div class="mc2-idx-tbl-header">
		      <span></span>
		      <span class="mc2-idx-th">Index</span>
		      <span class="mc2-idx-th">Date</span>
		      <span class="mc2-idx-th">Heure</span>
		      <span></span>
		    </div>
		    <div id="mc2-idx-rows-container"></div>
		    <div id="mc2-idx-pagination" class="mc2-idx-pagination"></div>
		  </div>

		</div>`);

		this._editIcon = editIcon;
		this._deleteIcon = deleteIcon;
	}

	_setFormDefaults() {
		const now = new Date();
		const pad = n => String(n).padStart(2, '0');
		const y = now.getFullYear(), mo = pad(now.getMonth() + 1), d = pad(now.getDate());
		const todayStr = `${y}-${mo}-${d}`;
		this.$main.find('#mc2-idx-hh').val(pad(now.getHours()));
		this.$main.find('#mc2-idx-mm').val(pad(now.getMinutes()));
		this.$main.find('#mc2-idx-date').val(todayStr).attr('max', todayStr);
	}

	_bindEvents() {
		this.$main.on('click', '#mc2-idx-btn-save', () => this._saveIndex());

		this.$main.on('click', '#mc2-idx-btn-cancel', () => {
			this._editName = null;
			this._clearForm();
			this.$main.find('#mc2-idx-btn-save').text('Enregistrer').append(` ${this._saveIconHtml}`);
			this.$main.find('#mc2-idx-btn-cancel').hide();
		});

		this.$main.on('change', '#mc2-idx-month-sel', () => {
			this._trackerMonth = parseInt(this.$main.find('#mc2-idx-month-sel').val());
			this._loadTracker();
		});

		this.$main.on('change', '#mc2-idx-period-sel', () => this._applyPeriodFilter());
		this.$main.on('change', '#mc2-idx-date-from, #mc2-idx-date-to', () => {
			if (this.$main.find('#mc2-idx-period-sel').val() === 'custom') this._loadList();
		});

		this.$main.on('click', '.mc2-idx-del-btn', e => {
			const $row = $(e.currentTarget).closest('.mc2-idx-row');
			this._deleteIndex($row.data('name'));
		});

		this.$main.on('click', '.mc2-idx-edit-btn', e => {
			const $row = $(e.currentTarget).closest('.mc2-idx-row');
			this._startEdit($row.data('name'), $row.data('valeur'), $row.data('date'), $row.data('heure'));
		});

		this.$main.on('click', '.mc2-idx-pnum', e => {
			const p = parseInt($(e.currentTarget).data('page'));
			if (!isNaN(p)) this._loadList(p);
		});
	}

	_applyPeriodFilter() {
		const period = this.$main.find('#mc2-idx-period-sel').val();
		const today = new Date();
		const fmt = d => {
			const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
			return `${y}-${mo}-${dd}`;
		};
		if (period === 'week') {
			const from = new Date(today); from.setDate(today.getDate() - 6);
			this._dateFrom = fmt(from); this._dateTo = fmt(today);
		} else if (period === 'month') {
			this._dateFrom = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
			this._dateTo = fmt(today);
		} else if (period === 'year') {
			this._dateFrom = `${today.getFullYear()}-01-01`; this._dateTo = fmt(today);
		} else if (period === 'custom') {
			this._dateFrom = this.$main.find('#mc2-idx-date-from').val() || null;
			this._dateTo = this.$main.find('#mc2-idx-date-to').val() || null;
			return;
		} else {
			this._dateFrom = null; this._dateTo = null;
		}
		this.$main.find('#mc2-idx-date-from').val(this._dateFrom || '');
		this.$main.find('#mc2-idx-date-to').val(this._dateTo || '');
		this._loadList();
	}

	_saveIndex() {
		const valeur = parseFloat(this.$main.find('#mc2-idx-valeur').val());
		const hh = this.$main.find('#mc2-idx-hh').val().padStart(2, '0');
		const mm = this.$main.find('#mc2-idx-mm').val().padStart(2, '0');
		const date = this.$main.find('#mc2-idx-date').val();
		if (!valeur || !date) { frappe.msgprint('Veuillez saisir la valeur et la date'); return; }
		const today = new Date().toISOString().split('T')[0];
		if (date > today) { frappe.msgprint('Impossible d\'entrer un index pour une date future'); return; }
		const heure = `${hh}:${mm}:00`;

		const method = this._editName
			? 'myconso2.myconso2.api.update_index'
			: 'myconso2.myconso2.api.add_index';
		const args = this._editName
			? { name: this._editName, valeur_index: valeur, date_index: date, heure_index: heure }
			: { valeur_index: valeur, date_index: date, heure_index: heure };

		frappe.call({ method, args, callback: r => {
			if (!r.exc) {
				this._editName = null;
				this._clearForm();
				this.$main.find('#mc2-idx-btn-cancel').hide();
				this._loadList(1);
				this._loadTracker();
				frappe.show_alert({ message: this._editName ? 'Index mis à jour' : 'Index enregistré', indicator: 'green' });
			}
		}});
	}

	_deleteIndex(name) {
		frappe.confirm('Supprimer cet enregistrement ?', () => {
			frappe.call({
				method: 'myconso2.myconso2.api.delete_index',
				args: { name },
				callback: r => {
					if (!r.exc) {
						this._loadList(this._listPage);
						this._loadTracker();
						frappe.show_alert({ message: 'Supprimé', indicator: 'orange' });
					}
				},
			});
		});
	}

	_startEdit(name, valeur, date, heure) {
		this._editName = name;
		this.$main.find('#mc2-idx-valeur').val(valeur);
		const parts = (heure || '00:00:00').split(':');
		this.$main.find('#mc2-idx-hh').val(parts[0] || '00');
		this.$main.find('#mc2-idx-mm').val(parts[1] || '00');
		this.$main.find('#mc2-idx-date').val(date);
		this.$main.find('#mc2-idx-btn-save').html('Mettre à jour');
		this.$main.find('#mc2-idx-btn-cancel').show();
		this.$main.find('#mc2-idx-valeur')[0].scrollIntoView({ behavior: 'smooth' });
	}

	_clearForm() {
		this.$main.find('#mc2-idx-valeur').val('');
		this._setFormDefaults();
		this.$main.find('#mc2-idx-btn-save').html('Enregistrer <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3.6 6A2.4 2.4 0 0 1 6 3.6h10.055c.636 0 1.246.253 1.697.703l1.945 1.946A2.4 2.4 0 0 1 20.4 7.945V18A2.4 2.4 0 0 1 18 20.4H6A2.4 2.4 0 0 1 3.6 18V6zM6 4.8a1.2 1.2 0 0 0-1.2 1.2v12a1.2 1.2 0 0 0 1.2 1.2V13.8c0-.477.19-.935.527-1.273A1.8 1.8 0 0 1 7.8 12h8.4c.477 0 .935.19 1.273.527A1.8 1.8 0 0 1 18 13.8v5.4a1.2 1.2 0 0 0 1.2-1.2V7.945a1.2 1.2 0 0 0-.352-.849L16.903 5.15A1.2 1.2 0 0 0 16.055 4.8H15.6V7.8a1.8 1.8 0 0 1-1.8 1.8H9a1.8 1.8 0 0 1-1.8-1.8V4.8H6zm2.4 0V7.8a.6.6 0 0 0 .6.6h4.8a.6.6 0 0 0 .6-.6V4.8H8.4zM16.8 19.2V13.8a.6.6 0 0 0-.6-.6H7.8a.6.6 0 0 0-.6.6v5.4h9.6z" fill="white"/></svg>');
	}

	_loadTracker() {
		frappe.call({
			method: 'myconso2.myconso2.api.get_tracker_data',
			args: { month: this._trackerMonth, year: this._trackerYear },
			callback: r => { if (r.message) this._renderTracker(r.message); },
		});
	}

	_renderTracker(data) {
		const { days_with_entry, days_in_month } = data;
		const entriesSet = new Set(days_with_entry);
		const today = new Date();
		const isCurMonth = (today.getMonth() + 1 === this._trackerMonth && today.getFullYear() === this._trackerYear);
		const todayDay = today.getDate();
		const DOTS_PER_ROW = 11;
		const $c = this.$main.find('#mc2-idx-dots').empty();
		let $row = null;
		for (let d = 1; d <= days_in_month; d++) {
			if ((d - 1) % DOTS_PER_ROW === 0) { $row = $('<div class="mc2-idx-dots-row"></div>'); $c.append($row); }
			let style;
			if (entriesSet.has(d)) {
				style = 'background:linear-gradient(180deg,#E1877D 0%,#506F92 100%);box-shadow:0 0 3px rgba(0,0,0,0.25)';
			} else if (isCurMonth && d > todayDay) {
				style = 'background:#e9e9e9;box-shadow:0 0 3px rgba(0,0,0,0.1)';
			} else {
				style = 'background:rgba(14,49,81,0.12);box-shadow:0 0 3px rgba(0,0,0,0.1)';
			}
			$row.append(`<div class="mc2-idx-dot" style="${style}" title="Jour ${d}"></div>`);
		}
	}

	_loadList(page = 1) {
		this._listPage = page;
		frappe.call({
			method: 'myconso2.myconso2.api.get_indexes',
			args: { date_from: this._dateFrom || '', date_to: this._dateTo || '', page, per_page: 10 },
			callback: r => { if (r.message) this._renderList(r.message); },
		});
	}

	_renderList(data) {
		const { rows, total, page, per_page } = data;
		const $c = this.$main.find('#mc2-idx-rows-container').empty();
		if (!rows.length) {
			$c.html('<div style="padding:24px;text-align:center;color:#9CAAB9;">Aucun enregistrement</div>');
		} else {
			rows.forEach((row, i) => {
				const num = (page - 1) * per_page + i + 1;
				const val = new Intl.NumberFormat('fr-FR').format(row.valeur_index);
				const dateStr = frappe.datetime.str_to_user(row.date_index);
				const heureStr = (row.heure_index || '').substring(0, 5);
				$c.append(`
				<div class="mc2-idx-row" data-name="${row.name}" data-valeur="${row.valeur_index}" data-date="${row.date_index}" data-heure="${row.heure_index || ''}">
				  <span class="mc2-idx-rn">${num}.</span>
				  <span class="mc2-idx-rv">${val}</span>
				  <span class="mc2-idx-rd">${dateStr}</span>
				  <span class="mc2-idx-rh">${heureStr}</span>
				  <span class="mc2-idx-ra">
				    <button class="mc2-idx-icon-btn mc2-idx-edit-btn">${this._editIcon}</button>
				    <button class="mc2-idx-icon-btn mc2-idx-del-btn">${this._deleteIcon}</button>
				  </span>
				</div>`);
			});
		}
		this._renderPagination(total, page, per_page);
	}

	_renderPagination(total, page, per_page) {
		const totalPages = Math.ceil(total / per_page);
		const $p = this.$main.find('#mc2-idx-pagination').empty();
		if (totalPages <= 1) return;
		for (let i = 1; i <= totalPages; i++) {
			$p.append(`<span class="mc2-idx-pnum${i === page ? ' mc2-idx-pnum--active' : ''}" data-page="${i}">${i}</span>`);
		}
	}
}
