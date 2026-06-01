frappe.pages['conso-empreinte-carb'].on_page_load = function(wrapper) {
	frappe.ui.make_app_page({ parent: wrapper, title: 'Empreinte Carbone', single_column: true });
	new EmpreinteCarbone(wrapper);
};

class EmpreinteCarbone {
	constructor(wrapper) {
		this.$root = $(wrapper).find('.page-content, .layout-main-section').first();
		this._chart = null;
		this._tips  = [];
		this._tipIdx = 0;
		this.render();
		this._bindEvents();
		this._loadData();
	}

	// ---------- gauge helpers ----------

	_gaugeArc(pct) {
		if (pct <= 0) return null;
		const cx = 130.5, cy = 127, r = 105;
		const endRad = Math.PI / 2 + pct * (270 * Math.PI / 180);
		const x = cx + r * Math.cos(endRad);
		const y = cy + r * Math.sin(endRad);
		const la = (pct * 270) > 180 ? 1 : 0;
		return `M ${cx} ${(cy + r).toFixed(2)} A ${r} ${r} 0 ${la} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
	}

	_gaugeColor(pct) {
		if (pct < 0.3) return 'url(#ecGradGreen)';
		if (pct < 0.65) return 'url(#ecGradOrange)';
		return 'url(#ecGradRed)';
	}

	_gaugeTextColor(pct) {
		if (pct < 0.3) return 'linear-gradient(180deg,#A5D8A8 0%,#4BA668 100%)';
		if (pct < 0.65) return 'linear-gradient(180deg,#FFE642 0%,#FA9517 100%)';
		return 'linear-gradient(180deg,#FA9517 0%,#FE3F14 100%)';
	}

	_buildGaugeSvg(pct) {
		const arcPath  = this._gaugeArc(pct);
		const arcColor = this._gaugeColor(pct);
		return `<svg width="261" height="254" viewBox="0 0 261 254" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ecGradGreen"  x1="0" y1="1" x2="1" y2="0">
      <stop offset="27%" stop-color="#A5D8A8"/>
      <stop offset="54%" stop-color="#70D877"/>
      <stop offset="100%" stop-color="#4BA668"/>
    </linearGradient>
    <linearGradient id="ecGradOrange" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFE642"/>
      <stop offset="100%" stop-color="#FA9517"/>
    </linearGradient>
    <linearGradient id="ecGradRed"    x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#FA9517"/>
      <stop offset="100%" stop-color="#FE3F14"/>
    </linearGradient>
  </defs>
  <circle cx="130.5" cy="127" r="105" fill="none" stroke="rgba(14,49,81,0.19)" stroke-width="28"/>
  ${arcPath ? `<path d="${arcPath}" fill="none" stroke="${arcColor}" stroke-width="28" stroke-linecap="round"/>` : ''}
  <circle cx="130.5" cy="127" r="77" fill="white"/>
</svg>`;
	}

	// ---------- SVG icons ----------
	_svgFilter() {
		return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20.5133 11.5839H8.5867M4.37692 11.5839H2.65479M4.37692 11.5839C4.37692 11.0257 4.59864 10.4905 4.99329 10.0958C5.38794 9.70117 5.9232 9.47945 6.48133 9.47945C7.03945 9.47945 7.57471 9.70117 7.96936 10.0958C8.36402 10.4905 8.58573 11.0257 8.58573 11.5839C8.58573 12.142 8.36402 12.6772 7.96936 13.0719C7.57471 13.4665 7.03945 13.6883 6.48133 13.6883C5.9232 13.6883 5.38794 13.4665 4.99329 13.0719C4.59864 12.6772 4.37692 12.142 4.37692 11.5839ZM20.5133 17.9617H14.9646M14.9646 17.9617C14.9646 18.52 14.7423 19.0559 14.3476 19.4506C13.9529 19.8454 13.4175 20.0671 12.8592 20.0671C12.3011 20.0671 11.7658 19.8444 11.3712 19.4498C10.9765 19.0551 10.7548 18.5199 10.7548 17.9617M14.9646 17.9617C14.9646 17.4035 14.7423 16.8686 14.3476 16.4738C13.9529 16.0791 13.4175 15.8573 12.8592 15.8573C12.3011 15.8573 11.7658 16.0791 11.3712 16.4737C10.9765 16.8684 10.7548 17.4036 10.7548 17.9617M10.7548 17.9617H2.65479M20.5133 5.20597H17.5159M13.3062 5.20597H2.65479M13.3062 5.20597C13.3062 4.64784 13.5279 4.11258 13.9225 3.71793C14.3172 3.32328 14.8524 3.10156 15.4106 3.10156C16.9274 3.10156 17.515 5.20597 17.515 5.20597C17.515 5.48232 17.4605 5.75597 17.3548 6.01129C17.249 6.26661 17.094 6.49859 16.8986 6.694C16.7032 6.88942 16.4712 7.04443 16.2159 7.15018C15.9606 7.25594 15.6869 7.31037 15.4106 7.31037C14.8524 7.31037 14.3172 7.08866 13.9225 6.694C13.5279 6.29935 13.3062 5.76409 13.3062 5.20597Z" stroke="#0E3151" stroke-width="1.6875" stroke-miterlimit="10" stroke-linecap="round"/></svg>`;
	}

	_svgCal() {
		return `<svg width="23" height="23" viewBox="0 0 23 23" fill="none"><path d="M6.487 1.853H7.414C7.66 1.853 7.895 1.951 8.069 2.125C8.243 2.299 8.341 2.534 8.341 2.78V3.707H12.974V2.78C12.974 2.534 13.072 2.299 13.245 2.125C13.419 1.951 13.655 1.853 13.901 1.853H14.827C15.073 1.853 15.309 1.951 15.483 2.125C15.657 2.299 15.754 2.534 15.754 2.78V3.707C16.492 3.707 17.199 3.999 17.72 4.521C18.241 5.042 18.534 5.75 18.534 6.487V16.681C18.534 17.418 18.241 18.125 17.72 18.647C17.199 19.168 16.492 19.461 15.754 19.461H5.56C4.823 19.461 4.116 19.168 3.594 18.647C3.073 18.125 2.78 17.418 2.78 16.681V6.487C2.78 5.75 3.073 5.042 3.594 4.521C4.116 3.999 4.823 3.707 5.56 3.707V2.78C5.56 2.534 5.658 2.299 5.832 2.125C6.006 1.951 6.241 1.853 6.487 1.853ZM13.901 3.707H14.827V2.78H13.901V3.707ZM7.414 3.707V2.78H6.487V3.707H7.414ZM5.56 4.634C5.069 4.634 4.597 4.829 4.25 5.176C3.902 5.524 3.707 5.995 3.707 6.487V7.414H17.607V6.487C17.607 5.995 17.412 5.524 17.065 5.176C16.717 4.829 16.246 4.634 15.754 4.634H5.56ZM3.707 16.681C3.707 17.172 3.902 17.644 4.25 17.991C4.597 18.339 5.069 18.534 5.56 18.534H15.754C16.246 18.534 16.717 18.339 17.065 17.991C17.412 17.644 17.607 17.172 17.607 16.681V8.34H3.707V16.681ZM11.121 12.047H15.754V16.681H11.121V12.047ZM12.047 12.974V15.754H14.827V12.974H12.047Z" fill="#0E3151"/></svg>`;
	}

	_svgCarbone() {
		return `<svg width="35" height="28" viewBox="0 0 35 28" fill="none"><path d="M10.5 26.25H19.25C24.199 26.25 26.675 26.25 28.212 24.712C29.748 23.174 29.75 20.7 29.75 15.75C29.75 12.489 29.75 10.303 29.311 8.75M6.125 5.317C3.924 5.44 2.534 5.791 1.538 6.787C0 8.327 0 10.8 0 15.75C0 19.676 0 22.045 0.768 23.626M29.75 11.375L31.547 11.675C32.739 11.874 33.336 11.972 33.787 12.263C34.233 12.547 34.582 12.958 34.79 13.444C35 13.938 35 14.541 35 15.75C35 16.958 35 17.563 34.79 18.057C34.583 18.543 34.234 18.954 33.789 19.238C33.336 19.527 32.739 19.627 31.549 19.826L29.75 20.126" stroke="#0E3151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.308 28C4.454 18.55 12.25 16.625 15.75 12.25M15.81 20.712C20.264 19.469 23.12 16.489 24.178 11.984C25.379 6.883 23.228 -0.064 17.681 0C17.681 0 18.244 2.205 17.75 3.283C15.931 7.265 9.625 6.988 7.583 12.034C6.365 14.86 7.102 18.015 9.391 19.825C10.829 20.962 13.671 21.31 15.81 20.712Z" stroke="#0E3151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
	}

	_svgStats() {
		return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4.6875 1.875C3.94158 1.875 3.22621 2.17132 2.69876 2.69876C2.17132 3.22621 1.875 3.94158 1.875 4.6875V15.3125C1.875 16.0584 2.17132 16.7738 2.69876 17.3012C3.22621 17.8287 3.94158 18.125 4.6875 18.125H15.3125C16.0584 18.125 16.7738 17.8287 17.3012 17.3012C17.8287 16.7738 18.125 16.0584 18.125 15.3125V4.6875C18.125 3.94158 17.8287 3.22621 17.3012 2.69876C16.7738 2.17132 16.0584 1.875 15.3125 1.875H4.6875ZM14.375 6.25V13.75C14.375 14.0815 14.0815 14.375 13.75 14.375C13.4185 14.375 13.125 14.0815 13.125 13.75V6.25C13.125 5.91848 13.4185 5.625 13.75 5.625C14.0815 5.625 14.375 5.91848 14.375 6.25ZM10.625 10.625V13.75C10.625 14.0815 10.3315 14.375 10 14.375C9.66848 14.375 9.375 14.0815 9.375 13.75V10.625C9.375 10.2935 9.66848 10 10 10C10.3315 10 10.625 10.2935 10.625 10.625ZM6.875 8.125V13.75C6.875 14.0815 6.58152 14.375 6.25 14.375C5.91848 14.375 5.625 14.0815 5.625 13.75V8.125C5.625 7.79348 5.91848 7.5 6.25 7.5C6.58152 7.5 6.875 7.79348 6.875 8.125Z" fill="#0E3151"/></svg>`;
	}

	_svgCarbonIcon(type) {
		const id  = type === 1 ? 'ci1' : 'ci2';
		const col = type === 1
			? '<stop offset="0.27" stop-color="#A5D8A8"/><stop offset="0.54" stop-color="#70D877"/><stop offset="1" stop-color="#4BA668"/>'
			: '<stop offset="0.33" stop-color="#FFE642"/><stop offset="0.82" stop-color="#FE3F14"/><stop offset="1" stop-color="#FF0B0B"/>';
		return `<svg width="65" height="32" viewBox="0 0 65 32" fill="none"><g filter="url(#${id}f)"><path d="M65 30.35C65 26.37 64.2 22.42 62.64 18.74C61.09 15.06 58.81 11.71 55.93 8.89C53.05 6.07 49.64 3.84 45.88 2.31C42.13 0.79 38.1 0 34.03 0C29.97 0 25.94 0.79 22.18 2.31C18.43 3.84 15.01 6.07 12.14 8.89C9.26 11.71 6.98 15.06 5.42 18.74C3.87 22.42 3.07 26.37 3.07 30.35H65Z" fill="#0E3151" fill-opacity="0.5"/></g><path d="M6.46 8.82C3.96 11.98 2.12 15.59 1.06 19.44C0 23.29 -0.27 27.31 0.27 31.26L9.26 30.11C8.88 27.3 9.07 24.45 9.82 21.72C10.58 18.98 11.88 16.42 13.65 14.17L6.46 8.82Z" fill="url(#${id}g)"/><defs><filter id="${id}f" x="2.07" y="-1" width="63.93" height="32.35" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur stdDeviation="0.5" result="effect1"/></filter><linearGradient id="${id}g" x1="21.46" y1="7.97" x2="3.84" y2="24.7" gradientUnits="userSpaceOnUse">${col}</linearGradient></defs></svg>`;
	}

	_svgBulb() {
		return `<svg width="14" height="17" viewBox="0 0 14 17" fill="none"><path d="M12.5 6.35C12.5 8.5 11.4417 10.1542 9.83167 11.2433C9.45667 11.4967 9.26917 11.6233 9.17667 11.7683C9.085 11.9117 9.0525 12.1017 8.99 12.48L8.94 12.7742C8.83 13.4392 8.77417 13.7717 8.54083 13.9692C8.3075 14.1667 7.97083 14.1667 7.29667 14.1667H5.12C4.44583 14.1667 4.10917 14.1667 3.87583 13.9692C3.6425 13.7717 3.5875 13.4392 3.47583 12.7742L3.4275 12.48C3.36417 12.1025 3.33333 11.9133 3.24167 11.77C3.15 11.6267 2.96167 11.4983 2.58583 11.2417C0.993333 10.1525 0 8.49917 0 6.35C0 2.84417 2.79833 0 6.25 0C9.70167 0 12.5 2.84417 12.5 6.35Z" stroke="#FAFAFA" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.91683 14.1667V15C7.91683 15.7858 7.36 16.6667 6.25016 16.6667C5.14033 16.6667 4.5835 15.7858 4.5835 15V14.1667M10.4168 0L10.6318 0.580833C10.9135 1.3425 11.0543 1.72333 11.3318 2.00083C11.6102 2.27917 11.991 2.42 12.7527 2.70167L13.3335 2.91667L12.7527 3.13167C11.991 3.41333 11.6102 3.55417 11.3327 3.83167C11.0543 4.11 10.9135 4.49083 10.6318 5.2525L10.4168 5.83333L10.2018 5.2525C9.92016 4.49083 9.77933 4.11 9.50183 3.8325C9.2235 3.55417 8.84266 3.41333 8.081 3.13167L7.50016 2.91667L8.081 2.70167C8.84266 2.42 9.2235 2.27917 9.501 2.00167C9.77933 1.72333 9.92016 1.3425 10.2018 0.580833L10.4168 0Z" stroke="#FAFAFA" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
	}

	_svgCheck() {
		return `<svg width="15" height="14" viewBox="0 0 15 14" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.2181 0.319767C14.4226 0.524343 14.5375 0.80177 14.5375 1.09104C14.5375 1.38031 14.4226 1.65774 14.2181 1.86231L6.04141 10.039C5.93335 10.1471 5.80506 10.2329 5.66386 10.2914C5.52267 10.3498 5.37133 10.38 5.2185 10.38C5.06566 10.38 4.91433 10.3498 4.77313 10.2914C4.63193 10.2329 4.50364 10.1471 4.39559 10.039L0.333042 5.97722C0.228849 5.87659 0.145741 5.75621 0.0885675 5.62312C0.031394 5.49002 0.0012999 5.34687 4.1189e-05 5.20202C-0.00121752 5.05717 0.0263845 4.91352 0.0812363 4.77945C0.136088 4.64538 0.217092 4.52358 0.31952 4.42115C0.421948 4.31873 0.54375 4.23772 0.677819 4.18287C0.811888 4.12802 0.955538 4.10042 1.10039 4.10168C1.24524 4.10293 1.38839 4.13303 1.52148 4.1902C1.65458 4.24738 1.77495 4.33048 1.87559 4.43468L5.21813 7.77722L12.6749 0.319767C12.7762 0.218393 12.8965 0.137974 13.0289 0.0831073C13.1613 0.0282403 13.3032 0 13.4465 0C13.5898 0 13.7317 0.0282403 13.8641 0.0831073C13.9965 0.137974 14.1168 0.218393 14.2181 0.319767Z" fill="#0E3151"/></svg>`;
	}

	_svgBgNotif() {
		return `<svg width="117" height="155" viewBox="0 0 117 155" fill="none"><g opacity="0.5" clip-path="url(#clip0_ec)"><path d="M57.4227 120.058L59.0654 116.216C61.0503 111.574 67.9764 109.342 72.5909 107.61C79.0944 105.171 84.0562 100.279 87.0261 93.334C92.5017 80.5283 86.6808 65.9218 73.832 60.4277C70.8062 59.124 67.5526 58.4311 64.2582 58.3891C60.9637 58.347 57.6935 58.9566 54.6355 60.1828C51.5774 61.4089 48.7919 63.2275 46.4391 65.5338C44.0863 67.8402 42.2126 70.5889 40.9257 73.6218C38.062 80.3192 37.8857 87.7321 40.5768 93.921C42.5194 98.3889 45.7041 104.955 43.6986 109.646L42.0559 113.487M38.0464 129.949L48.2909 134.33M38.7706 121.171L54.1374 127.741M49.7393 116.773L58.5003 96.2836" stroke="#E9E9E9" stroke-opacity="0.3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M65.6781 96.3234C65.6781 96.3234 61.1398 97.4123 58.5003 96.2836C55.8607 95.155 53.5127 91.1216 53.5127 91.1216" stroke="#E9E9E9" stroke-opacity="0.3" stroke-width="4.9375" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_ec"><rect width="89.1341" height="89.1341" fill="white" transform="translate(35.0439 37.7836) rotate(23.1512)"/></clipPath></defs></svg>`;
	}

	_svgLeftArr()  { return `<svg width="9" height="20" viewBox="0 0 9 20" fill="none"><path d="M6.63073 5.48333L5.89392 4.59999L1.88073 9.41416C1.81604 9.4913 1.7647 9.58303 1.72966 9.68407C1.69463 9.78511 1.6766 9.89347 1.6766 10.0029C1.6766 10.1123 1.69463 10.2207 1.72966 10.3217C1.7647 10.4228 1.81604 10.5145 1.88073 10.5917L5.89392 15.4083L6.63003 14.525L2.86337 10.0042L6.63073 5.48333Z" fill="#FAFAFA"/></svg>`; }
	_svgRightArr() { return `<svg width="9" height="20" viewBox="0 0 9 20" fill="none"><path d="M1.70261 5.48333L2.43941 4.59999L6.45261 9.41416C6.5173 9.4913 6.56864 9.58303 6.60367 9.68407C6.6387 9.78511 6.65674 9.89347 6.65674 10.0029C6.65674 10.1123 6.6387 10.2207 6.60367 10.3217C6.56864 10.4228 6.5173 10.5145 6.45261 10.5917L2.43941 15.4083L1.7033 14.525L5.46997 10.0042L1.70261 5.48333Z" fill="#FAFAFA"/></svg>`; }

	// ---------- render ----------

	render() {
		this.$root.html(`
<div class="mc2-ec-wrapper">

  <!-- ===== LEFT CARD ===== -->
  <div class="mc2-ec-left">

    <div class="mc2-ec-header">
      <span class="mc2-ec-title">Empreinte Carbone</span>
      <div class="mc2-ec-filters">
        <span class="mc2-ec-filter-icon">${this._svgFilter()}</span>
        <select id="mc2-ec-period" class="mc2-ec-period-sel">
          <option value="semaine">Cette semaine</option>
          <option value="mois">Ce mois-ci</option>
          <option value="annee">Cette année</option>
        </select>
        <span class="mc2-ec-dl">Du</span>
        <div class="mc2-ec-date-box">
          <input id="mc2-ec-date-from" type="date" class="mc2-ec-date-inp">
          <span class="mc2-ec-cal-ico">${this._svgCal()}</span>
        </div>
        <span class="mc2-ec-dl">au</span>
        <div class="mc2-ec-date-box">
          <input id="mc2-ec-date-to" type="date" class="mc2-ec-date-inp">
          <span class="mc2-ec-cal-ico">${this._svgCal()}</span>
        </div>
      </div>
    </div>

    <div class="mc2-ec-body">

      <div class="mc2-ec-gauge-section">
        <div class="mc2-ec-gauge-wrap">
          <div id="mc2-ec-gauge">${this._buildGaugeSvg(0.34)}</div>
          <div class="mc2-ec-scale" style="left:128px;top:5px;">6</div>
          <div class="mc2-ec-scale" style="left:235px;top:116px;">12</div>
          <div class="mc2-ec-scale" style="left:4px;top:116px;">21</div>
          <div class="mc2-ec-scale" style="left:126px;top:237px;">25</div>
          <div class="mc2-ec-gval">
            <span class="mc2-ec-gv-num" id="mc2-ec-gv-num">—</span>
            <span class="mc2-ec-gv-unit">kg</span>
          </div>
          <div class="mc2-ec-gco2">co<sub>2</sub></div>
          <div class="mc2-ec-carb-icon">${this._svgCarbone()}</div>
        </div>
        <div class="mc2-ec-motivation" id="mc2-ec-motivation">Chargement…</div>
      </div>

      <div class="mc2-ec-vsep"></div>

      <div class="mc2-ec-stats-section">
        <div class="mc2-ec-stats-hdr">
          <span class="mc2-ec-stats-icon">${this._svgStats()}</span>
          <span class="mc2-ec-stats-title">Statistiques</span>
        </div>
        <div id="mc2-ec-chart" class="mc2-ec-chart-area"></div>
        <div class="mc2-ec-tend-hdr">Tendances</div>
        <div class="mc2-ec-tend-row">
          <div class="mc2-ec-tend-card">
            <div class="mc2-ec-tend-icon">${this._svgCarbonIcon(1)}</div>
            <div class="mc2-ec-tend-lbl">Creux de votre Empreinte</div>
            <div class="mc2-ec-tend-val mc2-ec-creux-val">
              <span class="mc2-ec-tv-num" id="mc2-ec-creux-num">—</span>
              <span class="mc2-ec-tv-co2">kg co<sup style="font-size:10px;">2</sup></span>
            </div>
          </div>
          <div class="mc2-ec-tend-card">
            <div class="mc2-ec-tend-icon">${this._svgCarbonIcon(2)}</div>
            <div class="mc2-ec-tend-lbl">Pic de votre Empreinte</div>
            <div class="mc2-ec-tend-val mc2-ec-pic-val">
              <span class="mc2-ec-tv-num" id="mc2-ec-pic-num">—</span>
              <span class="mc2-ec-tv-co2">kg co<sup style="font-size:10px;">2</sup></span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ===== RIGHT CARD ===== -->
  <div class="mc2-ec-right">

    <div class="mc2-ec-comment-section">
      <div class="mc2-ec-comment-title">Commentaires</div>
      <div class="mc2-ec-comment-text" id="mc2-ec-comments">
        <div style="color:#9CAAB9;">Chargement...</div>
      </div>
    </div>

    <div class="mc2-ec-astuces">
      <div class="mc2-ec-bg-notif">${this._svgBgNotif()}</div>
      <div class="mc2-ec-ast-hdr">
        <span>Astuces &amp; Conseils</span>
        <span class="mc2-ec-bulb">${this._svgBulb()}</span>
      </div>
      <div class="mc2-ec-ast-body">
        <span class="mc2-ec-ast-check">${this._svgCheck()}</span>
        <div class="mc2-ec-ast-text" id="mc2-ec-tip-text">Chargement...</div>
      </div>
      <div class="mc2-ec-ast-nav">
        <span class="mc2-ec-nav-arr" id="mc2-ec-tip-prev">${this._svgLeftArr()}</span>
        <div class="mc2-ec-nav-dots" id="mc2-ec-tip-dots"></div>
        <span class="mc2-ec-nav-arr" id="mc2-ec-tip-next">${this._svgRightArr()}</span>
      </div>
    </div>

  </div>

</div>`);
	}

	// ---------- events ----------

	_bindEvents() {
		this.$root.on('change', '#mc2-ec-period', () => this._loadData());
		this.$root.on('change', '#mc2-ec-date-from, #mc2-ec-date-to', () => {
			const from = this.$root.find('#mc2-ec-date-from').val();
			const to   = this.$root.find('#mc2-ec-date-to').val();
			if (from && to) this._loadData();
		});
		this.$root.on('click', '#mc2-ec-tip-prev', () => this._showTip(this._tipIdx - 1));
		this.$root.on('click', '#mc2-ec-tip-next', () => this._showTip(this._tipIdx + 1));
	}

	// ---------- data load ----------

	_loadData() {
		const args = {};
		const from = this.$root.find('#mc2-ec-date-from').val();
		const to   = this.$root.find('#mc2-ec-date-to').val();
		if (from && to) {
			args.date_from = from;
			args.date_to   = to;
		} else {
			args.period = this.$root.find('#mc2-ec-period').val() || 'semaine';
		}

		frappe.call({
			method: 'myconso2.myconso2.api.get_empreinte_carbone_data',
			args,
			callback: r => {
				if (!r.message) return;
				this._render_data(r.message);
			},
		});
	}

	_render_data(d) {
		const fmt = v => new Intl.NumberFormat('fr-FR').format(v);

		// --- Gauge ---
		this.$root.find('#mc2-ec-gauge').html(this._buildGaugeSvg(d.gauge_pct || 0));

		// Gauge value text + color
		const gColor = this._gaugeTextColor(d.gauge_pct || 0);
		this.$root.find('#mc2-ec-gv-num').text(d.gauge_value || '0').css({
			'background': gColor,
			'-webkit-background-clip': 'text',
			'-webkit-text-fill-color': 'transparent',
			'background-clip': 'text',
		});

		// Motivation
		const motiv = (d.motivation || '').replace(/\n/g, '<br>');
		this.$root.find('#mc2-ec-motivation').html(motiv);

		// --- Chart ---
		if (this._chart) { try { this._chart.destroy?.(); } catch(e) {} this._chart = null; }
		this.$root.find('#mc2-ec-chart').empty();
		if (d.labels && d.labels.length) {
			const chartData = {
				labels:   d.labels,
				datasets: [{ values: d.co2_values || [], name: 'kg CO₂' }],
			};
			const fmtY = v => `${fmt(v)} kg CO₂`;
			this._chart = new frappe.Chart('#mc2-ec-chart', {
				type: 'bar',
				data: chartData,
				colors: ['#4BA668'],
				height: 260,
				axisOptions: { xIsSeries: 1 },
				tooltipOptions: { formatTooltipY: fmtY },
			});
		} else {
			this.$root.find('#mc2-ec-chart').html(
				'<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#9CAAB9;font-size:13px;font-family:Inter,sans-serif;">Aucune donnée disponible</div>'
			);
		}

		// --- Tendances ---
		this.$root.find('#mc2-ec-creux-num').text(d.min_co2 || '—');
		this.$root.find('#mc2-ec-pic-num').text(d.max_co2 || '—');

		// --- Comments ---
		const $cmt = this.$root.find('#mc2-ec-comments').empty();
		(d.comments || []).forEach(c => $cmt.append(`<ul><li>${c}</li></ul>`));
		if (!d.comments || !d.comments.length)
			$cmt.html('<div style="color:#9CAAB9;">Aucune donnée disponible.</div>');

		// --- Tips carousel ---
		this._tips   = d.tips || [];
		this._tipIdx = 0;
		this._renderDots();
		this._showTip(0);
	}

	_renderDots() {
		const $dots = this.$root.find('#mc2-ec-tip-dots').empty();
		this._tips.forEach((_, i) => {
			$dots.append(`<span class="mc2-ec-dot ${i === this._tipIdx ? 'mc2-ec-dot--on' : 'mc2-ec-dot--off'}" data-i="${i}"></span>`);
		});
	}

	_showTip(idx) {
		if (!this._tips.length) return;
		this._tipIdx = ((idx % this._tips.length) + this._tips.length) % this._tips.length;
		const tip = this._tips[this._tipIdx];
		this.$root.find('#mc2-ec-tip-text').html(
			`<strong>${tip.title}</strong><br><br>${tip.text}`
		);
		this.$root.find('#mc2-ec-tip-dots .mc2-ec-dot').each((i, el) => {
			$(el).removeClass('mc2-ec-dot--on mc2-ec-dot--off')
			     .addClass(i === this._tipIdx ? 'mc2-ec-dot--on' : 'mc2-ec-dot--off');
		});
	}
}
