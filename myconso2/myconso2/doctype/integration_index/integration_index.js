frappe.ui.form.on('Integration Index', {
	refresh(frm) {
		if (frm.is_new()) return;
		frm.add_custom_button(__('Analyser le fichier'), () => {
			frm.call('analyser').then(() => frm.reload_doc());
		});
		if (['Analysé', 'Importé partiellement'].includes(frm.doc.statut) && frm.doc.nb_valides + frm.doc.nb_avertissements > 0) {
			frm.add_custom_button(__('Importer dans Index Conso'), () => {
				frappe.confirm(
					__('Importer {0} ligne(s) dans Index Conso ?', [frm.doc.nb_valides + frm.doc.nb_avertissements]),
					() => frm.call('importer').then(() => frm.reload_doc())
				);
			}).addClass('btn-primary');
		}
		if (frm.doc.statut === 'Brouillon') {
			frm.dashboard.set_headline(__("Enregistrez, puis cliquez sur « Analyser le fichier » pour un contrôle avant import."));
		}
	},
});
