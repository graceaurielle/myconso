frappe.pages['utilisateurs-myconso'].on_page_load = function(wrapper) {
	frappe.ui.make_app_page({ parent: wrapper, title: 'Utilisateurs', single_column: true });
	new UtilisateursPage(wrapper);
};

class UtilisateursPage {
	constructor(wrapper) {
		this.$root = $(wrapper).find('.page-content, .layout-main-section').first();
		this._render();
		this._bindEvents();
		this._setupRoles();
		this._loadUsers();
	}

	_render() {
		const PEOPLE = `<svg width="27" height="27" viewBox="0 0 27 27" fill="none"><path d="M21.1991 8.85938C21.0446 11.0041 19.4536 12.6562 17.7186 12.6562C15.9837 12.6562 14.39 11.0046 14.2382 8.85938C14.08 6.62818 15.6288 5.0625 17.7186 5.0625C19.8085 5.0625 21.3573 6.66879 21.1991 8.85938Z" stroke="#0E3151" stroke-width="1.6875" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.7185 16.0312C14.2818 16.0312 10.977 17.7383 10.149 21.0626C10.0394 21.5024 10.3152 21.9375 10.7671 21.9375H24.6705C25.1224 21.9375 25.3967 21.5024 25.2886 21.0626C24.4606 17.685 21.1558 16.0312 17.7185 16.0312Z" stroke="#0E3151" stroke-width="1.6875" stroke-miterlimit="10"/><path d="M10.5468 9.80543C10.4234 11.5182 9.13777 12.8672 7.75191 12.8672C6.36605 12.8672 5.07827 11.5188 4.95699 9.80543C4.83095 8.02354 6.08234 6.75 7.75191 6.75C9.42148 6.75 10.6729 8.05623 10.5468 9.80543Z" stroke="#0E3151" stroke-width="1.6875" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.8633 16.1367C9.91145 15.7006 8.86309 15.5329 7.75198 15.5329C5.00979 15.5329 2.3678 16.8961 1.70598 19.5513C1.61897 19.9025 1.8394 20.25 2.20011 20.25H8.12112" stroke="#0E3151" stroke-width="1.6875" stroke-miterlimit="10" stroke-linecap="round"/></svg>`;
		const USER_ADD = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5.31271 5.625C5.46584 7.69023 7.03146 9.375 8.75021 9.375C10.469 9.375 12.0373 7.69063 12.1877 5.625C12.344 3.47656 10.8205 1.875 8.75021 1.875C6.6799 1.875 5.15646 3.51562 5.31271 5.625Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.75006 11.875C12.1485 11.875 15.5977 13.75 16.236 17.2891C16.3141 17.7156 16.0715 18.125 15.6247 18.125H1.87506C1.42819 18.125 1.18678 17.7156 1.26373 17.2891C1.9024 13.75 5.35162 11.875 8.75006 11.875Z" stroke="white" stroke-width="1.5" stroke-miterlimit="10"/><path d="M16.5625 6.875V11.25M14.375 9.0625H18.75" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
		const EDIT = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3.6665 19.25H18.3332M5.19367 12.0881C4.80282 12.4798 4.58327 13.0106 4.58317 13.5639V16.5H7.53759C8.09125 16.5 8.622 16.28 9.01342 15.8877L17.7218 7.17475C18.1125 6.78297 18.3319 6.25223 18.3319 5.69892C18.3319 5.14561 18.1125 4.61487 17.7218 4.22309L16.8619 3.36142C16.668 3.16741 16.4378 3.01352 16.1843 2.90856C15.9309 2.80359 15.6593 2.74961 15.385 2.74969C15.1107 2.74978 14.8391 2.80393 14.5857 2.90905C14.3324 3.01417 14.1022 3.1682 13.9084 3.36234L5.19367 12.0881Z" stroke="#0E3151" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
		const DELETE = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M9.16683 4.58333H12.8335C12.8335 4.0971 12.6403 3.63079 12.2965 3.28697C11.9527 2.94315 11.4864 2.75 11.0002 2.75C10.5139 2.75 10.0476 2.94315 9.7038 3.28697C9.35998 3.63079 9.16683 4.0971 9.16683 4.58333ZM7.79183 4.58333C7.79183 4.16201 7.87482 3.74481 8.03605 3.35556C8.19728 2.9663 8.43361 2.61262 8.73153 2.3147C9.02945 2.01678 9.38313 1.78045 9.77239 1.61922C10.1616 1.45799 10.5788 1.375 11.0002 1.375C11.4215 1.375 11.8387 1.45799 12.2279 1.61922C12.6172 1.78045 12.9709 2.01678 13.2688 2.3147C13.5667 2.61262 13.803 2.9663 13.9643 3.35556C14.1255 3.74481 14.2085 4.16201 14.2085 4.58333H19.4793C19.6617 4.58333 19.8365 4.65577 19.9655 4.7847C20.0944 4.91363 20.1668 5.0885 20.1668 5.27083C20.1668 5.45317 20.0944 5.62804 19.9655 5.75697C19.8365 5.8859 19.6617 5.95833 19.4793 5.95833H18.2693L17.1968 17.0601C17.1146 17.9107 16.7184 18.7002 16.0855 19.2746C15.4527 19.849 14.6286 20.167 13.774 20.1667H8.22633C7.37187 20.1668 6.54801 19.8486 5.91537 19.2743C5.28273 18.6999 4.88667 17.9106 4.80441 17.0601L3.731 5.95833H2.521C2.33866 5.95833 2.16379 5.8859 2.03486 5.75697C1.90593 5.62804 1.8335 5.45317 1.8335 5.27083C1.8335 5.0885 1.90593 4.91363 2.03486 4.7847C2.16379 4.65577 2.33866 4.58333 2.521 4.58333H7.79183Z" fill="#0E3151"/></svg>`;

		this._EDIT = EDIT;
		this._DELETE = DELETE;

		this.$root.html(`
		<div class="mc2-ul-card">
		  <div class="mc2-ul-card-hdr">
		    <div class="mc2-ul-title-wrap">
		      <span class="mc2-ul-title">Liste des Utilisateurs</span>
		      <span class="mc2-ul-people">${PEOPLE}</span>
		    </div>
		    <button class="mc2-ul-add-btn" id="mc2-ul-add-btn">
		      <span class="mc2-ul-add-label">Ajouter un utilisateur</span>
		      <span class="mc2-ul-add-icon">${USER_ADD}</span>
		    </button>
		  </div>
		  <div class="mc2-ul-tbl-hdr">
		    <span></span>
		    <span class="mc2-ul-th">Username</span>
		    <span class="mc2-ul-th">E-mail</span>
		    <span class="mc2-ul-th">Rôle</span>
		    <span></span>
		    <span></span>
		  </div>
		  <div class="mc2-ul-rows" id="mc2-ul-rows">
		    <div style="padding:20px;text-align:center;color:#9CAAB9;">Chargement...</div>
		  </div>
		</div>`);
	}

	_bindEvents() {
		this.$root.on('click', '#mc2-ul-add-btn', () => this._openModal(null));
		this.$root.on('click', '.mc2-ul-edit-btn', e => {
			const $row = $(e.currentTarget).closest('.mc2-ul-row');
			this._openModal($row.data('user'), $row.data('roles').split(', '));
		});
		this.$root.on('click', '.mc2-ul-del-btn', e => {
			const $row = $(e.currentTarget).closest('.mc2-ul-row');
			this._removeUser($row.data('user'), $row.data('fullname'));
		});
	}

	_setupRoles() {
		frappe.call({ method: 'myconso2.myconso2.api.setup_roles' });
	}

	_loadUsers() {
		frappe.call({
			method: 'myconso2.myconso2.api.get_users',
			callback: r => {
				if (r.message !== undefined) this._renderUsers(r.message);
			},
		});
	}

	_renderUsers(users) {
		const $c = this.$root.find('#mc2-ul-rows').empty();
		if (!users.length) {
			$c.html('<div style="padding:20px;text-align:center;color:#9CAAB9;">Aucun utilisateur avec un rôle Myconso</div>');
			return;
		}
		users.forEach((u, i) => {
			$c.append(`
			<div class="mc2-ul-row"
			  data-user="${u.user}"
			  data-fullname="${u.full_name || u.user}"
			  data-roles="${u.roles || ''}">
			  <span class="mc2-ul-num">${i + 1}.</span>
			  <span class="mc2-ul-username">${u.full_name || u.user}</span>
			  <span class="mc2-ul-email">${u.email || u.user}</span>
			  <span class="mc2-ul-role">${u.roles || '-'}</span>
			  <span class="mc2-ul-edit-btn" title="Modifier">${this._EDIT}</span>
			  <span class="mc2-ul-del-btn" title="Retirer">${this._DELETE}</span>
			</div>`);
		});
	}

	_openModal(user, currentRoles) {
		const isEdit = !!user;
		const cr = new Set(currentRoles || []);

		const dialog = new frappe.ui.Dialog({
			title: isEdit ? 'Modifier les rôles' : 'Ajouter un utilisateur',
			fields: [
				{
					fieldname: 'user',
					fieldtype: 'Link',
					options: 'User',
					label: 'Utilisateur',
					reqd: 1,
					default: user || '',
					read_only: isEdit ? 1 : 0,
				},
				{ fieldname: 'sb', fieldtype: 'Section Break', label: 'Rôles' },
				{ fieldname: 'role_collecteur', fieldtype: 'Check', label: 'Collecteur', default: cr.has('Collecteur') ? 1 : 0 },
				{ fieldname: 'role_chef', fieldtype: 'Check', label: 'Chef', default: cr.has('Chef') ? 1 : 0 },
				{ fieldname: 'role_staticien', fieldtype: 'Check', label: 'Staticien', default: cr.has('Staticien') ? 1 : 0 },
			],
			primary_action_label: 'Enregistrer',
			primary_action: values => {
				const roles = [];
				if (values.role_collecteur) roles.push('Collecteur');
				if (values.role_chef) roles.push('Chef');
				if (values.role_staticien) roles.push('Staticien');
				if (!roles.length) { frappe.msgprint('Veuillez sélectionner au moins un rôle'); return; }

				frappe.call({
					method: 'myconso2.myconso2.api.add_user_roles',
					args: { user: values.user, roles: JSON.stringify(roles) },
					callback: r => {
						if (!r.exc) {
							dialog.hide();
							this._loadUsers();
							frappe.show_alert({ message: 'Utilisateur mis à jour', indicator: 'green' });
						}
					},
				});
			},
		});
		dialog.show();
	}

	_removeUser(user, fullname) {
		frappe.confirm(`Retirer tous les rôles Myconso de <b>${fullname}</b> ?`, () => {
			frappe.call({
				method: 'myconso2.myconso2.api.remove_user',
				args: { user },
				callback: r => {
					if (!r.exc) {
						this._loadUsers();
						frappe.show_alert({ message: 'Rôles retirés', indicator: 'orange' });
					}
				},
			});
		});
	}
}
