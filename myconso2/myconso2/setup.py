import frappe


def after_install():
	_create_roles()


def _create_roles():
	for role_name in ['Collecteur', 'Chef', 'Staticien']:
		if not frappe.db.exists('Role', role_name):
			frappe.get_doc({
				'doctype': 'Role',
				'role_name': role_name,
				'desk_access': 1,
			}).insert(ignore_permissions=True)
	frappe.db.commit()
